import { Request, Response, NextFunction } from 'express'
import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma'

export async function exportProductsToExcel(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status, search, quickRange } = req.query

    let where: any = {
      isActive: true
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status
    }

    // Date filters
    if (quickRange) {
      const now = new Date()
      let startDate: Date

      if (quickRange === 'yesterday') {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)

        const endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)

        where.createdAt = { gte: startDate, lte: endDate }
      }

      if (quickRange === '15days') {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 15)
        where.createdAt = { gte: startDate }
      }

      if (quickRange === '30days') {
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        where.createdAt = { gte: startDate }
      }
    }

    // Fetch products with inventory data
    const products = await prisma.product.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Products')

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Box Qty', key: 'boxQty', width: 12 },
      { header: 'Total Units', key: 'totalUnits', width: 15 },
      { header: 'Current Units', key: 'currentUnits', width: 15 },
      { header: 'Reorder Threshold', key: 'reorderThreshold', width: 18 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Total Value', key: 'totalValue', width: 15 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created Date', key: 'createdAt', width: 15 },
    ]

    // Add styling for header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }

    products.forEach(product => {
      const unitPrice = product.unitPrice ? parseFloat(product.unitPrice.toString()) : 0
      const totalValue = unitPrice * product.totalUnits

      worksheet.addRow({
        sku: product.sku,
        productName: product.productName,
        description: product.description || '',
        boxQty: product.boxQty,
        totalUnits: product.totalUnits,
        currentUnits: product.currentUnits || 0,
        reorderThreshold: product.reorderThreshold || 0,
        unitPrice: unitPrice,
        totalValue: totalValue,
        supplier: product.supplier || '',
        status: product.status,
        createdAt: product.createdAt,
      })
    })

    // Format columns
    worksheet.getColumn('createdAt').numFmt = 'yyyy-mm-dd'

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products-report-${new Date().toISOString().split('T')[0]}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    next(error)
  }
}
