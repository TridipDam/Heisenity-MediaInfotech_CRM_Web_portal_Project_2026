import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma'

interface CustomerExportFilters {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  quickRange?: 'yesterday' | '15days' | '30days'
}

/* -------------------------------------------------------------------------- */
/*                               Date Helpers                                 */
/* -------------------------------------------------------------------------- */

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function parseDateOnly(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* -------------------------------------------------------------------------- */
/*                          Quick Range Calculator                             */
/* -------------------------------------------------------------------------- */

function getDateRangeFromQuickRange(
  quickRange?: 'yesterday' | '15days' | '30days'
): { dateFrom: Date; dateTo: Date } | null {
  if (!quickRange) return null

  const today = startOfDay(new Date())

  switch (quickRange) {
    case 'yesterday': {
      const d = new Date(today)
      d.setDate(d.getDate() - 1)
      return { dateFrom: startOfDay(d), dateTo: endOfDay(d) }
    }

    case '15days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 14)
      return { dateFrom: startOfDay(from), dateTo: endOfDay(today) }
    }

    case '30days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { dateFrom: startOfDay(from), dateTo: endOfDay(today) }
    }

    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/*                      Fetch Customer Data for Export                        */
/* -------------------------------------------------------------------------- */

async function getCustomerDataForExport(filters: CustomerExportFilters) {
  const where: any = {}

  // Search filter
  if (filters.search) {
    where.OR = [
      { customerId: { contains: filters.search, mode: 'insensitive' } },
      { name: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  // Status filter
  if (filters.status) {
    where.status = filters.status
  }

  // Date range filter
  const quickRange = getDateRangeFromQuickRange(filters.quickRange)

  if (quickRange) {
    where.createdAt = {
      gte: quickRange.dateFrom,
      lte: quickRange.dateTo
    }
  } else if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) {
      where.createdAt.gte = startOfDay(parseDateOnly(filters.dateFrom))
    }
    if (filters.dateTo) {
      where.createdAt.lte = endOfDay(parseDateOnly(filters.dateTo))
    }
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [
      { createdAt: 'desc' }
    ],
    select: {
      customerId: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          supportRequests: true
        }
      }
    }
  })

  return customers.map(customer => ({
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email || '',
    address: customer.address || '',
    status: customer.status,
    supportRequestsCount: customer._count.supportRequests,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  }))
}

/* -------------------------------------------------------------------------- */
/*                              Export Controller                              */
/* -------------------------------------------------------------------------- */

export const exportCustomersToExcel = async (req: Request, res: Response) => {
  try {
    console.log('Customer export request received');
    console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
    console.log('User from middleware:', req.user ? 'User present' : 'No user');
    
    const filters: CustomerExportFilters = {
      search: req.query.search as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      quickRange: req.query.quickRange as any
    }

    console.log('Export filters:', filters);

    const data = await getCustomerDataForExport(filters)

    console.log('Customer data retrieved:', data.length, 'records');

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Customers')

    // Define headers
    const headers = [
      'Customer ID',
      'Name', 
      'Phone',
      'Email',
      'Address',
      'Status',
      'Support Requests',
      'Created Date',
      'Last Updated'
    ]

    // Add header row with styling
    const headerRow = sheet.addRow(headers)
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Add data rows
    data.forEach((customer, index) => {
      const row = sheet.addRow([
        customer.customerId,
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.status,
        customer.supportRequestsCount,
        new Date(customer.createdAt).toLocaleDateString(),
        new Date(customer.updatedAt).toLocaleDateString()
      ])

      // Add alternating row colors
      if (index % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F9FA' }
          }
        })
      }

      // Add borders to all cells
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      // Status cell coloring
      const statusCell = row.getCell(6)
      if (customer.status === 'ACTIVE') {
        statusCell.font = { color: { argb: '28a745' }, bold: true }
      } else if (customer.status === 'INACTIVE') {
        statusCell.font = { color: { argb: 'dc3545' }, bold: true }
      }
    })

    // Auto-fit columns
    sheet.columns.forEach(column => {
      if (!column || !column.eachCell) return
      let maxLength = 12
      column.eachCell({ includeEmpty: true }, cell => {
        const cellValue = String(cell.value ?? '')
        maxLength = Math.max(maxLength, cellValue.length)
      })
      column.width = Math.min(maxLength + 2, 50)
    })

    // Add summary row
    const summaryRowIndex = data.length + 3
    sheet.getCell(`A${summaryRowIndex}`).value = 'Summary:'
    sheet.getCell(`A${summaryRowIndex}`).font = { bold: true }
    
    sheet.getCell(`B${summaryRowIndex}`).value = `Total Customers: ${data.length}`
    sheet.getCell(`B${summaryRowIndex}`).font = { bold: true }

    const activeCount = data.filter(c => c.status === 'ACTIVE').length
    const inactiveCount = data.filter(c => c.status === 'INACTIVE').length
    
    sheet.getCell(`C${summaryRowIndex}`).value = `Active: ${activeCount}`
    sheet.getCell(`C${summaryRowIndex}`).font = { color: { argb: '28a745' }, bold: true }
    
    sheet.getCell(`D${summaryRowIndex}`).value = `Inactive: ${inactiveCount}`
    sheet.getCell(`D${summaryRowIndex}`).font = { color: { argb: 'dc3545' }, bold: true }

    // Set response headers
    const filename = `customers-export-${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )

    // Write workbook to response
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('Customer export error:', error)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
}