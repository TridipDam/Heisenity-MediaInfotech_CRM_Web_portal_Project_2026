import { Request, Response } from 'express';
import { generateLabelsForProduct } from '../../barcode/labelgenerator';
import { prisma } from '../../lib/prisma';
import * as path from 'path';
import * as fs from 'fs-extra';
import { updateProductInventory } from '../Inventory/inventory.service';

// New imports for duplicate-scan detection
import Redis from 'ioredis';
import crypto from 'crypto';

// Redis client (reuse across file)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Duplicate window seconds configurable via env (default 300 seconds = 5 minutes)
const DUPLICATE_WINDOW_SECONDS = parseInt(process.env.DUPLICATE_WINDOW_SECONDS || '300', 10);

// Minimum seconds required to elapse after checkout before a RETURN is allowed (default 60s)
const MIN_RETURN_WAIT_SECONDS = parseInt(process.env.MIN_RETURN_WAIT_SECONDS || '60', 10);

// After a RETURN, block further actions for this many seconds (defaults to duplicate window)
const POST_RETURN_BLOCK_SECONDS = parseInt(process.env.POST_RETURN_BLOCK_SECONDS || String(DUPLICATE_WINDOW_SECONDS), 10);

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, productName, description, boxQty, totalUnits, reorderThreshold, unitPrice, supplier, status } = req.body;

    // Validate required fields
    if (!productName || boxQty === undefined || totalUnits === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: productName, boxQty, totalUnits'
      });
    }

    let finalSku = sku;

    // Generate unique SKU if not provided
    if (!finalSku) {
      let attempts = 0;
      const maxAttempts = 10;

      do {
        // Use a more unique timestamp-based approach
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 8).toUpperCase();
        finalSku = `PRD-${timestamp}-${randomSuffix}`;

        // Check if this SKU already exists
        const existingProduct = await prisma.product.findUnique({
          where: { sku: finalSku }
        });

        if (!existingProduct) {
          break; // SKU is unique, we can use it
        }

        attempts++;
        // Add a small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));

      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(500).json({
          error: 'Failed to generate unique SKU after multiple attempts'
        });
      }
    } else {
      // Check if provided SKU already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: finalSku }
      });

      if (existingProduct) {
        return res.status(409).json({
          error: 'Product with this SKU already exists',
          message: `SKU "${finalSku}" is already in use`
        });
      }
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        sku: finalSku,
        productName,
        description: description || null,
        boxQty: parseInt(boxQty),
        totalUnits: parseInt(totalUnits),
        reorderThreshold: reorderThreshold ? parseInt(reorderThreshold) : 0,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        supplier: supplier || null,
        status: status || 'ACTIVE',
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedProduct = {
      id: product.id.toString(),
      sku: product.sku,
      productName: product.productName,
      description: product.description,
      boxQty: product.boxQty,
      totalUnits: product.totalUnits,
      reorderThreshold: product.reorderThreshold,
      unitPrice: product.unitPrice ? parseFloat(product.unitPrice.toString()) : null,
      supplier: product.supplier,
      status: product.status,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return res.status(201).json({
      success: true,
      data: serializedProduct,
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('Error creating product:', error);

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Product with this SKU already exists',
        message: 'Please try again or provide a different SKU'
      });
    }

    return res.status(500).json({
      error: 'Failed to create product',
      message: error.message
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedProducts = products.map(product => ({
      id: product.id.toString(),
      sku: product.sku,
      productName: product.productName,
      description: product.description,
      boxQty: product.boxQty,
      totalUnits: product.totalUnits,
      reorderThreshold: product.reorderThreshold,
      unitPrice: product.unitPrice ? parseFloat(product.unitPrice.toString()) : null,
      supplier: product.supplier,
      status: product.status,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    return res.json({
      success: true,
      data: serializedProducts
    });

  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: {
        id: BigInt(id)
      },
      include: {
        barcodes: true,
        transactions: {
          orderBy: {
            id: 'desc'
          },
          take: 10
        },
        allocations: {
          orderBy: {
            id: 'desc'
          },
          take: 10
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Convert BigInt to string for JSON serialization
    const serializedProduct = {
      id: product.id.toString(),
      sku: product.sku,
      productName: product.productName,
      description: product.description,
      boxQty: product.boxQty,
      totalUnits: product.totalUnits,
      reorderThreshold: product.reorderThreshold,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      barcodes: product.barcodes.map((barcode: any) => ({
        id: barcode.id.toString(),
        barcodeValue: barcode.barcodeValue,
        serialNumber: barcode.serialNumber,
        productId: barcode.productId.toString(),
        createdAt: barcode.createdAt,
        updatedAt: barcode.updatedAt
      })),
      transactions: product.transactions.map((transaction: any) => ({
        id: transaction.id.toString(),
        productId: transaction.productId.toString(),
        type: transaction.type,
        quantity: transaction.quantity,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      })),
      allocations: product.allocations.map((allocation: any) => ({
        id: allocation.id.toString(),
        productId: allocation.productId.toString(),
        employeeId: allocation.employeeId,
        quantity: allocation.quantity,
        createdAt: allocation.createdAt,
        updatedAt: allocation.updatedAt
      }))
    };

    return res.json({
      success: true,
      data: serializedProduct
    });

  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      error: 'Failed to fetch product',
      message: error.message
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sku, productName, description, boxQty, totalUnits, reorderThreshold, unitPrice, supplier, status } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: BigInt(id)
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Update the product
    const product = await prisma.product.update({
      where: {
        id: BigInt(id)
      },
      data: {
        ...(sku && { sku }),
        ...(productName && { productName }),
        ...(description !== undefined && { description }),
        ...(boxQty !== undefined && { boxQty: parseInt(boxQty) }),
        ...(totalUnits !== undefined && { totalUnits: parseInt(totalUnits) }),
        ...(reorderThreshold !== undefined && { reorderThreshold: parseInt(reorderThreshold) }),
        ...(unitPrice !== undefined && { unitPrice: unitPrice ? parseFloat(unitPrice) : null }),
        ...(supplier !== undefined && { supplier }),
        ...(status && { status })
      }
    });

    // Convert BigInt to string for JSON serialization
    const serializedProduct = {
      id: product.id.toString(),
      sku: product.sku,
      productName: product.productName,
      description: product.description,
      boxQty: product.boxQty,
      totalUnits: product.totalUnits,
      reorderThreshold: product.reorderThreshold,
      unitPrice: product.unitPrice ? parseFloat(product.unitPrice.toString()) : null,
      supplier: product.supplier,
      status: product.status,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return res.json({
      success: true,
      data: serializedProduct,
      message: 'Product updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating product:', error);

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Product with this SKU already exists',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to update product',
      message: error.message
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: {
        id: BigInt(id)
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Soft delete by setting isActive to false
    const product = await prisma.product.update({
      where: {
        id: BigInt(id)
      },
      data: {
        isActive: false
      }
    });

    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      error: 'Failed to delete product',
      message: error.message
    });
  }
};

export const getBarcodeHistory = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Get barcode generation history for the product
    const [barcodes, total] = await Promise.all([
      prisma.barcode.findMany({
        where: {
          productId: BigInt(productId)
        },
        include: {
          product: {
            select: {
              productName: true,
              sku: true
            }
          },
          transactions: {
            include: {
              employee: {
                select: {
                  name: true,
                  employeeId: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.barcode.count({
        where: {
          productId: BigInt(productId)
        }
      })
    ]);

    // Convert BigInt to string for JSON serialization
    const serializedBarcodes = barcodes.map(barcode => ({
      id: barcode.id.toString(),
      barcodeValue: barcode.barcodeValue,
      serialNumber: barcode.serialNumber,
      boxQty: barcode.boxQty,
      status: barcode.status,
      createdAt: barcode.createdAt,
      product: barcode.product,
      lastTransaction: barcode.transactions.length > 0 ? {
        type: barcode.transactions[0].transactionType,
        createdAt: barcode.transactions[0].createdAt,
        employee: barcode.transactions[0].employee
      } : null
    }));

    return res.json({
      success: true,
      data: {
        barcodes: serializedBarcodes,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching barcode history:', error);
    return res.status(500).json({
      error: 'Failed to fetch barcode history',
      message: error.message
    });
  }
};

export const getBarcodePrefixes = async (req: Request, res: Response) => {
  try {
    // Get saved barcode prefixes from system configuration
    const config = await prisma.systemConfiguration.findUnique({
      where: { key: 'barcode_prefixes' }
    });

    const defaultPrefixes = ['BX', 'PKG', 'ITM', 'PRD', 'BOX'];
    let customPrefixes: string[] = [];

    if (config && config.value) {
      try {
        customPrefixes = JSON.parse(config.value);
      } catch (error) {
        console.error('Error parsing barcode prefixes:', error);
      }
    }

    return res.json({
      success: true,
      data: {
        defaultPrefixes,
        customPrefixes,
        allPrefixes: [...defaultPrefixes, ...customPrefixes]
      }
    });

  } catch (error: any) {
    console.error('Error fetching barcode prefixes:', error);
    return res.status(500).json({
      error: 'Failed to fetch barcode prefixes',
      message: error.message
    });
  }
};

export const addBarcodePrefix = async (req: Request, res: Response) => {
  try {
    const { prefix } = req.body;

    if (!prefix || typeof prefix !== 'string') {
      return res.status(400).json({
        error: 'Prefix is required and must be a string'
      });
    }

    const normalizedPrefix = prefix.trim().toUpperCase();

    // Validate prefix format
    if (!/^[A-Z]{2,4}$/.test(normalizedPrefix)) {
      return res.status(400).json({
        error: 'Prefix must be 2-4 uppercase letters only'
      });
    }

    // Check if prefix already exists in defaults
    const defaultPrefixes = ['BX', 'PKG', 'ITM', 'PRD', 'BOX'];
    if (defaultPrefixes.includes(normalizedPrefix)) {
      return res.status(400).json({
        error: 'This prefix already exists as a default prefix'
      });
    }

    // Get existing custom prefixes
    const config = await prisma.systemConfiguration.findUnique({
      where: { key: 'barcode_prefixes' }
    });

    let customPrefixes: string[] = [];
    if (config && config.value) {
      try {
        customPrefixes = JSON.parse(config.value);
      } catch (error) {
        console.error('Error parsing existing prefixes:', error);
      }
    }

    // Check if prefix already exists in custom prefixes
    if (customPrefixes.includes(normalizedPrefix)) {
      return res.status(400).json({
        error: 'This prefix already exists'
      });
    }

    // Add new prefix
    customPrefixes.push(normalizedPrefix);

    // Save to database
    await prisma.systemConfiguration.upsert({
      where: { key: 'barcode_prefixes' },
      update: { value: JSON.stringify(customPrefixes) },
      create: {
        key: 'barcode_prefixes',
        value: JSON.stringify(customPrefixes)
      }
    });

    return res.json({
      success: true,
      message: `Barcode prefix "${normalizedPrefix}" added successfully`,
      data: {
        prefix: normalizedPrefix,
        customPrefixes
      }
    });

  } catch (error: any) {
    console.error('Error adding barcode prefix:', error);
    return res.status(500).json({
      error: 'Failed to add barcode prefix',
      message: error.message
    });
  }
};

export const generateLabels = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { count, prefix } = req.body;

    if (!productId || !count) {
      return res.status(400).json({
        error: 'Missing required fields: productId and count'
      });
    }

    // Validate count
    const labelCount = parseInt(count);
    if (isNaN(labelCount) || labelCount < 1 || labelCount > 100) {
      return res.status(400).json({
        error: 'Count must be a number between 1 and 100'
      });
    }

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) }
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    const result = await generateLabelsForProduct({
      productId,
      count: labelCount,
      prefix: prefix || 'BX'
    });

    // Return the PDF file
    const pdfPath = result.pdfPath;
    const fileName = path.basename(pdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      // Clean up the file after sending (optional)
      setTimeout(() => {
        fs.unlink(pdfPath).catch(console.error);
      }, 5000); // Delete after 5 seconds
    });

    fileStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to stream PDF file',
          message: error.message
        });
      }
    });

  } catch (error: any) {
    console.error('Error generating labels:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate labels',
        message: error.message
      });
    }
  }
};

export const createInventoryTransaction = async (req: Request, res: Response) => {
  // Track whether we set the duplicate key and the token used (for safe cleanup)
  let duplicateKeySet = false;
  let duplicateKey = '';
  let duplicateToken = '';

  try {
    const { barcodeValue, transactionType, checkoutQty, returnedQty, usedQty, remarks, employeeId } = req.body;

    console.log('📦 Creating inventory transaction:', {
      barcodeValue,
      transactionType,
      checkoutQty,
      returnedQty,
      usedQty,
      employeeId
    });

    // Validate required fields
    if (!barcodeValue || !transactionType || !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: barcodeValue, transactionType, employeeId'
      });
    }

    // Find barcode and product early (we need these to decide action and keys)
    const barcode = await prisma.barcode.findFirst({
      where: {
        OR: [
          { barcodeValue: barcodeValue },
          { serialNumber: barcodeValue }
        ]
      },
      include: { product: true }
    });

    if (!barcode) {
      return res.status(404).json({
        success: false,
        error: 'Barcode not found in inventory'
      });
    }

    // Validate employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Post-return lock check (blocks immediate re-scans after a RETURN)
    const postReturnKey = `recent_return:${employeeId}:${barcodeValue}`;
    const postReturnTtl = await redis.ttl(postReturnKey);
    if (postReturnTtl > 0) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        reason: 'recent_return',
        message: `This item was just returned. Please wait ${postReturnTtl} seconds before scanning again.`,
        remainingSeconds: postReturnTtl
      });
    }

    // Helper: get active checkout (most recent, not returned)
    const activeCheckout = await prisma.barcodeCheckout.findFirst({
      where: { barcodeId: barcode.id, isReturned: false },
      orderBy: { id: 'desc' }
    });

    // Decide the desired action before setting any duplicate key
    // If item is checked out and enough time elapsed, auto-return
    let desiredAction = transactionType; // either 'CHECKOUT' or 'RETURN' expected
    if (barcode.status === 'CHECKED_OUT' && activeCheckout) {
      const checkoutTime = new Date(activeCheckout.checkoutTime).getTime();
      const elapsedSeconds = Math.floor((Date.now() - checkoutTime) / 1000);

      if (elapsedSeconds >= MIN_RETURN_WAIT_SECONDS) {
        desiredAction = 'RETURN';
      } else {
        // If client intended RETURN but MIN_RETURN_WAIT not reached, inform client
        if (transactionType === 'RETURN') {
          const remaining = MIN_RETURN_WAIT_SECONDS - elapsedSeconds;
          return res.status(400).json({
            success: false,
            error: 'Return not allowed yet',
            message: `This item was just checked out. Please wait ${remaining} more seconds before returning.`,
            remainingSeconds: remaining
          });
        }
        // Otherwise keep desiredAction as checkout (or as provided)
      }
    }

    // --- Duplicate detection (action-specific) ---
    // Key pattern: recent_scan:{action}:{employeeId}:{barcodeValue}
    duplicateKey = `recent_scan:${desiredAction.toLowerCase()}:${employeeId}:${barcodeValue}`;
    duplicateToken = crypto.randomUUID();

    const setResult = await redis.call(
      'SET',
      duplicateKey,
      duplicateToken,
      'NX',
      'EX',
      DUPLICATE_WINDOW_SECONDS
    ) as 'OK' | null;

    if (setResult === null) {
      const ttl = await redis.ttl(duplicateKey);
      return res.status(409).json({
        success: false,
        duplicate: true,
        error: 'Duplicate scan detected',
        message: `This action was performed recently by employee ${employeeId}. Please wait ${ttl} seconds before trying again.`,
        remainingSeconds: ttl > 0 ? ttl : 0
      });
    }

    // Mark that we successfully set the duplicate key for this request
    duplicateKeySet = true;

    if (desiredAction === 'RETURN') {
      // parse/validate usedQty from request body (may be undefined)
      const requestedUsedQty = Number(usedQty ?? 0);
      // ensure non-negative integer
      const usedQtyClamped = Math.max(0, Math.floor(requestedUsedQty));

      // Do everything in a DB transaction for atomicity
      const returnTx = await prisma.$transaction(async (tx) => {
        // Re-fetch barcode inside transaction (fresh)
        const barcodeRec = await tx.barcode.findUnique({
          where: { id: barcode.id },
          select: { boxQty: true, productId: true, barcodeValue: true, serialNumber: true }
        });

        if (!barcodeRec) {
          throw new Error('Barcode not found during return transaction');
        }

        const boxQtyValue = barcodeRec.boxQty ?? 0;

        // Clamp usedQty to [0, boxQty]
        const actualUsedQty = Math.min(usedQtyClamped, boxQtyValue);
        const returnToInventory = Math.max(0, boxQtyValue - actualUsedQty);

        // Create inventory transaction record (RETURN)
        const returnTransaction = await tx.inventoryTransaction.create({
          data: {
            transactionType: 'RETURN',
            checkoutQty: 0,
            returnedQty: returnToInventory,
            usedQty: actualUsedQty,
            remarks: remarks || 'Return via scanner (auto-return)',
            barcodeId: barcode.id,
            productId: barcode.productId,
            employeeId: employeeId
          },
          include: {
            barcode: true,
            product: true,
            employee: {
              select: { id: true, name: true, employeeId: true }
            }
          }
        });

        // Update barcode status to AVAILABLE
        await tx.barcode.update({
          where: { id: barcode.id },
          data: { status: 'AVAILABLE' }
        });

        // Mark checkout record(s) as returned
        await tx.barcodeCheckout.updateMany({
          where: { barcodeId: barcode.id, isReturned: false },
          data: { isReturned: true, returnTime: new Date() }
        });

        // Update product.totalUnits by returnToInventory (only if > 0)
        if (returnToInventory > 0) {
          await tx.product.update({
            where: { id: barcode.productId },
            data: { totalUnits: { increment: returnToInventory } }
          });
        }

        // Update allocation: reduce allocatedUnits by returnToInventory (if an allocation exists)
        const existingAllocation = await tx.allocation.findUnique({
          where: {
            employeeId_productId: {
              employeeId: employeeId,
              productId: barcode.productId
            }
          }
        });

        if (existingAllocation) {
          const newAllocated = Math.max(0, existingAllocation.allocatedUnits - returnToInventory);
          if (newAllocated === 0) {
            await tx.allocation.delete({ where: { id: existingAllocation.id } });
          } else {
            await tx.allocation.update({ where: { id: existingAllocation.id }, data: { allocatedUnits: newAllocated } });
          }
        }

        return returnTransaction;
      });

      // Set post-return block in Redis (best effort)
      try {
        await redis.call('SET', postReturnKey, '1', 'NX', 'EX', POST_RETURN_BLOCK_SECONDS);
      } catch (err) {
        console.warn('⚠️ Failed to set post-return block in Redis:', err);
      }

      const serializedReturn = {
        id: returnTx.id.toString(),
        transactionType: returnTx.transactionType,
        checkoutQty: returnTx.checkoutQty,
        returnedQty: returnTx.returnedQty,
        usedQty: returnTx.usedQty,
        remarks: returnTx.remarks,
        createdAt: returnTx.createdAt,
        barcode: {
          id: returnTx.barcode.id.toString(),
          barcodeValue: returnTx.barcode.barcodeValue,
          serialNumber: returnTx.barcode.serialNumber,
          status: 'AVAILABLE'
        },
        product: {
          id: returnTx.product.id.toString(),
          sku: returnTx.product.sku,
          productName: returnTx.product.productName,
          boxQty: returnTx.barcode.boxQty
        },
        employee: returnTx.employee
      };

      return res.status(201).json({
        success: true,
        data: serializedReturn,
        message: 'Return processed successfully'
      });
    }

    // Use inventory service to handle the transaction
    const inventoryResult = await updateProductInventory({
      productId: barcode.productId,
      barcodeId: barcode.id,
      employeeId: employeeId,
      transactionType,
      checkoutQty: checkoutQty || (transactionType === 'CHECKOUT' ? 1 : 0),
      returnedQty: returnedQty || (transactionType === 'RETURN' ? 1 : 0),
      usedQty: usedQty || 0,
      remarks: remarks || null
    });

    // Return the result from inventory service
    return res.status(201).json({
      success: true,
      data: inventoryResult,
      message: `${transactionType} processed successfully`
    });

  } catch (error: any) {
    console.error('❌ Error creating inventory transaction:', error);

    // If we set the duplicate key earlier, try to clean it up (only if it still matches our token)
    if (duplicateKeySet) {
      try {
        await redis.eval(
          `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
          1,
          duplicateKey,
          duplicateToken
        );
      } catch (redisCleanupError) {
        console.error('⚠️ Failed to clean up duplicate key:', redisCleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create inventory transaction',
      message: error.message
    });
  }
};


// Get all inventory transactions
export const getInventoryTransactions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, employeeId, productId, transactionType } = req.query;

    console.log('📦 Fetching inventory transactions with params:', {
      page,
      limit,
      employeeId,
      productId,
      transactionType
    });

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (productId) {
      try {
        where.productId = BigInt(productId as string);
      } catch (error) {
        console.error('Invalid productId format:', productId);
        return res.status(400).json({
          success: false,
          error: 'Invalid productId format'
        });
      }
    }
    if (transactionType) where.transactionType = transactionType;

    console.log('📦 Query where clause:', where);

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: {
          barcode: {
            select: {
              id: true,
              barcodeValue: true,
              serialNumber: true,
              status: true,
              boxQty: true
            }
          },
          product: {
            select: {
              id: true,
              sku: true,
              productName: true,
              description: true
            }
          },
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.inventoryTransaction.count({ where })
    ]);

    console.log('📦 Found transactions:', transactions.length);

    // Convert BigInt to string for JSON serialization
    const serializedTransactions = transactions.map(transaction => ({
      id: transaction.id.toString(),
      transactionType: transaction.transactionType,
      checkoutQty: transaction.checkoutQty,
      returnedQty: transaction.returnedQty,
      usedQty: transaction.usedQty,
      remarks: transaction.remarks,
      createdAt: transaction.createdAt,
      barcode: {
        id: transaction.barcode.id.toString(),
        barcodeValue: transaction.barcode.barcodeValue,
        serialNumber: transaction.barcode.serialNumber,
        status: transaction.barcode.status,
        boxQty: transaction.barcode.boxQty
      },
      product: {
        id: transaction.product.id.toString(),
        sku: transaction.product.sku,
        productName: transaction.product.productName,
        description: transaction.product.description
      },
      employee: transaction.employee
    }));

    return res.json({
      success: true,
      data: {
        transactions: serializedTransactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching inventory transactions:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory transactions',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Barcode lookup endpoint for scanner
export const lookupBarcode = async (req: Request, res: Response) => {
  try {
    const { barcodeValue } = req.params;

    console.log('🔍 Looking up barcode:', barcodeValue);
    console.log('🔍 Barcode type:', typeof barcodeValue);
    console.log('🔍 Barcode length:', barcodeValue?.length);

    if (!barcodeValue) {
      return res.status(400).json({
        success: false,
        error: 'Barcode value is required'
      });
    }

    // First, let's check if we can connect to the database
    try {
      const testConnection = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: dbError
      });
    }

    // Let's also check what barcodes exist in the database
    const allBarcodes = await prisma.barcode.findMany({
      select: {
        barcodeValue: true,
        serialNumber: true,
        id: true
      },
      take: 10 // Just get first 10 for debugging
    });

    console.log('📊 Sample barcodes in database:', allBarcodes.map(b => ({
      id: b.id.toString(),
      barcodeValue: b.barcodeValue,
      serialNumber: b.serialNumber
    })));

    // Find the barcode in the database
    console.log('🔍 Searching for barcode with exact match...');
    const barcode = await prisma.barcode.findFirst({
      where: {
        OR: [
          { barcodeValue: barcodeValue },
          { serialNumber: barcodeValue }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            productName: true,
            description: true,
            boxQty: true,
            totalUnits: true,
            reorderThreshold: true,
            isActive: true
          }
        }
      }
    });

    console.log('📦 Barcode lookup result:', barcode ? 'Found' : 'Not found');

    if (barcode) {
      console.log('✅ Found barcode details:', {
        id: barcode.id.toString(),
        barcodeValue: barcode.barcodeValue,
        serialNumber: barcode.serialNumber,
        productName: barcode.product.productName
      });
    } else {
      // Let's try a partial search to see if there are similar barcodes
      console.log('🔍 Trying partial search...');
      const partialMatches = await prisma.barcode.findMany({
        where: {
          OR: [
            { barcodeValue: { contains: barcodeValue } },
            { serialNumber: { contains: barcodeValue } }
          ]
        },
        select: {
          barcodeValue: true,
          serialNumber: true,
          product: {
            select: {
              productName: true
            }
          }
        },
        take: 5
      });

      console.log('🔍 Partial matches found:', partialMatches);
    }

    if (!barcode) {
      return res.status(404).json({
        success: false,
        error: 'Barcode not found in inventory'
      });
    }

    // Convert BigInt to string for JSON serialization
    const responseData = {
      id: barcode.id.toString(), // Add barcode ID for inventory transactions
      product: {
        id: barcode.product.id.toString(),
        sku: barcode.product.sku,
        productName: barcode.product.productName,
        boxQty: barcode.boxQty, // This comes from the barcode, not the product
        description: barcode.product.description,
        totalUnits: barcode.product.totalUnits,
        reorderThreshold: barcode.product.reorderThreshold,
        isActive: barcode.product.isActive
      },
      serialNumber: barcode.serialNumber,
      barcodeValue: barcode.barcodeValue,
      status: barcode.status,
      createdAt: barcode.createdAt.toISOString()
    };

    console.log('✅ Returning barcode data for:', barcode.product.productName);

    // Return the product information
    return res.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('❌ Error looking up barcode:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to lookup barcode',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};