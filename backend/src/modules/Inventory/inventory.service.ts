// inventory.service.ts
import { prisma } from '../../lib/prisma';
import { InventoryTransaction, Prisma } from '@prisma/client';
import crypto from 'crypto';

// Configurable behaviour
const LOW_STOCK_ALERT_DEBOUNCE_SECONDS = 60 * 60 * 24; // 24 hours debounce for low-stock alerts

type TxType = 'CHECKOUT' | 'RETURN' | 'ADJUST';

export interface UpdateInventoryPayload {
    productId: string | number | bigint;
    barcodeId?: string | number | bigint;
    employeeId: string;
    transactionType: TxType;
    checkoutQty?: number;
    returnedQty?: number;
    usedQty?: number;
    remarks?: string | null;
}

/**
 * Calculates available units for a product:
 * available = product.currentUnits (live physical stock)
 * currentUnits is decremented on RETURN/USED transactions
 */
export async function calculateAvailableUnits(
    productId: string | number | bigint
): Promise<number> {
    const pid = BigInt(productId as any);

    const product = await prisma.product.findUnique({
        where: { id: pid },
        select: { currentUnits: true }
    });

    if (!product) {
        throw new Error(`Product ${productId} not found`);
    }

    return Math.max(0, product.currentUnits);
}


/**
 * Checks if available units is <= reorderThreshold and creates a LowStockAlert if needed.
 * Debounces alerts so we don't repeatedly spam alerts for the same product within 24h (configurable).
 */
export async function checkLowStockThreshold(productId: string | number | bigint) {
    const pid = BigInt(productId as any);

    const product = await prisma.product.findUnique({
        where: { id: pid },
        select: { currentUnits: true, reorderThreshold: true }
    });

    if (!product) {
        throw new Error(`Product ${productId} not found`);
    }

    const available = await calculateAvailableUnits(pid);

    // Only trigger if available <= reorderThreshold
    if (available <= (product.reorderThreshold ?? 0)) {
        // see last alert time
        const lastAlert = await prisma.lowStockAlert.findFirst({
            where: { productId: pid },
            orderBy: { triggeredAt: 'desc' },
            take: 1
        });

        const now = new Date();
        if (lastAlert) {
            const ageSeconds = Math.floor((now.getTime() - lastAlert.triggeredAt.getTime()) / 1000);
            if (ageSeconds < LOW_STOCK_ALERT_DEBOUNCE_SECONDS) {
                // Debounce: skip creating repeated alerts within the debounce window
                return { triggered: false, reason: 'debounced', available, reorderThreshold: product.reorderThreshold };
            }
        }

        // Create low stock alert
        const alert = await prisma.lowStockAlert.create({
            data: {
                stockAtTrigger: available,
                productId: pid
            }
        });

        // Optionally: notify admins here (email/notification queue) — left as integration point
        console.info(`LowStockAlert created for product ${pid} at ${available} units`);

        return { triggered: true, alert, available, reorderThreshold: product.reorderThreshold };
    }

    return { triggered: false, available, reorderThreshold: product.reorderThreshold };
}


export async function auditInventoryChange(
    tx: InventoryTransaction | { id?: any; transactionType?: string; checkoutQty?: number; returnedQty?: number; usedQty?: number },
    productId: string | number | bigint,
    prevAvailable: number,
    newAvailable: number,
    opts?: { performedBy?: string; notes?: string }
) {
    try {
        const audit = {
            id: tx.id ?? crypto.randomUUID(),
            transactionType: tx.transactionType ?? 'UNKNOWN',
            checkoutQty: tx.checkoutQty ?? 0,
            returnedQty: tx.returnedQty ?? 0,
            usedQty: tx.usedQty ?? 0,
            productId: String(productId),
            performedBy: opts?.performedBy ?? 'system',
            notes: opts?.notes ?? undefined,
            prevAvailable,
            newAvailable,
            timestamp: new Date().toISOString()
        };

        // Store as a keyed system config entry (simple, searchable via DB)
        const key = `inventory_audit:${Date.now()}:${crypto.randomUUID().slice(0, 6)}`;
        await prisma.systemConfiguration.create({
            data: {
                key,
                value: JSON.stringify(audit)
            }
        });

        console.info('Inventory audit stored:', key, audit);
        return { success: true, key, audit };
    } catch (err) {
        console.warn('Failed to persist inventory audit (fallback to console):', err);
        console.info('AUDIT', { tx, productId, prevAvailable, newAvailable, opts });
        return { success: false, error: (err as Error).message };
    }
}

export async function updateProductInventory(payload: UpdateInventoryPayload) {
    const {
        productId: rawProductId,
        barcodeId: rawBarcodeId,
        employeeId,
        transactionType,
        checkoutQty = 0,
        returnedQty = 0,
        usedQty = 0,
        remarks = null
    } = payload;

    const productId = BigInt(rawProductId as any);
    const barcodeId = rawBarcodeId ? BigInt(rawBarcodeId as any) : undefined;

    // capture available before change for audit
    const prevAvailable = await calculateAvailableUnits(productId);

    // Use a transaction to keep DB writes consistent
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // create inventory transaction
        const transactionData: any = {
            transactionType,
            checkoutQty,
            returnedQty,
            usedQty,
            remarks,
            productId,
            employeeId
        };

        // Only add barcodeId if it exists
        if (barcodeId) {
            transactionData.barcodeId = barcodeId;
        }

        const transaction = await tx.inventoryTransaction.create({
            data: transactionData,
            include: {
                barcode: true,
                product: true,
                employee: {
                    select: { id: true, name: true, employeeId: true }
                }
            }
        });


        // If barcodeId provided and this is a CHECKOUT
        if (transactionType === 'CHECKOUT' && barcodeId) {
            // Get the barcode to access its boxQty
            const barcode = await tx.barcode.findUnique({
                where: { id: barcodeId },
                select: { boxQty: true }
            });

            // update barcode status
            await tx.barcode.update({
                where: { id: barcodeId },
                data: { status: 'CHECKED_OUT' }
            });

            // create barcodeCheckout
            await tx.barcodeCheckout.create({
                data: {
                    barcodeId,
                    employeeId,
                    isReturned: false,
                    checkoutTime: new Date()
                }
            });


            // DON'T update allocation or inventory on CHECKOUT
            // Inventory will be updated only on RETURN based on actual usage
        }

        // RETURN flow
        if (transactionType === 'RETURN' && barcodeId) {
            // Get the barcode to access its boxQty
            const barcode = await tx.barcode.findUnique({
                where: { id: barcodeId },
                select: { boxQty: true, productId: true }
            });

            if (!barcode) {
                throw new Error('Barcode not found');
            }

            // Calculate units to decrement from inventory
            // usedQty = what employee actually used
            // We decrement currentUnits by the actual used quantity
            const actualUsedQty = Math.min(usedQty, barcode.boxQty);

            // mark barcode AVAILABLE
            await tx.barcode.update({
                where: { id: barcodeId },
                data: { status: 'AVAILABLE' }
            });

            // update checkout record(s)
            await tx.barcodeCheckout.updateMany({
                where: {
                    barcodeId,
                    isReturned: false
                },
                data: {
                    isReturned: true,
                    returnTime: new Date()
                }
            });

            // Decrement currentUnits (live physical stock) based on actual usage
            // This reflects what was actually consumed/used
            if (actualUsedQty > 0) {
                await tx.product.update({
                    where: { id: barcode.productId },
                    data: {
                        currentUnits: { decrement: actualUsedQty }
                    }
                });
            }
            // If actualUsedQty is 0, it means employee didn't use any items, so no inventory decrement needed
        }

        // ADJUST handling (optional): you can add additional logic here if needed

        return transaction;
    });

    // recalc available after transaction
    const newAvailable = await calculateAvailableUnits(productId);

    // check low stock threshold (attempt best-effort)
    try {
        await checkLowStockThreshold(productId);
    } catch (err) {
        console.warn('Low stock check failed:', (err as Error).message);
    }

    // audit
    try {
        await auditInventoryChange(result, productId, prevAvailable, newAvailable, {
            performedBy: employeeId,
            notes: payload.remarks ?? undefined
        });
    } catch (err) {
        console.warn('Audit failed:', (err as Error).message);
    }

    // serialize and return
    const serialized = {
        id: result.id.toString(),
        transactionType: result.transactionType,
        checkoutQty: result.checkoutQty,
        returnedQty: result.returnedQty,
        usedQty: result.usedQty,
        remarks: result.remarks,
        createdAt: result.createdAt,
        barcode: result.barcode ? {
            id: result.barcode.id.toString(),
            barcodeValue: result.barcode.barcodeValue,
            serialNumber: result.barcode.serialNumber,
            status: result.barcode.status
        } : null,
        product: result.product ? {
            id: result.product.id.toString(),
            sku: result.product.sku,
            productName: result.product.productName,
            boxQty: result.product.boxQty
        } : null,
        employee: result.employee
    };

    return serialized;
}
