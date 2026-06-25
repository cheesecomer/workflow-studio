import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const prisma = {
    document: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const documentId = 1n;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('finds documents owned by the current user', async () => {
      const documents = [{ id: documentId, name: 'Expense Request' }];
      prisma.document.findMany.mockResolvedValue(documents);

      await expect(service.findAll()).resolves.toBe(documents);

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('finds a document owned by the current user', async () => {
      const document = { id: documentId, name: 'Expense Request' };
      prisma.document.findFirst.mockResolvedValue(document);

      await expect(service.findOne(documentId)).resolves.toBe(document);

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: documentId,
        },
      });
    });

    it('throws NotFoundException when document is not found', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(service.findOne(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a document with draftContent', async () => {
      const dto = {
        name: 'Expense Request',
        draftContent: { fields: [] },
      };
      const document = { id: documentId, ...dto };
      prisma.document.create.mockResolvedValue(document);

      await expect(service.create(dto)).resolves.toBe(document);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          draftContent: dto.draftContent,
        },
      });
    });

    it('creates a document with empty draftContent when omitted', async () => {
      const dto = {
        name: 'Expense Request',
      };
      const document = {
        id: documentId,
        name: dto.name,
        draftContent: {},
      };
      prisma.document.create.mockResolvedValue(document);

      await expect(service.create(dto)).resolves.toBe(document);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          draftContent: {},
        },
      });
    });
  });

  describe('update', () => {
    it('updates a document owned by the current user', async () => {
      const dto = {
        name: 'Updated Expense Request',
        draftContent: { fields: [{ name: 'amount' }] },
      };
      const existingDocument = { id: documentId };
      const updatedDocument = { id: documentId, ...dto };

      prisma.document.findFirst.mockResolvedValue(existingDocument);
      prisma.document.update.mockResolvedValue(updatedDocument);

      await expect(service.update(documentId, dto)).resolves.toBe(
        updatedDocument,
      );

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: documentId,
        },
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: dto,
      });
    });

    it('throws NotFoundException when document is not found', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.update(documentId, { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.document.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes a document owned by the current user', async () => {
      const existingDocument = { id: documentId };
      const deletedDocument = { id: documentId, name: 'Expense Request' };

      prisma.document.findFirst.mockResolvedValue(existingDocument);
      prisma.document.delete.mockResolvedValue(deletedDocument);

      await expect(service.remove(documentId)).resolves.toBe(deletedDocument);

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: documentId,
        },
      });
      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: documentId },
      });
    });

    it('throws NotFoundException when document is not found', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(service.remove(documentId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.document.delete).not.toHaveBeenCalled();
    });
  });
});
