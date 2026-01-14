import { prisma } from '@/lib/prisma';
import { TenderType, TenderStatus, TenderDocumentType, DocumentStatus, EMDStatus, TenderAuditAction } from '@/generated/prisma';

export class TenderService {
  // Generate unique tender number
  private async generateTenderNumber(): Promise<string> {
    const count = await prisma.tender.count();
    return `TNR-${String(count + 1).padStart(3, '0')}`;
  }

  // Create audit log entry
  private async createAuditLog(
    tenderId: string,
    action: TenderAuditAction,
    performedBy: string,
    field?: string,
    oldValue?: string,
    newValue?: string,
    remarks?: string
  ) {
    await prisma.tenderAuditLog.create({
      data: {
        tenderId,
        action,
        field,
        oldValue,
        newValue,
        remarks,
        performedBy,
      },
    });
  }

  // Create new tender
  async createTender(data: {
    name: string;
    department: string;
    requiredDocuments?: string;
    totalEMDInvested?: number;
    totalEMDRefunded?: number;
    totalEMDForfeited?: number;
    createdBy: string;
  }) {
    const tenderNumber = await this.generateTenderNumber();
    
    const tender = await prisma.tender.create({
      data: {
        ...data,
        tenderNumber,
        tenderType: 'OPEN', // Default type
        submissionDate: new Date(), // Default to today
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
        totalEMDInvested: data.totalEMDInvested || null,
        totalEMDRefunded: data.totalEMDRefunded || null,
        totalEMDForfeited: data.totalEMDForfeited || null,
      },
    });

    await this.createAuditLog(tender.id, TenderAuditAction.CREATED, data.createdBy);

    return tender;
  }

  // Get all tenders with filters
  async getTenders(filters?: {
    status?: TenderStatus;
    department?: string;
    tenderType?: TenderType;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.department) where.department = { contains: filters.department };
    if (filters?.tenderType) where.tenderType = filters.tenderType;
    if (filters?.dateFrom || filters?.dateTo) {
      where.submissionDate = {};
      if (filters.dateFrom) where.submissionDate.gte = filters.dateFrom;
      if (filters.dateTo) where.submissionDate.lte = filters.dateTo;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const [tenders, total] = await Promise.all([
      prisma.tender.findMany({
        where,
        include: {
          documents: {
            select: {
              id: true,
              documentType: true,
              status: true,
              isRequired: true,
            },
          },
          emdRecords: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
          _count: {
            select: {
              documents: true,
              emdRecords: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tender.count({ where }),
    ]);

    return {
      tenders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get tender by ID
  async getTenderById(id: string) {
    return await prisma.tender.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        emdRecords: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
  }

  // Update tender
  async updateTender(
    id: string,
    data: {
      name?: string;
      description?: string;
      department?: string;
      projectMapping?: string;
      tenderType?: TenderType;
      submissionDate?: Date;
      deadline?: Date;
      totalValue?: number;
      internalRemarks?: string;
    },
    updatedBy: string
  ) {
    const existingTender = await prisma.tender.findUnique({ where: { id } });
    if (!existingTender) throw new Error('Tender not found');

    const tender = await prisma.tender.update({
      where: { id },
      data: {
        ...data,
        totalValue: data.totalValue ? data.totalValue.toString() : undefined,
        updatedAt: new Date(),
      },
    });

    // Create audit logs for changed fields
    const changes = Object.entries(data).filter(([key, value]) => {
      const oldValue = existingTender[key as keyof typeof existingTender];
      return oldValue !== value;
    });

    for (const [field, newValue] of changes) {
      const oldValue = existingTender[field as keyof typeof existingTender];
      await this.createAuditLog(
        id,
        TenderAuditAction.UPDATED,
        updatedBy,
        field,
        String(oldValue),
        String(newValue)
      );
    }

    return tender;
  }

  // Update tender status
  async updateTenderStatus(
    id: string,
    status: TenderStatus,
    updatedBy: string,
    remarks?: string
  ) {
    const existingTender = await prisma.tender.findUnique({ where: { id } });
    if (!existingTender) throw new Error('Tender not found');

    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === TenderStatus.APPROVED) {
      updateData.approvedBy = updatedBy;
      updateData.approvedAt = new Date();
    } else if (status === TenderStatus.REJECTED) {
      updateData.rejectedBy = updatedBy;
      updateData.rejectedAt = new Date();
    } else if (status === TenderStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    if (remarks) {
      updateData.internalRemarks = remarks;
    }

    const tender = await prisma.tender.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    let auditAction: TenderAuditAction;
    switch (status) {
      case TenderStatus.SUBMITTED:
        auditAction = TenderAuditAction.SUBMITTED;
        break;
      case TenderStatus.APPROVED:
        auditAction = TenderAuditAction.APPROVED;
        break;
      case TenderStatus.REJECTED:
        auditAction = TenderAuditAction.REJECTED;
        break;
      case TenderStatus.AWARDED:
        auditAction = TenderAuditAction.AWARDED;
        break;
      case TenderStatus.NOT_AWARDED:
        auditAction = TenderAuditAction.NOT_AWARDED;
        break;
      case TenderStatus.CLOSED:
        auditAction = TenderAuditAction.CLOSED;
        break;
      default:
        auditAction = TenderAuditAction.STATUS_CHANGED;
    }

    await this.createAuditLog(
      id,
      auditAction,
      updatedBy,
      'status',
      existingTender.status,
      status,
      remarks
    );

    return tender;
  }

  // Upload tender document
  async uploadDocument(data: {
    tenderId: string;
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType: TenderDocumentType;
    isRequired: boolean;
    uploadedBy: string;
  }) {
    const document = await prisma.tenderDocument.create({
      data,
    });

    await this.createAuditLog(
      data.tenderId,
      TenderAuditAction.DOCUMENT_UPLOADED,
      data.uploadedBy,
      'document',
      undefined,
      `${data.documentType}: ${data.originalName}`
    );

    return document;
  }

  // Verify/reject document
  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    verifiedBy: string,
    remarks?: string
  ) {
    const document = await prisma.tenderDocument.update({
      where: { id: documentId },
      data: {
        status,
        verifiedBy,
        verifiedAt: new Date(),
        remarks,
      },
    });

    const auditAction = status === DocumentStatus.VERIFIED 
      ? TenderAuditAction.DOCUMENT_VERIFIED 
      : TenderAuditAction.DOCUMENT_REJECTED;

    await this.createAuditLog(
      document.tenderId,
      auditAction,
      verifiedBy,
      'document_status',
      undefined,
      `${document.documentType}: ${status}`,
      remarks
    );

    return document;
  }

  // Add EMD record
  async addEMDRecord(data: {
    tenderId: string;
    amount: number;
    status: EMDStatus;
    remarks?: string;
    createdBy: string;
  }) {
    const emdRecord = await prisma.tenderEMD.create({
      data: {
        ...data,
        amount: data.amount.toString(),
      },
    });

    let auditAction: TenderAuditAction;
    switch (data.status) {
      case EMDStatus.INVESTED:
        auditAction = TenderAuditAction.EMD_INVESTED;
        break;
      case EMDStatus.REFUNDED:
        auditAction = TenderAuditAction.EMD_REFUNDED;
        break;
      case EMDStatus.FORFEITED:
        auditAction = TenderAuditAction.EMD_FORFEITED;
        break;
      default:
        auditAction = TenderAuditAction.EMD_INVESTED;
    }

    await this.createAuditLog(
      data.tenderId,
      auditAction,
      data.createdBy,
      'emd',
      undefined,
      `Amount: ${data.amount}, Status: ${data.status}`,
      data.remarks
    );

    return emdRecord;
  }

  // Update EMD status
  async updateEMDStatus(
    emdId: string,
    status: EMDStatus,
    updatedBy: string,
    remarks?: string
  ) {
    const existingEMD = await prisma.tenderEMD.findUnique({ where: { id: emdId } });
    if (!existingEMD) throw new Error('EMD record not found');

    const updateData: any = { status, updatedBy, updatedAt: new Date() };
    
    if (status === EMDStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    } else if (status === EMDStatus.FORFEITED) {
      updateData.forfeitedAt = new Date();
    }

    if (remarks) {
      updateData.remarks = remarks;
    }

    const emdRecord = await prisma.tenderEMD.update({
      where: { id: emdId },
      data: updateData,
    });

    let auditAction: TenderAuditAction;
    switch (status) {
      case EMDStatus.REFUNDED:
        auditAction = TenderAuditAction.EMD_REFUNDED;
        break;
      case EMDStatus.FORFEITED:
        auditAction = TenderAuditAction.EMD_FORFEITED;
        break;
      default:
        auditAction = TenderAuditAction.EMD_INVESTED;
    }

    await this.createAuditLog(
      existingEMD.tenderId,
      auditAction,
      updatedBy,
      'emd_status',
      existingEMD.status,
      status,
      remarks
    );

    return emdRecord;
  }

  // Get EMD summary
  async getEMDSummary() {
    const summary = await prisma.tenderEMD.groupBy({
      by: ['status'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const result = {
      totalInvested: 0,
      totalRefunded: 0,
      totalForfeited: 0,
      countInvested: 0,
      countRefunded: 0,
      countForfeited: 0,
    };

    summary.forEach((item) => {
      const amount = parseFloat(item._sum.amount?.toString() || '0');
      const count = item._count.id;

      switch (item.status) {
        case EMDStatus.INVESTED:
          result.totalInvested = amount;
          result.countInvested = count;
          break;
        case EMDStatus.REFUNDED:
          result.totalRefunded = amount;
          result.countRefunded = count;
          break;
        case EMDStatus.FORFEITED:
          result.totalForfeited = amount;
          result.countForfeited = count;
          break;
      }
    });

    return result;
  }

  // Get tender statistics
  async getTenderStatistics() {
    const [statusStats, typeStats, totalTenders, totalValue] = await Promise.all([
      prisma.tender.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.tender.groupBy({
        by: ['tenderType'],
        _count: { id: true },
      }),
      prisma.tender.count(),
      prisma.tender.aggregate({
        _sum: { totalValue: true },
      }),
    ]);

    return {
      statusStats,
      typeStats,
      totalTenders,
      totalValue: parseFloat(totalValue._sum.totalValue?.toString() || '0'),
    };
  }

  // Delete tender (soft delete by changing status)
  async deleteTender(id: string, deletedBy: string) {
    const tender = await prisma.tender.update({
      where: { id },
      data: {
        status: TenderStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    await this.createAuditLog(
      id,
      TenderAuditAction.CLOSED,
      deletedBy,
      'status',
      undefined,
      TenderStatus.CLOSED,
      'Tender deleted by admin'
    );

    return tender;
  }
}

export const tenderService = new TenderService();