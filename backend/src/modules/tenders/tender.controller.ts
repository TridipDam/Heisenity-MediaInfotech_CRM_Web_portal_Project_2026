import { Request, Response } from 'express';
import { tenderService } from './tender.service';
import { TenderType, TenderStatus, TenderDocumentType, DocumentStatus, EMDStatus } from '@/generated/prisma';
import { prisma } from '../../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/tenders');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `tender-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG files are allowed.'));
    }
  }
});

export class TenderController {
  // Create new tender
  async createTender(req: Request, res: Response) {
    try {
      const {
        name,
        department,
        requiredDocuments,
        totalEMDInvested,
        totalEMDRefunded,
        totalEMDForfeited
      } = req.body;

      const createdBy = req.user?.id;
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate required fields
      if (!name || !department) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const tender = await tenderService.createTender({
        name,
        department,
        requiredDocuments,
        totalEMDInvested: totalEMDInvested ? parseFloat(totalEMDInvested) : undefined,
        totalEMDRefunded: totalEMDRefunded ? parseFloat(totalEMDRefunded) : undefined,
        totalEMDForfeited: totalEMDForfeited ? parseFloat(totalEMDForfeited) : undefined,
        createdBy
      });

      res.status(201).json({
        success: true,
        message: 'Tender created successfully',
        data: tender
      });
    } catch (error) {
      console.error('Error creating tender:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all tenders with filters
  async getTenders(req: Request, res: Response) {
    try {
      const {
        status,
        department,
        tenderType,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const filters: any = {};
      
      if (status && Object.values(TenderStatus).includes(status as TenderStatus)) {
        filters.status = status as TenderStatus;
      }
      
      if (department) filters.department = department as string;
      
      if (tenderType && Object.values(TenderType).includes(tenderType as TenderType)) {
        filters.tenderType = tenderType as TenderType;
      }
      
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await tenderService.getTenders(filters);

      res.json({
        success: true,
        data: result.tenders,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching tenders:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get tender by ID
  async getTenderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const tender = await tenderService.getTenderById(id);
      
      if (!tender) {
        return res.status(404).json({
          success: false,
          message: 'Tender not found'
        });
      }

      res.json({
        success: true,
        data: tender
      });
    } catch (error) {
      console.error('Error fetching tender:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update tender
  async updateTender(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedBy = req.user?.id;
      
      if (!updatedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const updateData: any = {};
      const allowedFields = [
        'name', 'description', 'department', 'projectMapping', 
        'tenderType', 'submissionDate', 'deadline', 'totalValue', 'internalRemarks', 'requiredDocuments'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'submissionDate' || field === 'deadline') {
            updateData[field] = new Date(req.body[field]);
          } else if (field === 'totalValue') {
            updateData[field] = parseFloat(req.body[field]);
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      const tender = await tenderService.updateTender(id, updateData, updatedBy);

      res.json({
        success: true,
        message: 'Tender updated successfully',
        data: tender
      });
    } catch (error: any) {
      console.error('Error updating tender:', error);
      if (error.message === 'Tender not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update tender status
  async updateTenderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const updatedBy = req.user?.id;
      
      if (!updatedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!status || !Object.values(TenderStatus).includes(status as TenderStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const tender = await tenderService.updateTenderStatus(id, status, updatedBy, remarks);

      res.json({
        success: true,
        message: 'Tender status updated successfully',
        data: tender
      });
    } catch (error: any) {
      console.error('Error updating tender status:', error);
      if (error.message === 'Tender not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Upload tender document
  async uploadDocument(req: Request, res: Response) {
    try {
      const { tenderId } = req.params;
      const { documentType, isRequired } = req.body;
      const uploadedBy = req.user?.id;
      
      if (!uploadedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      if (!documentType || !Object.values(TenderDocumentType).includes(documentType as TenderDocumentType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type'
        });
      }

      const document = await tenderService.uploadDocument({
        tenderId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        documentType,
        isRequired: isRequired === 'true',
        uploadedBy
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update document status
  async updateDocumentStatus(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const { status, remarks } = req.body;
      const verifiedBy = req.user?.id;
      
      if (!verifiedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!status || !Object.values(DocumentStatus).includes(status as DocumentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const document = await tenderService.updateDocumentStatus(documentId, status, verifiedBy, remarks);

      res.json({
        success: true,
        message: 'Document status updated successfully',
        data: document
      });
    } catch (error) {
      console.error('Error updating document status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add EMD record
  async addEMDRecord(req: Request, res: Response) {
    try {
      const { tenderId } = req.params;
      const { amount, status, remarks } = req.body;
      const createdBy = req.user?.id;
      
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!amount || !status) {
        return res.status(400).json({
          success: false,
          message: 'Amount and status are required'
        });
      }

      if (!Object.values(EMDStatus).includes(status as EMDStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid EMD status'
        });
      }

      const emdRecord = await tenderService.addEMDRecord({
        tenderId,
        amount: parseFloat(amount),
        status,
        remarks,
        createdBy
      });

      res.status(201).json({
        success: true,
        message: 'EMD record added successfully',
        data: emdRecord
      });
    } catch (error) {
      console.error('Error adding EMD record:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update EMD status
  async updateEMDStatus(req: Request, res: Response) {
    try {
      const { emdId } = req.params;
      const { status, remarks } = req.body;
      const updatedBy = req.user?.id;
      
      if (!updatedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (!status || !Object.values(EMDStatus).includes(status as EMDStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid EMD status'
        });
      }

      const emdRecord = await tenderService.updateEMDStatus(emdId, status, updatedBy, remarks);

      res.json({
        success: true,
        message: 'EMD status updated successfully',
        data: emdRecord
      });
    } catch (error: any) {
      console.error('Error updating EMD status:', error);
      if (error.message === 'EMD record not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get EMD summary
  async getEMDSummary(req: Request, res: Response) {
    try {
      const summary = await tenderService.getEMDSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching EMD summary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get tender statistics
  async getTenderStatistics(req: Request, res: Response) {
    try {
      const statistics = await tenderService.getTenderStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error fetching tender statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete tender
  async deleteTender(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.id;
      
      if (!deletedBy) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const tender = await tenderService.deleteTender(id, deletedBy);

      res.json({
        success: true,
        message: 'Tender deleted successfully',
        data: tender
      });
    } catch (error) {
      console.error('Error deleting tender:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Download document
  async downloadDocument(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      
      // Get document info from database
      const document = await prisma.tenderDocument.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);

      // Stream the file
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export const tenderController = new TenderController();