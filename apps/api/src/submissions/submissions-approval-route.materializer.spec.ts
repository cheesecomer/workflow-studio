import { BadRequestException } from '@nestjs/common';
import { SubmissionsApprovalRouteMaterializer } from './submissions-approval-route.materializer';
import { SubmissionWithFieldGroupRows } from './types/submission-with-field-group-rows';
import { DocumentDefinitionWithApprovalPolicies } from './types/document-definition-with-approval-policies';

describe('SubmissionsApprovalRouteMaterializer', () => {
  let materializer: SubmissionsApprovalRouteMaterializer;

  beforeEach(() => {
    materializer = new SubmissionsApprovalRouteMaterializer();
  });

  const submittedAt = new Date('2026-01-01T00:00:00.000Z');

  const createSubmission: () => SubmissionWithFieldGroupRows = () => ({
    id: 1n,
    documentDefinitionId: 1n,
    createdById: 1n,
    submittedById: null,
    applicantDepartmentId: 10n,
    status: 'draft',
    currentAppliedApprovalPolicyId: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    fieldGroupRows: [
      {
        id: 100n,
        submissionId: 1n,
        fieldGroupDefinitionId: 1000n,
        position: 1,
        createdAt: submittedAt,
        updatedAt: submittedAt,
        fieldValues: [
          {
            id: 10000n,
            submissionFieldGroupRowId: 100n,
            fieldDefinitionId: 5000n,
            value: 3000,
            createdAt: submittedAt,
            updatedAt: submittedAt,
          },
        ],
      },
    ],
  });

  const createDocumentDefinition: () => DocumentDefinitionWithApprovalPolicies =
    () => ({
      id: 1n,
      documentId: 1n,
      version: 1,
      name: 'Expense',
      status: 'published',
      createdAt: submittedAt,
      updatedAt: submittedAt,
      deletedAt: null,
      publishedAt: submittedAt,
      publishedById: 1n,
      fieldGroupDefinitions: [],
      approvalPolicies: [
        {
          id: 10n,
          documentDefinitionId: 1n,
          name: 'Manager approval',
          condition: null,
          operator: 'all',
          position: 1,
          createdAt: submittedAt,
          updatedAt: submittedAt,
          deletedAt: null,
          requirements: [
            {
              id: 100n,
              approvalPolicyId: 10n,
              name: 'Manager',
              departmentScope: 'same_department',
              positionOperator: 'gte',
              positionId: 1000n,
              upperPositionId: null,
              requiredCount: 1,
              createdAt: submittedAt,
              updatedAt: submittedAt,
              deletedAt: null,
            },
          ],
        },
      ],
    });

  type DepartmentMembershipFindManyArgs = {
    where: {
      departmentId: {
        in: bigint[];
      };
      joinedAt: {
        lte: Date;
      };
      OR: Array<{ leftAt: null } | { leftAt: { gt: Date } }>;
    };
  };

  const createTx = () => ({
    appliedApprovalPolicy: {
      create: jest.fn().mockResolvedValue({ id: 10000n }),
    },
    appliedApprovalRequirement: {
      create: jest.fn().mockResolvedValue({ id: 20000n }),
    },
    approver: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    department: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    position: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1000n,
        rank: 10,
      }),
      findMany: jest.fn().mockResolvedValue([{ id: 1000n }]),
    },
    departmentMembership: {
      findMany: jest
        .fn<Promise<{ userId: bigint }[]>, [DepartmentMembershipFindManyArgs]>()
        .mockResolvedValue([{ userId: 2n }]),
    },
  });

  const applicantDepartmentId = 10n;

  it('materializes applicable approval policy, requirement, and approver', async () => {
    const tx = createTx();

    const result = await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition: createDocumentDefinition(),
      applicantDepartmentId,
      submittedAt,
    });

    expect(result).toBe(10000n);

    expect(tx.appliedApprovalPolicy.create).toHaveBeenCalledWith({
      data: {
        submissionId: 1n,
        approvalPolicyId: 10n,
        position: 1,
        status: 'pending',
      },
    });

    expect(tx.appliedApprovalRequirement.create).toHaveBeenCalledWith({
      data: {
        appliedApprovalPolicyId: 10000n,
        approvalRequirementId: 100n,
        status: 'pending',
        requiredCount: 1,
        approvedCount: 0,
      },
    });

    expect(tx.departmentMembership.findMany).toHaveBeenCalledWith({
      where: {
        departmentId: { in: [10n] },
        positionId: { in: [1000n] },
        joinedAt: { lte: submittedAt },
        OR: [{ leftAt: null }, { leftAt: { gt: submittedAt } }],
        deletedAt: null,
        user: {
          deletedAt: null,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    expect(tx.approver.createMany).toHaveBeenCalledWith({
      data: [
        {
          appliedApprovalRequirementId: 20000n,
          userId: 2n,
          status: 'pending',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not materialize approval policy when condition does not match', async () => {
    const tx = createTx();
    const documentDefinition = createDocumentDefinition();

    documentDefinition.approvalPolicies[0].condition = {
      fieldDefinitionId: '5000',
      operator: 'gte',
      value: 5000,
    };

    const result = await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition,
      applicantDepartmentId,
      submittedAt,
    });

    expect(result).toBeNull();
    expect(tx.appliedApprovalPolicy.create).not.toHaveBeenCalled();
    expect(tx.appliedApprovalRequirement.create).not.toHaveBeenCalled();
    expect(tx.approver.createMany).not.toHaveBeenCalled();
  });

  it('renumbers only applicable approval policies', async () => {
    const tx = createTx();

    tx.appliedApprovalPolicy.create
      .mockResolvedValueOnce({ id: 10000n })
      .mockResolvedValueOnce({ id: 10001n });

    const documentDefinition = createDocumentDefinition();

    documentDefinition.approvalPolicies = [
      {
        ...documentDefinition.approvalPolicies[0],
        id: 10n,
        position: 1,
        condition: {
          fieldDefinitionId: '5000',
          operator: 'gte',
          value: 5000,
        },
      },
      {
        ...documentDefinition.approvalPolicies[0],
        id: 20n,
        position: 2,
        condition: null,
      },
      {
        ...documentDefinition.approvalPolicies[0],
        id: 30n,
        position: 3,
        condition: {
          fieldDefinitionId: '5000',
          operator: 'gte',
          value: 3000,
        },
      },
    ];

    const result = await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition,
      applicantDepartmentId,
      submittedAt,
    });

    expect(result).toBe(10000n);

    expect(tx.appliedApprovalPolicy.create).toHaveBeenNthCalledWith(1, {
      data: {
        submissionId: 1n,
        approvalPolicyId: 20n,
        position: 1,
        status: 'pending',
      },
    });

    expect(tx.appliedApprovalPolicy.create).toHaveBeenNthCalledWith(2, {
      data: {
        submissionId: 1n,
        approvalPolicyId: 30n,
        position: 2,
        status: 'pending',
      },
    });
  });

  it('uses only active department memberships at submittedAt', async () => {
    const tx = createTx();

    await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition: createDocumentDefinition(),
      applicantDepartmentId,
      submittedAt,
    });

    const args = tx.departmentMembership.findMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.where.joinedAt).toEqual({ lte: submittedAt });
    expect(args?.where.OR).toEqual([
      { leftAt: null },
      { leftAt: { gt: submittedAt } },
    ]);
  });

  it('throws BadRequestException when approvers are fewer than requiredCount', async () => {
    const tx = createTx();
    tx.departmentMembership.findMany.mockResolvedValue([]);

    await expect(
      materializer.materialize(tx as never, {
        submission: createSubmission(),
        documentDefinition: createDocumentDefinition(),
        applicantDepartmentId,
        submittedAt,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('resolves same_tree as applicant department and ancestor departments', async () => {
    const tx = createTx();
    const documentDefinition = createDocumentDefinition();

    documentDefinition.approvalPolicies[0].requirements[0].departmentScope =
      'same_tree';

    tx.department.findFirst
      .mockResolvedValueOnce({
        id: 10n,
        parentId: 9n,
      })
      .mockResolvedValueOnce({
        id: 9n,
        parentId: null,
      });

    await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition,
      applicantDepartmentId,
      submittedAt,
    });

    const args = tx.departmentMembership.findMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.where.departmentId).toEqual({
      in: [10n, 9n],
    });
  });

  it('resolves entire_company as all departments', async () => {
    const tx = createTx();
    const documentDefinition = createDocumentDefinition();

    documentDefinition.approvalPolicies[0].requirements[0].departmentScope =
      'entire_company';

    tx.department.findMany.mockResolvedValue([{ id: 10n }, { id: 20n }]);

    await materializer.materialize(tx as never, {
      submission: createSubmission(),
      documentDefinition,
      applicantDepartmentId,
      submittedAt,
    });

    const args = tx.departmentMembership.findMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.where.departmentId).toEqual({
      in: [10n, 20n],
    });
  });
});
