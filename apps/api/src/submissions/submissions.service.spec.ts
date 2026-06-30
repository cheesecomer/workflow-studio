import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  const tx = {
    submission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    submissionFieldGroupRow: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    submissionFieldValue: {
      deleteMany: jest.fn(),
    },
  };

  const prisma = {
    submission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    fieldGroupDefinition: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const userId = 100n;

  const submission = {
    id: 111n,
    documentDefinitionId: 10n,
    createdById: userId,
    status: 'draft',
    fieldGroupRows: {
      amount: 3000,
      reason: '交通費',
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  describe('create', () => {
    it('creates a draft submission', async () => {
      tx.submission.create.mockResolvedValue(submission);
      prisma.submission.findUnique.mockResolvedValue(submission);
      prisma.fieldGroupDefinition.findMany.mockResolvedValue([
        {
          id: 1n,
          fieldDefinitions: [{ id: 1n }, { id: 2n }],
        },
      ]);

      await expect(
        service.create(
          {
            documentDefinitionId: 10n,
            fieldGroupRows: [
              {
                fieldGroupDefinitionId: 1n,
                position: 1,
                fieldValues: [
                  { fieldDefinitionId: 1n, value: 3000 },
                  { fieldDefinitionId: 2n, value: '交通費' },
                ],
              },
            ],
          },
          userId,
        ),
      ).resolves.toEqual(submission);

      expect(tx.submission.create).toHaveBeenCalledWith({
        data: {
          documentDefinitionId: 10n,
          createdById: userId,
          status: 'draft',
        },
      });

      expect(tx.submissionFieldGroupRow.create).toHaveBeenCalledWith({
        data: {
          submissionId: 111n,
          fieldGroupDefinitionId: 1n,
          position: 1,
          fieldValues: {
            createMany: {
              data: [
                { fieldDefinitionId: 1n, value: 3000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          },
        },
      });
    });
    it('throws BadRequestException when field group does not belong to document definition', async () => {
      prisma.fieldGroupDefinition.findMany.mockResolvedValue([]);

      await expect(
        service.create(
          {
            documentDefinitionId: 10n,
            fieldGroupRows: [
              {
                fieldGroupDefinitionId: 999n,
                position: 1,
                fieldValues: [{ fieldDefinitionId: 1n, value: 3000 }],
              },
            ],
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(tx.submission.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns submissions', async () => {
      prisma.submission.findMany.mockResolvedValue([submission]);

      await expect(service.findAll(userId)).resolves.toEqual([submission]);

      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: {
          createdById: userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('returns a submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(submission);

      await expect(service.findOne(111n)).resolves.toEqual(submission);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 111n,
        },
        include: {
          fieldGroupRows: {
            include: {
              fieldValues: true,
            },
          },
        },
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999n)).rejects.toThrow(NotFoundException);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 999n,
        },
        include: {
          fieldGroupRows: {
            include: {
              fieldValues: true,
            },
          },
        },
      });
    });
  });

  describe('update', () => {
    it('updates a submission', async () => {
      const updated = {
        ...submission,
        fieldGroupRows: [
          {
            fieldGroupDefinitionId: 1n,
            position: 1,
            fieldValues: [
              { fieldDefinitionId: 1n, value: 3000 },
              { fieldDefinitionId: 2n, value: '交通費' },
            ],
          },
        ],
      };

      prisma.submission.findUnique.mockResolvedValue(updated);
      prisma.fieldGroupDefinition.findMany.mockResolvedValue([
        {
          id: 1n,
          fieldDefinitions: [{ id: 1n }, { id: 2n }],
        },
      ]);
      tx.submission.update.mockResolvedValue(updated);

      await expect(
        service.update(111n, {
          fieldGroupRows: [
            {
              fieldGroupDefinitionId: 1n,
              position: 1,
              fieldValues: [
                { fieldDefinitionId: 1n, value: 3000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          ],
        }),
      ).resolves.toEqual(updated);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 111n,
        },
      });

      expect(tx.submissionFieldGroupRow.deleteMany).toHaveBeenCalledWith({
        where: {
          submissionId: 111n,
        },
      });

      expect(tx.submission.update).toHaveBeenCalledWith({
        data: {},
        where: {
          id: 111n,
        },
      });

      expect(tx.submissionFieldGroupRow.create).toHaveBeenCalledWith({
        data: {
          submissionId: 111n,
          fieldGroupDefinitionId: 1n,
          position: 1,
          fieldValues: {
            createMany: {
              data: [
                { fieldDefinitionId: 1n, value: 3000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          },
        },
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999n, {
          fieldGroupRows: [
            {
              fieldGroupDefinitionId: 1n,
              position: 1,
              fieldValues: [
                { fieldDefinitionId: 1n, value: 3000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(tx.submission.update).not.toHaveBeenCalled();
    });
    it('throws BadRequestException when field definition does not belong to field group', async () => {
      prisma.fieldGroupDefinition.findMany.mockResolvedValue([
        {
          id: 1n,
          fieldDefinitions: [{ id: 1n }],
        },
      ]);

      await expect(
        service.create(
          {
            documentDefinitionId: 10n,
            fieldGroupRows: [
              {
                fieldGroupDefinitionId: 1n,
                position: 1,
                fieldValues: [{ fieldDefinitionId: 999n, value: 3000 }],
              },
            ],
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(tx.submission.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes a submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(submission);
      tx.submission.delete.mockResolvedValue(submission);

      await expect(service.remove(1n)).resolves.toEqual(submission);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });

      expect(tx.submissionFieldGroupRow.deleteMany).toHaveBeenCalledWith({
        where: { submissionId: 1n },
      });
      expect(tx.submissionFieldValue.deleteMany).toHaveBeenCalledWith({
        where: {
          submissionFieldGroupRow: {
            submissionId: 1n,
          },
        },
      });
      expect(tx.submission.delete).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);

      expect(tx.submissionFieldGroupRow.deleteMany).not.toHaveBeenCalled();
      expect(tx.submissionFieldValue.deleteMany).not.toHaveBeenCalled();
      expect(tx.submission.delete).not.toHaveBeenCalled();
    });
  });
});
