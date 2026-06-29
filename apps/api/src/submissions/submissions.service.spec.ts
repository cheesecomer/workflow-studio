import { NotFoundException } from '@nestjs/common';
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
    submissionFieldValue: {
      deleteMany: jest.fn(),
    },
  };

  const prisma = {
    submission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const userId = 100n;

  const submission = {
    id: 1n,
    documentDefinitionId: 10n,
    createdById: userId,
    status: 'draft',
    fieldValues: {
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
      prisma.submission.create.mockResolvedValue(submission);

      await expect(
        service.create(
          {
            documentDefinitionId: 10n,
            fieldValues: [
              { fieldDefinitionId: 1n, value: 3000 },
              { fieldDefinitionId: 2n, value: '交通費' },
            ],
          },
          userId,
        ),
      ).resolves.toEqual(submission);

      expect(prisma.submission.create).toHaveBeenCalledWith({
        data: {
          documentDefinitionId: 10n,
          createdById: userId,
          status: 'draft',
          fieldValues: {
            createMany: {
              data: [
                { fieldDefinitionId: 1n, value: 3000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          },
        },
        include: {
          fieldValues: true,
        },
      });
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

      await expect(service.findOne(1n)).resolves.toEqual(submission);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
        include: {
          fieldValues: true,
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
          fieldValues: true,
        },
      });
    });
  });

  describe('update', () => {
    it('updates a submission', async () => {
      const updated = {
        ...submission,
        values: {
          amount: 5000,
          reason: '宿泊費',
        },
      };

      prisma.submission.findUnique.mockResolvedValue(submission);
      tx.submissionFieldValue.deleteMany.mockResolvedValue(updated);
      tx.submission.update.mockResolvedValue(updated);

      await expect(
        service.update(1n, {
          fieldValues: [
            { fieldDefinitionId: 1n, value: 5000 },
            { fieldDefinitionId: 2n, value: '交通費' },
          ],
        }),
      ).resolves.toEqual(updated);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });

      expect(tx.submissionFieldValue.deleteMany).toHaveBeenCalledWith({
        where: {
          submissionId: 1n,
        },
      });

      expect(tx.submission.update).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
        data: {
          fieldValues: {
            createMany: {
              data: [
                { fieldDefinitionId: 1n, value: 5000 },
                { fieldDefinitionId: 2n, value: '交通費' },
              ],
            },
          },
        },
        include: {
          fieldValues: true,
        },
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999n, {
          fieldValues: [
            { fieldDefinitionId: 1n, value: 5000 },
            { fieldDefinitionId: 2n, value: '交通費' },
          ],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.submission.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes a submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(submission);
      prisma.submission.delete.mockResolvedValue(submission);

      await expect(service.remove(1n)).resolves.toEqual(submission);

      expect(prisma.submission.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });

      expect(prisma.submission.delete).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.remove(999n)).rejects.toThrow(NotFoundException);

      expect(prisma.submission.delete).not.toHaveBeenCalled();
    });
  });
});
