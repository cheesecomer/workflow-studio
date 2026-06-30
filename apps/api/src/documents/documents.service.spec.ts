import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import { PublishDocumentDto } from './dto/publish-document.dto';
import { Prisma } from '@workflow-studio/db';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const tx = {
    document: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    documentDefinition: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    fieldGroupDefinition: {
      create: jest.fn(),
    },
    approvalPolicy: {
      create: jest.fn(),
    },
    approvalRequirement: {
      createMany: jest.fn(),
    },
  };

  const prisma = {
    document: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
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

  describe('publish', () => {
    const id = 1n;
    const publishedById = 10n;

    const dto: PublishDocumentDto = {
      name: 'Updated Expense Request',
      draftContent: {
        groups: [
          {
            key: 'price',
            label: '申請額',
            repeatable: false,
            minRows: 1,
            fields: [
              {
                key: 'price',
                label: '申請額',
                fieldType: 'number',
                required: true,
                settings: { min: 1 },
              },
            ],
          },
        ],
        workflow: {
          policies: [
            {
              name: 'Example Policy',
              condition: null,
              operator: 'all',
              requirements: [
                {
                  name: 'Require 3 users',
                  departmentScope: 'same_tree',
                  positionOperator: 'eq',
                  positionId: 1n,
                  upperPositionId: null,
                  requiredCount: 3,
                },
              ],
            },
          ],
        },
      },
    };

    const document = {
      id,
      name: 'Expense Request',
      draftContent: {},
      publishedContent: null,
      currentDocumentDefinitionId: null,
    };

    const documentDefinition = {
      id: 100n,
      documentId: id,
      version: 1,
      name: dto.name,
      publishedById,
      publishedAt: new Date('2026-06-25T00:00:00.000Z'),
    };

    it('creates published document definition, fields, approval policies and requirements', async () => {
      tx.document.findFirst.mockResolvedValue(document);
      tx.documentDefinition.findFirst.mockResolvedValue(null);
      tx.documentDefinition.create.mockResolvedValue(documentDefinition);
      tx.approvalPolicy.create.mockResolvedValue({
        id: 200n,
        documentDefinitionId: documentDefinition.id,
      });
      tx.document.update.mockResolvedValue({
        ...document,
        name: dto.name,
        draftContent: dto.draftContent,
        publishedContent: dto.draftContent,
        currentDocumentDefinitionId: documentDefinition.id,
      });

      await service.publish(id, dto, publishedById);

      expect(tx.documentDefinition.create).toHaveBeenCalledWith({
        data: {
          documentId: id,
          version: 1,
          name: dto.name,
          publishedById,
        },
      });

      expect(tx.fieldGroupDefinition.create).toHaveBeenCalledWith({
        data: {
          documentDefinitionId: documentDefinition.id,
          key: 'price',
          label: '申請額',
          repeatable: false,
          minRows: 1,
          position: 1,
          fieldDefinitions: {
            createMany: {
              data: [
                {
                  key: 'price',
                  label: '申請額',
                  fieldType: 'number',
                  required: true,
                  position: 1,
                  settings: { min: 1 },
                },
              ],
            },
          },
        },
      });

      expect(tx.approvalPolicy.create).toHaveBeenCalledWith({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Example Policy',
          condition: Prisma.JsonNull,
          operator: 'all',
          position: 1,
          requirements: {
            createMany: {
              data: [
                {
                  name: 'Require 3 users',
                  departmentScope: 'same_tree',
                  positionOperator: 'eq',
                  positionId: 1n,
                  upperPositionId: null,
                  requiredCount: 3,
                },
              ],
            },
          },
        },
      });
    });

    it('updates document after publish', async () => {
      tx.document.findFirst.mockResolvedValue(document);
      tx.documentDefinition.findFirst.mockResolvedValue(null);
      tx.documentDefinition.create.mockResolvedValue(documentDefinition);
      tx.approvalPolicy.create.mockResolvedValue({ id: 200n });
      tx.document.update.mockResolvedValue({
        ...document,
        name: dto.name,
        draftContent: dto.draftContent,
        publishedContent: dto.draftContent,
        currentDocumentDefinitionId: documentDefinition.id,
      });

      await service.publish(id, dto, publishedById);

      expect(tx.document.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          name: dto.name,
          draftContent: dto.draftContent,
          publishedContent: dto.draftContent,
          currentDocumentDefinitionId: documentDefinition.id,
        },
      });
    });

    it('increments version when document already has definitions', async () => {
      tx.document.findFirst.mockResolvedValue(document);
      tx.documentDefinition.findFirst.mockResolvedValue({
        id: 99n,
        documentId: id,
        version: 1,
      });
      tx.documentDefinition.create.mockResolvedValue({
        ...documentDefinition,
        version: 2,
      });
      tx.approvalPolicy.create.mockResolvedValue({ id: 200n });
      tx.document.update.mockResolvedValue(document);

      await service.publish(id, dto, publishedById);

      expect(tx.documentDefinition.create).toHaveBeenCalledWith({
        data: {
          documentId: id,
          version: 2,
          name: dto.name,
          publishedById,
        },
      });
    });

    it('throws NotFoundException when document does not exist', async () => {
      tx.document.findFirst.mockResolvedValue(null);

      await expect(service.publish(id, dto, publishedById)).rejects.toThrow(
        NotFoundException,
      );

      expect(tx.documentDefinition.create).not.toHaveBeenCalled();
      expect(tx.document.update).not.toHaveBeenCalled();
    });
  });
});
