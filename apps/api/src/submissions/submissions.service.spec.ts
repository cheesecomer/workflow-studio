import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
    appliedApprovalPolicy: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    appliedApprovalRequirement: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    approver: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    approvalDecision: {
      create: jest.fn(),
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    fieldGroupDefinition: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(
      (input: ((transaction: typeof tx) => unknown) | Promise<unknown>[]) =>
        Array.isArray(input) ? Promise.all(input) : input(tx),
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
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (input: ((transaction: typeof tx) => unknown) | Promise<unknown>[]) =>
        Array.isArray(input) ? Promise.all(input) : input(tx),
    );

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
    const submissionListInclude = {
      documentDefinition: {
        select: {
          id: true,
          documentId: true,
          name: true,
          version: true,
        },
      },
      applicantDepartment: {
        select: {
          id: true,
          name: true,
        },
      },
      currentAppliedApprovalPolicy: {
        include: {
          approvalPolicy: {
            select: {
              id: true,
              name: true,
              operator: true,
              position: true,
            },
          },
        },
      },
    };

    it('returns paginated submissions', async () => {
      prisma.submission.findMany.mockResolvedValue([submission]);
      prisma.submission.count.mockResolvedValue(1);

      await expect(service.findAll(userId)).resolves.toEqual({
        items: [submission],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: {
          createdById: userId,
        },
        include: submissionListInclude,
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 0,
        take: 20,
      });
      expect(prisma.submission.count).toHaveBeenCalledWith({
        where: {
          createdById: userId,
        },
      });
    });

    it('filters submissions by status', async () => {
      prisma.submission.findMany.mockResolvedValue([submission]);
      prisma.submission.count.mockResolvedValue(1);

      await expect(service.findAll(userId, 'draft')).resolves.toEqual({
        items: [submission],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: {
          createdById: userId,
          status: 'draft',
        },
        include: submissionListInclude,
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 0,
        take: 20,
      });
      expect(prisma.submission.count).toHaveBeenCalledWith({
        where: {
          createdById: userId,
          status: 'draft',
        },
      });
    });

    it('paginates submissions', async () => {
      prisma.submission.findMany.mockResolvedValue([submission]);
      prisma.submission.count.mockResolvedValue(45);

      await expect(
        service.findAll(userId, undefined, { page: '2', limit: '10' }),
      ).resolves.toEqual({
        items: [submission],
        meta: {
          page: 2,
          limit: 10,
          total: 45,
          totalPages: 5,
        },
      });

      expect(prisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('throws BadRequestException when pagination query is invalid', async () => {
      await expect(
        service.findAll(userId, undefined, { page: '0' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findAll(userId, undefined, { limit: '101' }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.submission.findMany).not.toHaveBeenCalled();
      expect(prisma.submission.count).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when status is invalid', async () => {
      await expect(service.findAll(userId, 'unknown')).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.submission.findMany).not.toHaveBeenCalled();
      expect(prisma.submission.count).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a submission', async () => {
      prisma.submission.findFirst.mockResolvedValue(submission);

      await expect(service.findOne(111n, 888n)).resolves.toEqual({
        ...submission,
        availableActions: [],
        activities: [
          {
            type: 'created',
            occurredAt: submission.createdAt,
            actor: { id: userId },
          },
        ],
      });

      expect(prisma.submission.findFirst).toHaveBeenCalledWith({
        where: {
          id: 111n,
          OR: [
            {
              createdById: 888n,
            },
            {
              appliedApprovalPolicies: {
                some: {
                  requirements: {
                    some: {
                      approvers: {
                        some: {
                          userId: 888n,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          documentDefinition: {
            select: {
              id: true,
              documentId: true,
              name: true,
              version: true,
              fieldGroupDefinitions: {
                select: {
                  id: true,
                  key: true,
                  label: true,
                  position: true,
                  repeatable: true,
                  minRows: true,
                  fieldDefinitions: {
                    select: {
                      id: true,
                      key: true,
                      label: true,
                      fieldType: true,
                      required: true,
                      position: true,
                      settings: true,
                    },
                    orderBy: {
                      position: 'asc',
                    },
                  },
                },
                orderBy: {
                  position: 'asc',
                },
              },
            },
          },
          fieldGroupRows: {
            include: {
              fieldValues: true,
            },
          },
          appliedApprovalPolicies: {
            include: {
              approvalPolicy: true,
              requirements: {
                include: {
                  approvalRequirement: true,
                  approvers: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                      decisions: {
                        include: {
                          actor: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                        orderBy: {
                          decidedAt: 'asc',
                        },
                      },
                    },
                    orderBy: {
                      id: 'asc',
                    },
                  },
                },
                orderBy: {
                  id: 'asc',
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
    });

    it('returns draft owner actions', async () => {
      prisma.submission.findFirst.mockResolvedValue({
        ...submission,
        createdById: 888n,
      });

      await expect(service.findOne(111n, 888n)).resolves.toMatchObject({
        availableActions: ['submit', 'edit', 'delete'],
      });
    });

    it('returns submitted applicant action', async () => {
      prisma.submission.findFirst.mockResolvedValue({
        ...submission,
        status: 'submitted',
        submittedById: 888n,
        appliedApprovalPolicies: [],
      });

      await expect(service.findOne(111n, 888n)).resolves.toMatchObject({
        availableActions: ['withdraw'],
      });
    });

    it('returns current approver actions', async () => {
      prisma.submission.findFirst.mockResolvedValue({
        ...submission,
        status: 'submitted',
        currentAppliedApprovalPolicyId: 1n,
        appliedApprovalPolicies: [
          {
            id: 1n,
            status: 'pending',
            requirements: [
              {
                status: 'pending',
                approvers: [
                  {
                    userId: 888n,
                    status: 'pending',
                  },
                ],
              },
            ],
          },
        ],
      });

      await expect(service.findOne(111n, 888n)).resolves.toMatchObject({
        availableActions: ['approve', 'reject'],
      });
    });

    it('returns timeline activities ordered by occurrence time', async () => {
      const submittedAt = new Date('2026-01-02T00:00:00.000Z');
      const decidedAt = new Date('2026-01-03T00:00:00.000Z');
      const approvedAt = new Date('2026-01-04T00:00:00.000Z');

      prisma.submission.findFirst.mockResolvedValue({
        ...submission,
        status: 'approved',
        submittedAt,
        submittedById: 888n,
        submittedBy: {
          id: 888n,
          name: 'Applicant',
          email: 'applicant@example.com',
        },
        approvedAt,
        appliedApprovalPolicies: [
          {
            id: 1n,
            position: 1,
            status: 'approved',
            approvalPolicy: {
              id: 10n,
              name: 'Manager approval',
            },
            requirements: [
              {
                status: 'approved',
                approvalRequirement: {
                  id: 20n,
                  name: 'Manager',
                },
                approvers: [
                  {
                    userId: 999n,
                    status: 'approved',
                    decisions: [
                      {
                        decision: 'approved',
                        comment: 'Looks good',
                        decidedAt,
                        actor: {
                          id: 999n,
                          name: 'Approver',
                          email: 'approver@example.com',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      await expect(service.findOne(111n, 888n)).resolves.toMatchObject({
        activities: [
          {
            type: 'created',
            occurredAt: submission.createdAt,
            actor: { id: userId },
          },
          {
            type: 'submitted',
            occurredAt: submittedAt,
            actor: {
              id: 888n,
              name: 'Applicant',
              email: 'applicant@example.com',
            },
          },
          {
            type: 'approval_decision',
            occurredAt: decidedAt,
            decision: 'approved',
            comment: 'Looks good',
            approvalPolicy: {
              id: 10n,
              name: 'Manager approval',
              position: 1,
            },
            approvalRequirement: {
              id: 20n,
              name: 'Manager',
            },
          },
          {
            type: 'approved',
            occurredAt: approvedAt,
          },
        ],
      });
    });

    it('does not return approver actions when current approval policy is not set', async () => {
      prisma.submission.findFirst.mockResolvedValue({
        ...submission,
        status: 'submitted',
        currentAppliedApprovalPolicyId: null,
        appliedApprovalPolicies: [
          {
            id: 1n,
            status: 'pending',
            requirements: [
              {
                status: 'pending',
                approvers: [
                  {
                    userId: 888n,
                    status: 'pending',
                  },
                ],
              },
            ],
          },
        ],
      });

      await expect(service.findOne(111n, 888n)).resolves.toMatchObject({
        availableActions: [],
      });
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999n, 888n)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.submission.findFirst).toHaveBeenCalledWith({
        where: {
          id: 999n,
          OR: [
            {
              createdById: 888n,
            },
            {
              appliedApprovalPolicies: {
                some: {
                  requirements: {
                    some: {
                      approvers: {
                        some: {
                          userId: 888n,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          documentDefinition: {
            select: {
              id: true,
              documentId: true,
              name: true,
              version: true,
              fieldGroupDefinitions: {
                select: {
                  id: true,
                  key: true,
                  label: true,
                  position: true,
                  repeatable: true,
                  minRows: true,
                  fieldDefinitions: {
                    select: {
                      id: true,
                      key: true,
                      label: true,
                      fieldType: true,
                      required: true,
                      position: true,
                      settings: true,
                    },
                    orderBy: {
                      position: 'asc',
                    },
                  },
                },
                orderBy: {
                  position: 'asc',
                },
              },
            },
          },
          fieldGroupRows: {
            include: {
              fieldValues: true,
            },
          },
          appliedApprovalPolicies: {
            include: {
              approvalPolicy: true,
              requirements: {
                include: {
                  approvalRequirement: true,
                  approvers: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                      decisions: {
                        include: {
                          actor: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                        orderBy: {
                          decidedAt: 'asc',
                        },
                      },
                    },
                    orderBy: {
                      id: 'asc',
                    },
                  },
                },
                orderBy: {
                  id: 'asc',
                },
              },
            },
            orderBy: {
              position: 'asc',
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
        service.update(
          111n,
          {
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
        service.update(
          999n,
          {
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
      ).rejects.toThrow(NotFoundException);

      expect(tx.submission.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission is not draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        status: 'submitted',
      });

      await expect(
        service.update(
          111n,
          {
            fieldGroupRows: [],
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.fieldGroupDefinition.findMany).not.toHaveBeenCalled();
      expect(tx.submission.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when current user does not own draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        createdById: 999n,
      });

      await expect(
        service.update(
          111n,
          {
            fieldGroupRows: [],
          },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.fieldGroupDefinition.findMany).not.toHaveBeenCalled();
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

      await expect(service.remove(1n, userId)).resolves.toEqual(submission);

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

      await expect(service.remove(999n, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(tx.submissionFieldGroupRow.deleteMany).not.toHaveBeenCalled();
      expect(tx.submissionFieldValue.deleteMany).not.toHaveBeenCalled();
      expect(tx.submission.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission is not draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        status: 'submitted',
      });

      await expect(service.remove(1n, userId)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.submissionFieldGroupRow.deleteMany).not.toHaveBeenCalled();
      expect(tx.submissionFieldValue.deleteMany).not.toHaveBeenCalled();
      expect(tx.submission.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when current user does not own draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        createdById: 999n,
      });

      await expect(service.remove(1n, userId)).rejects.toThrow(
        ForbiddenException,
      );

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
        submittedById: 1n,
        submittedAt,
        currentAppliedApprovalPolicyId: 1000n,
      });

      submissionsApprovalRouteMaterializer.materialize.mockResolvedValue(1000n);

      const result = await service.submit(1n, 1n);

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
          submittedById: 1n,
          submittedAt,
          applicantDepartmentId,
          currentAppliedApprovalPolicyId: 1000n,
        },
      });

      expect(result.status).toBe('submitted');
    });

    it('throws NotFoundException when submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.submit(1n, 1n)).rejects.toThrow(NotFoundException);

      expect(prisma.documentDefinition.findUnique).not.toHaveBeenCalled();
      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when document definition does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(createSubmission());
      prisma.documentDefinition.findUnique.mockResolvedValue(null);

      await expect(service.submit(1n, 1n)).rejects.toThrow(NotFoundException);

      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission status is not draft', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...createSubmission(),
        status: 'submitted',
      });

      await expect(service.submit(1n, 1n)).rejects.toThrow(BadRequestException);

      expect(submissionsSubmitValidator.validate).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is not the submission creator', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...createSubmission(),
        createdById: 1n,
      });

      await expect(service.submit(1n, 2n)).rejects.toThrow(ForbiddenException);

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

      await expect(service.submit(1n, 1n)).rejects.toThrow(BadRequestException);

      expect(
        submissionsApprovalRouteMaterializer.materialize,
      ).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  const createSubmittedSubmissionForApproval = () => ({
    id: 1n,
    documentDefinitionId: 10n,
    createdById: 2n,
    submittedById: 2n,
    applicantDepartmentId: 1n,
    status: 'submitted',
    currentAppliedApprovalPolicyId: 100n,
    submittedAt: new Date('2026-01-01T00:00:00.000Z'),
    approvedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    currentAppliedApprovalPolicy: {
      id: 100n,
      submissionId: 1n,
      approvalPolicyId: 200n,
      position: 1,
      status: 'pending',
      approvedAt: null,
      rejectedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      approvalPolicy: {
        id: 200n,
        documentDefinitionId: 10n,
        name: 'Manager approval',
        condition: null,
        operator: 'all',
        position: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
      requirements: [
        {
          id: 300n,
          appliedApprovalPolicyId: 100n,
          approvalRequirementId: 400n,
          status: 'pending',
          requiredCount: 1,
          approvedCount: 0,
          approvedAt: null,
          rejectedAt: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
          approvers: [
            {
              id: 500n,
              appliedApprovalRequirementId: 300n,
              userId: 3n,
              status: 'pending',
              decidedAt: null,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              deletedAt: null,
            },
          ],
        },
      ],
    },
  });

  describe('approve', () => {
    const decidedAt = new Date('2026-01-02T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(decidedAt);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('approves current approver step and completes final submission', async () => {
      const submission = createSubmittedSubmissionForApproval();
      tx.submission.findUnique.mockResolvedValue(submission);
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.findUniqueOrThrow.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        approvedCount: 1,
      });
      tx.appliedApprovalRequirement.update.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        status: 'approved',
        approvedCount: 1,
        approvedAt: decidedAt,
      });
      tx.appliedApprovalPolicy.findFirst.mockResolvedValue(null);
      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'approved',
        approvedAt: decidedAt,
        currentAppliedApprovalPolicyId: null,
      });

      const result = await service.approve(1n, 3n, {
        comment: 'Looks good',
      });

      expect(tx.approver.updateMany).toHaveBeenCalledWith({
        where: {
          id: 500n,
          status: 'pending',
          appliedApprovalRequirement: {
            status: 'pending',
            appliedApprovalPolicy: {
              id: 100n,
              status: 'pending',
              submission: {
                id: 1n,
                status: 'submitted',
                currentAppliedApprovalPolicyId: 100n,
              },
            },
          },
        },
        data: {
          status: 'approved',
          decidedAt,
        },
      });
      expect(tx.approvalDecision.create).toHaveBeenCalledWith({
        data: {
          approverId: 500n,
          actorId: 3n,
          decision: 'approved',
          comment: 'Looks good',
          decidedAt,
        },
      });
      expect(tx.appliedApprovalRequirement.updateMany).toHaveBeenCalledWith({
        where: {
          id: 300n,
          status: 'pending',
          approvedCount: {
            lt: 1,
          },
        },
        data: {
          approvedCount: {
            increment: 1,
          },
        },
      });
      expect(
        tx.appliedApprovalRequirement.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: 300n },
      });
      expect(tx.appliedApprovalRequirement.update).toHaveBeenCalledWith({
        where: { id: 300n },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
        },
      });
      expect(tx.appliedApprovalPolicy.update).toHaveBeenCalledWith({
        where: { id: 100n },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
        },
      });
      expect(tx.submission.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
          currentAppliedApprovalPolicyId: null,
        },
      });
      expect(result).toMatchObject({
        status: 'approved',
      });
    });

    it('moves to the next applied approval policy when it exists', async () => {
      const submission = createSubmittedSubmissionForApproval();
      tx.submission.findUnique.mockResolvedValue(submission);
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.findUniqueOrThrow.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        approvedCount: 1,
      });
      tx.appliedApprovalRequirement.update.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        status: 'approved',
        approvedCount: 1,
      });
      tx.appliedApprovalPolicy.findFirst.mockResolvedValue({
        id: 101n,
      });
      tx.submission.update.mockResolvedValue({
        ...submission,
        currentAppliedApprovalPolicyId: 101n,
      });

      await service.approve(1n, 3n);

      expect(tx.submission.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: {
          currentAppliedApprovalPolicyId: 101n,
        },
      });
    });

    it('uses incremented approved count to approve requirement', async () => {
      const submission = createSubmittedSubmissionForApproval();
      submission.currentAppliedApprovalPolicy.requirements[0].requiredCount = 2;
      submission.currentAppliedApprovalPolicy.requirements[0].approvedCount = 0;
      tx.submission.findUnique.mockResolvedValue(submission);
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.findUniqueOrThrow.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        approvedCount: 2,
      });
      tx.appliedApprovalRequirement.update.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        status: 'approved',
        approvedCount: 2,
        approvedAt: decidedAt,
      });
      tx.appliedApprovalPolicy.findFirst.mockResolvedValue(null);
      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'approved',
        approvedAt: decidedAt,
        currentAppliedApprovalPolicyId: null,
      });

      await service.approve(1n, 3n);

      expect(tx.appliedApprovalRequirement.updateMany).toHaveBeenCalledWith({
        where: {
          id: 300n,
          status: 'pending',
          approvedCount: {
            lt: 2,
          },
        },
        data: {
          approvedCount: {
            increment: 1,
          },
        },
      });
      expect(tx.appliedApprovalRequirement.update).toHaveBeenCalledWith({
        where: { id: 300n },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
        },
      });
      expect(tx.appliedApprovalPolicy.update).toHaveBeenCalledWith({
        where: { id: 100n },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
        },
      });
    });

    it('skips remaining pending approvers when any approval policy is approved', async () => {
      const submission = createSubmittedSubmissionForApproval();
      submission.currentAppliedApprovalPolicy.approvalPolicy.operator = 'any';
      submission.currentAppliedApprovalPolicy.requirements[0].approvers.push({
        id: 501n,
        appliedApprovalRequirementId: 300n,
        userId: 4n,
        status: 'pending',
        decidedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      });
      tx.submission.findUnique.mockResolvedValue(submission);
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.findUniqueOrThrow.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        status: 'pending',
        approvedCount: 1,
      });
      tx.appliedApprovalRequirement.update.mockResolvedValue({
        ...submission.currentAppliedApprovalPolicy.requirements[0],
        status: 'approved',
        approvedCount: 1,
        approvedAt: decidedAt,
      });
      tx.appliedApprovalPolicy.findFirst.mockResolvedValue(null);
      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'approved',
        approvedAt: decidedAt,
        currentAppliedApprovalPolicyId: null,
      });

      await service.approve(1n, 3n);

      expect(tx.approver.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          status: 'pending',
          appliedApprovalRequirement: {
            appliedApprovalPolicyId: 100n,
          },
        },
        data: {
          status: 'skipped',
        },
      });
    });

    it('throws ForbiddenException when user is not current approver', async () => {
      tx.submission.findUnique.mockResolvedValue(
        createSubmittedSubmissionForApproval(),
      );

      await expect(service.approve(1n, 999n)).rejects.toThrow(
        ForbiddenException,
      );

      expect(tx.approver.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when approval is already decided', async () => {
      tx.submission.findUnique.mockResolvedValue(
        createSubmittedSubmissionForApproval(),
      );
      tx.approver.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve(1n, 3n)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.approvalDecision.create).not.toHaveBeenCalled();
      expect(tx.appliedApprovalRequirement.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when approval requirement is already satisfied', async () => {
      tx.submission.findUnique.mockResolvedValue(
        createSubmittedSubmissionForApproval(),
      );
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.appliedApprovalRequirement.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve(1n, 3n)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.approvalDecision.create).not.toHaveBeenCalled();
      expect(
        tx.appliedApprovalRequirement.findUniqueOrThrow,
      ).not.toHaveBeenCalled();
      expect(tx.appliedApprovalRequirement.update).not.toHaveBeenCalled();
      expect(tx.appliedApprovalPolicy.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission status is not submitted', async () => {
      tx.submission.findUnique.mockResolvedValue({
        ...createSubmittedSubmissionForApproval(),
        status: 'approved',
      });

      await expect(service.approve(1n, 3n)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.approver.update).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    const decidedAt = new Date('2026-01-02T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(decidedAt);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects current approver step and rejects submission', async () => {
      const submission = createSubmittedSubmissionForApproval();
      tx.submission.findUnique.mockResolvedValue(submission);
      tx.approver.updateMany.mockResolvedValue({ count: 1 });
      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'rejected',
        rejectedAt: decidedAt,
        currentAppliedApprovalPolicyId: null,
      });

      const result = await service.reject(1n, 3n, {
        comment: 'Please fix amount',
      });

      expect(tx.approver.updateMany).toHaveBeenCalledWith({
        where: {
          id: 500n,
          status: 'pending',
          appliedApprovalRequirement: {
            status: 'pending',
            appliedApprovalPolicy: {
              id: 100n,
              status: 'pending',
              submission: {
                id: 1n,
                status: 'submitted',
                currentAppliedApprovalPolicyId: 100n,
              },
            },
          },
        },
        data: {
          status: 'rejected',
          decidedAt,
        },
      });
      expect(tx.approvalDecision.create).toHaveBeenCalledWith({
        data: {
          approverId: 500n,
          actorId: 3n,
          decision: 'rejected',
          comment: 'Please fix amount',
          decidedAt,
        },
      });
      expect(tx.appliedApprovalRequirement.update).toHaveBeenCalledWith({
        where: { id: 300n },
        data: {
          status: 'rejected',
          rejectedAt: decidedAt,
        },
      });
      expect(tx.appliedApprovalPolicy.update).toHaveBeenCalledWith({
        where: { id: 100n },
        data: {
          status: 'rejected',
          rejectedAt: decidedAt,
        },
      });
      expect(result.status).toBe('rejected');
    });

    it('throws ForbiddenException when user is not current approver', async () => {
      tx.submission.findUnique.mockResolvedValue(
        createSubmittedSubmissionForApproval(),
      );

      await expect(service.reject(1n, 999n)).rejects.toThrow(
        ForbiddenException,
      );

      expect(tx.approver.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when rejection is already decided', async () => {
      tx.submission.findUnique.mockResolvedValue(
        createSubmittedSubmissionForApproval(),
      );
      tx.approver.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reject(1n, 3n)).rejects.toThrow(BadRequestException);

      expect(tx.approvalDecision.create).not.toHaveBeenCalled();
      expect(tx.appliedApprovalRequirement.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission status is not submitted', async () => {
      tx.submission.findUnique.mockResolvedValue({
        ...createSubmittedSubmissionForApproval(),
        status: 'rejected',
      });

      await expect(service.reject(1n, 3n)).rejects.toThrow(BadRequestException);

      expect(tx.approver.update).not.toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    const withdrawnAt = new Date('2026-01-02T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(withdrawnAt);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('withdraws submitted submission by applicant', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        status: 'submitted',
        submittedById: 100n,
      });
      tx.submission.update.mockResolvedValue({
        ...submission,
        status: 'withdrawn',
        withdrawnAt,
      });

      const result = await service.withdraw(111n, 100n);

      expect(tx.approver.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          appliedApprovalRequirement: {
            appliedApprovalPolicy: {
              submissionId: 111n,
            },
          },
        },
        data: {
          status: 'skipped',
        },
      });
      expect(tx.submission.update).toHaveBeenCalledWith({
        where: { id: 111n },
        data: {
          status: 'withdrawn',
          withdrawnAt,
          currentAppliedApprovalPolicyId: null,
        },
      });
      expect(result.status).toBe('withdrawn');
    });

    it('throws ForbiddenException when user is not applicant', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        status: 'submitted',
        submittedById: 100n,
      });

      await expect(service.withdraw(111n, 999n)).rejects.toThrow(
        ForbiddenException,
      );

      expect(tx.submission.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when submission status is not submitted', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        ...submission,
        status: 'draft',
        submittedById: 100n,
      });

      await expect(service.withdraw(111n, 100n)).rejects.toThrow(
        BadRequestException,
      );

      expect(tx.submission.update).not.toHaveBeenCalled();
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
            documentId: 20n,
            name: '経費申請',
            version: 1,
          },
          createdBy: {
            id: 2n,
            name: '申請者',
            email: 'applicant@example.com',
          },
          applicantDepartment: {
            id: 30n,
            name: 'Engineering',
          },
          currentAppliedApprovalPolicy: {
            id: 40n,
            approvalPolicy: {
              id: 50n,
              name: 'Manager approval',
              operator: 'all',
              position: 1,
            },
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
          documentDefinition: {
            select: {
              id: true,
              documentId: true,
              name: true,
              version: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          applicantDepartment: {
            select: {
              id: true,
              name: true,
            },
          },
          currentAppliedApprovalPolicy: {
            select: {
              id: true,
              approvalPolicy: {
                select: {
                  id: true,
                  name: true,
                  operator: true,
                  position: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: 'asc',
        },
      });
    });
  });
});
