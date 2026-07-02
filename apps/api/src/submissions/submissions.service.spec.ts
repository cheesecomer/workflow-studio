import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from './submissions.service';
import { SubmissionsSubmitValidator } from './submissions-submit.validator';
import { SubmissionsApprovalRouteMaterializer } from './submissions-approval-route.materializer';

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
    departmentMembership: {
      findFirst: jest.fn(),
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
    documentDefinition: {
      findUnique: jest.fn(),
    },
  };

  const submissionsSubmitValidator = {
    validate: jest.fn(),
  };

  const submissionsApprovalRouteMaterializer = {
    materialize: jest.fn(),
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
        {
          provide: SubmissionsSubmitValidator,
          useValue: submissionsSubmitValidator,
        },
        {
          provide: SubmissionsApprovalRouteMaterializer,
          useValue: submissionsApprovalRouteMaterializer,
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

  describe('submit', () => {
    const submittedAt = new Date('2026-01-01T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(submittedAt);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const createSubmission = () => ({
      id: 1n,
      documentDefinitionId: 10n,
      createdById: 1n,
      submittedById: null,
      applicantDepartmentId: 100n,
      status: 'draft',
      currentAppliedApprovalPolicyId: null,
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      withdrawnAt: null,
      createdAt: submittedAt,
      updatedAt: submittedAt,
      fieldGroupRows: [],
    });

    const createDocumentDefinition = () => ({
      id: 10n,
      documentId: 1n,
      version: 1,
      name: 'Expense',
      status: 'published',
      createdAt: submittedAt,
      updatedAt: submittedAt,
      fieldGroupDefinitions: [],
      approvalPolicies: [],
    });

    it('submits draft submission', async () => {
      const submission = createSubmission();
      const documentDefinition = createDocumentDefinition();
      const applicantDepartmentId = 1n;

      prisma.submission.findUnique.mockResolvedValue(submission);
      prisma.documentDefinition.findUnique.mockResolvedValue(
        documentDefinition,
      );
      tx.departmentMembership.findFirst.mockResolvedValue({
        departmentId: applicantDepartmentId,
      });

      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'submitted',
        submittedById: 2n,
        submittedAt,
        currentAppliedApprovalPolicyId: 1000n,
      });

      submissionsApprovalRouteMaterializer.materialize.mockResolvedValue(1000n);

      const result = await service.submit(1n, 2n);

      expect(submissionsSubmitValidator.validate).toHaveBeenCalledWith(
        submission,
        documentDefinition,
      );

      expect(
        submissionsApprovalRouteMaterializer.materialize,
      ).toHaveBeenCalledWith(tx, {
        submission,
        documentDefinition,
        applicantDepartmentId,
        submittedAt,
      });

      expect(tx.submission.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: {
          status: 'submitted',
          submittedById: 2n,
          submittedAt,
          applicantDepartmentId,
          currentAppliedApprovalPolicyId: 1000n,
        },
      });

      expect(result.status).toBe('submitted');
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.submit(1n, 2n)).rejects.toThrow(NotFoundException);

      expect(prisma.documentDefinition.findUnique).not.toHaveBeenCalled();
      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when document definition does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(createSubmission());
      prisma.documentDefinition.findUnique.mockResolvedValue(null);

      await expect(service.submit(1n, 2n)).rejects.toThrow(NotFoundException);

      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission status is not draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...createSubmission(),
        status: 'submitted',
      });
      prisma.documentDefinition.findUnique.mockResolvedValue(
        createDocumentDefinition(),
      );

      await expect(service.submit(1n, 2n)).rejects.toThrow(BadRequestException);

      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not materialize approval route when validation fails', async () => {
      prisma.submission.findUnique.mockResolvedValue(createSubmission());
      prisma.documentDefinition.findUnique.mockResolvedValue(
        createDocumentDefinition(),
      );
      tx.departmentMembership.findFirst.mockResolvedValue({
        departmentId: 1n,
      });

      submissionsSubmitValidator.validate.mockImplementation(() => {
        throw new BadRequestException('Required field is missing');
      });

      await expect(service.submit(1n, 2n)).rejects.toThrow(BadRequestException);

      expect(
        submissionsApprovalRouteMaterializer.materialize,
      ).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
  describe('findApprovable', () => {
    it('returns submitted submissions that the user can approve', async () => {
      const submissions = [
        {
          id: 1n,
          status: 'submitted',
          documentDefinition: {
            id: 10n,
            name: '経費申請',
          },
          createdBy: {
            id: 2n,
            name: '申請者',
          },
        },
      ];

      prisma.submission.findMany.mockResolvedValue(submissions);

      await expect(service.findApprovable(3n)).resolves.toBe(submissions);

      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: {
          status: 'submitted',
          currentAppliedApprovalPolicy: {
            status: 'pending',
            requirements: {
              some: {
                status: 'pending',
                approvers: {
                  some: {
                    userId: 3n,
                    status: 'pending',
                  },
                },
              },
            },
          },
        },
        include: {
          documentDefinition: true,
          createdBy: true,
        },
        orderBy: {
          submittedAt: 'asc',
        },
      });
    });
  });
});
