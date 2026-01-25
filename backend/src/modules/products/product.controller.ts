import { Request, Response } from 'express';
import { generateLabelsForProduct } from '../../barcode/labelgenerator';
import { prisma } from '../../lib/prisma';
import * as path from 'path';
import * as fs from 'fs-extra';

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, productName, description, boxQty, totalUnits, reorderThreshold } = req.body;

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
    const { sku, productName, description, boxQty, totalUnits, reorderThreshold } = req.body;

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
        ...(reorderThreshold !== undefined && { reorderThreshold: parseInt(reorderThreshold) })
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