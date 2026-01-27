import { Request, Response } from 'express';
import {
  updateProductInventory,
  calculateAvailableUnits,
  checkLowStockThreshold
} from './inventory.service';
import { prisma } from '../../lib/prisma';
import Redis from 'ioredis';

// Redis client for duplicate detection
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Duplicate window seconds configurable via env (default 300 seconds = 5 minutes)
const DUPLICATE_WINDOW_SECONDS = parseInt(process.env.DUPLICATE_WINDOW_SECONDS || '300', 10);

/**
 * POST /inventory/transaction
 * Create inventory transaction (CHECKOUT / RETURN / ADJUST)
 */
export const createInventoryTransaction = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      barcodeId,
      employeeId,
      transactionType,
      checkoutQty,
      returnedQty,
      usedQty,
      remarks
    } = req.body;

    // -----------------------------
    // Basic validation
    // -----------------------------
    if (!productId || !employeeId || !transactionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['productId', 'employeeId', 'transactionType']
      });
    }

    if (!['CHECKOUT', 'RETURN', 'ADJUST'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid transactionType: ${transactionType}`
      });
    }

    // CHECKOUT / RETURN should have barcode
    if ((transactionType === 'CHECKOUT' || transactionType === 'RETURN') && !barcodeId) {
      return res.status(400).json({
        success: false,
        error: 'barcodeId is required for CHECKOUT and RETURN'
      });
    }

    // Quantity sanity checks
    if (checkoutQty !== undefined && checkoutQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'checkoutQty cannot be negative'
      });
    }

    if (returnedQty !== undefined && returnedQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'returnedQty cannot be negative'
      });
    }

    if (usedQty !== undefined && usedQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'usedQty cannot be negative'
      });
    }

    // -----------------------------
    // Duplicate detection for CHECKOUT/RETURN with barcode
    // -----------------------------
    if (barcodeId && (transactionType === 'CHECKOUT' || transactionType === 'RETURN')) {
      try {
        const duplicateKey = `inventory_scan:${barcodeId}:${employeeId}:${transactionType}`;
        const existingEntry = await redis.get(duplicateKey);
        
        if (existingEntry) {
          const ttl = await redis.ttl(duplicateKey);
          return res.status(409).json({
            success: false,
            error: 'Duplicate scan detected',
            message: `This barcode was recently ${transactionType.toLowerCase()}ed`,
            remainingSeconds: Math.max(ttl, 0),
            duplicate: true
          });
        }

        // Set duplicate prevention key
        await redis.setex(duplicateKey, DUPLICATE_WINDOW_SECONDS, JSON.stringify({
          timestamp: Date.now(),
          barcodeId,
          employeeId,
          transactionType
        }));
      } catch (redisError) {
        console.warn('Redis duplicate detection failed, continuing without it:', redisError);
        // Continue without duplicate detection if Redis fails
      }
    }

    // -----------------------------
    // Call service
    // -----------------------------
    const result = await updateProductInventory({
      productId,
      barcodeId,
      employeeId,
      transactionType,
      checkoutQty,
      returnedQty,
      usedQty,
      remarks
    });

    // -----------------------------
    // Success response
    // -----------------------------
    return res.status(201).json({
      success: true,
      data: result,
      message: `Inventory ${transactionType.toLowerCase()} processed successfully`
    });

  } catch (error: any) {
    console.error('❌ Inventory transaction failed:', error);

    // Known business errors can be surfaced cleanly
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to process inventory transaction',
      message: error.message
    });
  }
};

/**
 * GET /inventory/transactions
 * Get inventory transactions with filtering and pagination
 */
export const getInventoryTransactions = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      employeeId, 
      productId, 
      transactionType,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (employeeId) {
      where.employeeId = employeeId as string;
    }
    
    if (productId) {
      where.productId = BigInt(productId as string);
    }
    
    if (transactionType) {
      where.transactionType = transactionType as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              productName: true,
              boxQty: true
            }
          },
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true
            }
          },
          barcode: {
            select: {
              id: true,
              barcodeValue: true,
              serialNumber: true,
              status: true
            }
          }
        }
      }),
      prisma.inventoryTransaction.count({ where })
    ]);

    // Serialize BigInt fields
    const serializedTransactions = transactions.map(tx => ({
      id: tx.id.toString(),
      transactionType: tx.transactionType,
      checkoutQty: tx.checkoutQty,
      returnedQty: tx.returnedQty,
      usedQty: tx.usedQty,
      remarks: tx.remarks,
      createdAt: tx.createdAt,
      product: tx.product ? {
        id: tx.product.id.toString(),
        sku: tx.product.sku,
        productName: tx.product.productName,
        boxQty: tx.product.boxQty
      } : null,
      employee: tx.employee,
      barcode: tx.barcode ? {
        id: tx.barcode.id.toString(),
        barcodeValue: tx.barcode.barcodeValue,
        serialNumber: tx.barcode.serialNumber,
        status: tx.barcode.status
      } : null
    }));

    return res.json({
      success: true,
      data: {
        transactions: serializedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get inventory transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory transactions',
      message: error.message
    });
  }
};

/**
 * GET /inventory/available/:productId
 * Get available units for a specific product
 */
export const getAvailableUnits = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const available = await calculateAvailableUnits(productId);

    return res.json({
      success: true,
      data: {
        productId,
        availableUnits: available
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get available units:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to calculate available units',
      message: error.message
    });
  }
};

/**
 * GET /inventory/low-stock-alerts
 * Get all low stock alerts
 */
export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total] = await Promise.all([
      prisma.lowStockAlert.findMany({
        skip,
        take: limitNum,
        orderBy: { triggeredAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              productName: true,
              totalUnits: true,
              reorderThreshold: true
            }
          }
        }
      }),
      prisma.lowStockAlert.count()
    ]);

    // Serialize and add current available units
    const serializedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const currentAvailable = await calculateAvailableUnits(alert.productId);
        
        return {
          id: alert.id.toString(),
          stockAtTrigger: alert.stockAtTrigger,
          triggeredAt: alert.triggeredAt,
          product: alert.product ? {
            id: alert.product.id.toString(),
            sku: alert.product.sku,
            productName: alert.product.productName,
            totalUnits: alert.product.totalUnits,
            reorderThreshold: alert.product.reorderThreshold,
            currentAvailable
          } : null
        };
      })
    );

    return res.json({
      success: true,
      data: {
        alerts: serializedAlerts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get low stock alerts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve low stock alerts',
      message: error.message
    });
  }
};

/**
 * POST /inventory/check-low-stock/:productId
 * Manually trigger low stock check for a product
 */
export const checkProductLowStock = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const result = await checkLowStockThreshold(productId);

    return res.json({
      success: true,
      data: result,
      message: result.triggered 
        ? 'Low stock alert triggered' 
        : 'No low stock alert needed'
    });

  } catch (error: any) {
    console.error('❌ Failed to check low stock:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to check low stock threshold',
      message: error.message
    });
  }
};

/**
 * GET /inventory/allocations
 * Get current inventory allocations
 */
export const getAllocations = async (req: Request, res: Response) => {
  try {
    const { employeeId, productId, page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (employeeId) {
      where.employeeId = employeeId as string;
    }
    
    if (productId) {
      where.productId = BigInt(productId as string);
    }

    const [allocations, total] = await Promise.all([
      prisma.allocation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              productName: true,
              boxQty: true
            }
          },
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true
            }
          }
        }
      }),
      prisma.allocation.count({ where })
    ]);

    // Serialize BigInt fields
    const serializedAllocations = allocations.map(allocation => ({
      id: allocation.id.toString(),
      allocatedUnits: allocation.allocatedUnits,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
      product: allocation.product ? {
        id: allocation.product.id.toString(),
        sku: allocation.product.sku,
        productName: allocation.product.productName,
        boxQty: allocation.product.boxQty
      } : null,
      employee: allocation.employee
    }));

    return res.json({
      success: true,
      data: {
        allocations: serializedAllocations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get allocations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve allocations',
      message: error.message
    });
  }
};

/**
 * GET /inventory/audit
 * Get inventory audit logs
 */
export const getInventoryAudit = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, productId, performedBy } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for system configuration entries
    const where: any = {
      key: {
        startsWith: 'inventory_audit:'
      }
    };

    const [auditEntries, total] = await Promise.all([
      prisma.systemConfiguration.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemConfiguration.count({ where })
    ]);

    // Parse and filter audit entries
    let auditLogs = auditEntries.map(entry => {
      try {
        const audit = JSON.parse(entry.value);
        return {
          key: entry.key,
          createdAt: entry.createdAt,
          ...audit
        };
      } catch (error) {
        console.warn('Failed to parse audit entry:', entry.key);
        return null;
      }
    }).filter(Boolean);

    // Apply additional filters
    if (productId) {
      auditLogs = auditLogs.filter(log => log.productId === productId);
    }
    
    if (performedBy) {
      auditLogs = auditLogs.filter(log => log.performedBy === performedBy);
    }

    return res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: auditLogs.length,
          totalPages: Math.ceil(auditLogs.length / limitNum)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get inventory audit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory audit logs',
      message: error.message
    });
  }
};
/**
 * GET /inventory/employee-checkouts/:employeeId
 * Get all checked-out barcodes for a specific employee
 */
export const getEmployeeCheckouts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Get all checked-out barcodes for this employee
    const checkouts = await prisma.barcodeCheckout.findMany({
      where: {
        employeeId: employeeId,
        isReturned: false // Only non-returned items
      },
      include: {
        barcode: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                productName: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        checkoutTime: 'desc'
      }
    });

    // Serialize the data
    const serializedCheckouts = checkouts.map(checkout => ({
      id: checkout.id.toString(),
      checkoutTime: checkout.checkoutTime,
      barcode: {
        id: checkout.barcode.id.toString(),
        barcodeValue: checkout.barcode.barcodeValue,
        serialNumber: checkout.barcode.serialNumber,
        boxQty: checkout.barcode.boxQty,
        status: checkout.barcode.status,
        product: checkout.barcode.product ? {
          id: checkout.barcode.product.id.toString(),
          sku: checkout.barcode.product.sku,
          productName: checkout.barcode.product.productName,
          description: checkout.barcode.product.description
        } : null
      }
    }));

    return res.json({
      success: true,
      data: {
        employeeId,
        checkouts: serializedCheckouts,
        total: serializedCheckouts.length
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to get employee checkouts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve employee checkouts',
      message: error.message
    });
  }
};