import { Request, Response } from 'express'
import * as ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma'

interface TicketExportFilters {
  dateFrom?: string
  dateTo?: string
  date?: string
  status?: string
  priority?: string
  category?: string
  department?: string
  assigneeId?: string
  reporterId?: string
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
/*                        Fetch Ticket Data for Export                        */
/* -------------------------------------------------------------------------- */

async function getTicketDataForExport(filters: TicketExportFilters) {
  const where: any = {}

  // Status filter
  if (filters.status) {
    where.status = filters.status
  }

  // Priority filter
  if (filters.priority) {
    where.priority = filters.priority
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category
  }

  // Department filter
  if (filters.department) {
    where.department = filters.department
  }

  // Assignee filter
  if (filters.assigneeId) {
    const assignee = await prisma.employee.findUnique({
      where: { employeeId: filters.assigneeId }
    })
    if (assignee) {
      where.assigneeId = assignee.id
    }
  }

  // Reporter filter
  if (filters.reporterId) {
    const reporter = await prisma.employee.findUnique({
      where: { employeeId: filters.reporterId }
    })
    if (reporter) {
      where.reporterId = reporter.id
    }
  }

  // Date filtering
  const quickRange = getDateRangeFromQuickRange(filters.quickRange)

  if (quickRange) {
    where.createdAt = {
      gte: quickRange.dateFrom,
      lte: quickRange.dateTo
    }
  } else if (filters.date) {
    const d = parseDateOnly(filters.date)
    where.createdAt = {
      gte: startOfDay(d),
      lte: endOfDay(d)
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

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      assignee: {
        select: {
          name: true,
          employeeId: true,
          email: true,
          phone: true,
          role: true
        }
      },
      reporter: {
        select: {
          name: true,
          employeeId: true,
          email: true,
          phone: true,
          role: true
        }
      },
      attachments: {
        select: {
          fileName: true,
          fileSize: true,
          mimeType: true
        }
      },
      _count: {
        select: {
          comments: true,
          attachments: true
        }
      }
    },
    orderBy: [
      { createdAt: 'desc' },
      { ticketId: 'asc' }
    ]
  })

  return tickets.map((ticket: any) => ({
    ticketId: ticket.ticketId,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    department: ticket.department || '',
    customerName: ticket.customerName || '',
    customerId: ticket.customerId || '',
    customerPhone: ticket.customerPhone || '',
    assigneeName: ticket.assignee?.name || 'Unassigned',
    assigneeId: ticket.assignee?.employeeId || '',
    assigneeEmail: ticket.assignee?.email || '',
    assigneePhone: ticket.assignee?.phone || '',
    assigneeRole: ticket.assignee?.role || '',
    reporterName: ticket.reporter?.name || 'Unknown',
    reporterId: ticket.reporter?.employeeId || '',
    reporterEmail: ticket.reporter?.email || '',
    reporterPhone: ticket.reporter?.phone || '',
    reporterRole: ticket.reporter?.role || '',
    dueDate: ticket.dueDate ? ticket.dueDate.toISOString() : '',
    estimatedHours: ticket.estimatedHours || 0,
    attachmentCount: ticket._count.attachments,
    commentCount: ticket._count.comments,
    attachmentNames: ticket.attachments.map((att: any) => att.fileName).join(', '),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString()
  }))
}

/* -------------------------------------------------------------------------- */
/*                          Status/Priority Helpers                           */
/* -------------------------------------------------------------------------- */

function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'OPEN': 'Open',
    'RESOLVED': 'Resolved',
    'CLOSED': 'Closed'
  }
  return statusLabels[status] || status
}

function getPriorityLabel(priority: string): string {
  const priorityLabels: Record<string, string> = {
    'CRITICAL': 'Critical',
    'HIGH': 'High',
    'MEDIUM': 'Medium',
    'LOW': 'Low'
  }
  return priorityLabels[priority] || priority
}

/* -------------------------------------------------------------------------- */
/*                              Export Controller                              */
/* -------------------------------------------------------------------------- */

export const exportTicketsToExcel = async (req: Request, res: Response) => {
  try {
    const filters: TicketExportFilters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      date: req.query.date as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string,
      department: req.query.department as string,
      assigneeId: req.query.assigneeId as string,
      reporterId: req.query.reporterId as string,
      quickRange: req.query.quickRange as any
    }

    const data = await getTicketDataForExport(filters)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Support Tickets')

    // Define headers matching the table structure
    const headers = [
      'Ticket ID',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Department',
      'Customer Name',
      'Customer ID',
      'Customer Phone',
      'Assignee Name',
      'Assignee ID',
      'Assignee Email',
      'Assignee Phone',
      'Assignee Role',
      'Reporter Name',
      'Reporter ID', 
      'Reporter Email',
      'Reporter Phone',
      'Reporter Role',
      'Due Date',
      'Estimated Hours',
      'Attachments Count',
      'Comments Count',
      'Attachment Files',
      'Created Date',
      'Last Updated'
    ]

    // Add header row with styling
    const headerRow = sheet.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // Blue background
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Add data rows
    data.forEach((ticket: any, index: number) => {
      const row = sheet.addRow([
        ticket.ticketId,
        ticket.description,
        ticket.category,
        getPriorityLabel(ticket.priority),
        getStatusLabel(ticket.status),
        ticket.department,
        ticket.customerName,
        ticket.customerId,
        ticket.customerPhone,
        ticket.assigneeName,
        ticket.assigneeId,
        ticket.assigneeEmail,
        ticket.assigneePhone,
        ticket.assigneeRole,
        ticket.reporterName,
        ticket.reporterId,
        ticket.reporterEmail,
        ticket.reporterPhone,
        ticket.reporterRole,
        ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'No due date',
        ticket.estimatedHours || 'Not specified',
        ticket.attachmentCount,
        ticket.commentCount,
        ticket.attachmentNames || 'No attachments',
        new Date(ticket.createdAt).toLocaleString(),
        new Date(ticket.updatedAt).toLocaleString()
      ])

      // Add alternating row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' } // Light gray
          }
        })
      }

      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      // Color code status and priority cells
      const statusCell = row.getCell(6) // Status column
      const priorityCell = row.getCell(5) // Priority column

      // Status colors
      switch (ticket.status) {
        case 'OPEN':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
          statusCell.font = { color: { argb: 'FFDC2626' } }
          break
        case 'RESOLVED':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
          statusCell.font = { color: { argb: 'FF16A34A' } }
          break
        case 'CLOSED':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
          statusCell.font = { color: { argb: 'FF6B7280' } }
          break
      }

      // Priority colors
      switch (ticket.priority) {
        case 'CRITICAL':
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
          priorityCell.font = { color: { argb: 'FFDC2626' }, bold: true }
          break
        case 'HIGH':
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }
          priorityCell.font = { color: { argb: 'FFEA580C' } }
          break
        case 'MEDIUM':
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }
          priorityCell.font = { color: { argb: 'FFD97706' } }
          break
        case 'LOW':
          priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
          priorityCell.font = { color: { argb: 'FF16A34A' } }
          break
      }
    })

    // Auto-size columns
    sheet.columns.forEach((col, index) => {
      if (!col || !col.eachCell) return
      let max = headers[index]?.length || 12
      col.eachCell({ includeEmpty: true }, (cell) => {
        const length = String(cell.value ?? '').length
        max = Math.max(max, length)
      })
      col.width = Math.min(max + 2, 50) // Cap at 50 characters
    })

    // Set header row height
    sheet.getRow(1).height = 25

    // Freeze the header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    // Add summary information at the top
    sheet.spliceRows(1, 0, [])
    sheet.spliceRows(1, 0, [])
    sheet.spliceRows(1, 0, [])

    const summaryRow1 = sheet.getRow(1)
    summaryRow1.getCell(1).value = 'Support Tickets Export Report'
    summaryRow1.getCell(1).font = { bold: true, size: 16 }

    const summaryRow2 = sheet.getRow(2)
    summaryRow2.getCell(1).value = `Generated on: ${new Date().toLocaleString()}`
    summaryRow2.getCell(1).font = { italic: true }

    const summaryRow3 = sheet.getRow(3)
    summaryRow3.getCell(1).value = `Total Tickets: ${data.length}`
    summaryRow3.getCell(1).font = { bold: true }

    // Update frozen pane to account for summary rows
    sheet.views = [{ state: 'frozen', ySplit: 4 }]

    const filename = `support-tickets-${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('Ticket export error:', err)
    res.status(500).json({ success: false, message: 'Ticket export failed' })
  }
}