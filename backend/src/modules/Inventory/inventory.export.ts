import { Request, Response, NextFunction } from 'express'
import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma'

export async function exportTransactionsToExcel(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { transactionType, employeeId, dateFrom, dateTo, quickRange } = req.query

    let where: any = {}

    // Filter by transaction type
    if (transactionType) {
      where.transactionType = transactionType
    }

    // Filter by employee
    if (employeeId) {
      where.employeeId = employeeId
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

    // Fetch from DB directly (NOT fetch API)
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: true,
        employee: true,
        barcode: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Transactions')

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Product Name', key: 'productName', width: 25 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Checkout Qty', key: 'checkoutQty', width: 15 },
      { header: 'Used Qty', key: 'usedQty', width: 15 },
    ]

    transactions.forEach(t => {
      const boxQty = t.barcode?.boxQty || 1

      worksheet.addRow({
        date: t.createdAt, // REAL DATE
        time: t.createdAt,
        productName: t.product?.productName || '',
        sku: t.product?.sku || '',
        employeeName: t.employee?.name || '',
        employeeId: t.employee?.employeeId || '',
        barcode: t.barcode?.barcodeValue || '',
        type: t.transactionType,
        checkoutQty: (t.checkoutQty || 0) * boxQty,
        usedQty: (t.usedQty || 0),
      })
    })

    // Proper Excel date formatting (NO ####)
    worksheet.getColumn('date').numFmt = 'yyyy-mm-dd'
    worksheet.getColumn('time').numFmt = 'hh:mm'

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transaction-report-${new Date().toISOString().split('T')[0]}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    next(error)
  }
}
