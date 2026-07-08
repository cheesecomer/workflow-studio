import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsSubmitValidator } from './submissions-submit.validator';
import { SubmissionsApprovalRouteMaterializer } from './submissions-approval-route.materializer';
import { Prisma, SubmissionStatus } from '@workflow-studio/db';

const SUBMISSION_STATUSES = Object.values(SubmissionStatus);

function isSubmissionStatus(status: string): status is SubmissionStatus {
  return SUBMISSION_STATUSES.includes(status as SubmissionStatus);
}

function parseSubmissionStatus(status?: string) {
  if (!status) {
    return undefined;
  }

  if (!isSubmissionStatus(status)) {
    throw new BadRequestException('Invalid submission status');
  }

  return status;
}

type PaginationQuery = {
  page?: string;
  limit?: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(value: string | undefined, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }

  return parsed;
}

function parsePaginationQuery(query: PaginationQuery = {}) {
  const page = parsePositiveInteger(query.page, 'page') ?? DEFAULT_PAGE;
  const limit = parsePositiveInteger(query.limit, 'limit') ?? DEFAULT_LIMIT;

  if (limit > MAX_LIMIT) {
    throw new BadRequestException('Invalid limit');
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

type SubmissionAvailableAction =
  | 'submit'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'withdraw';

type SubmissionForAvailableActions = {
  status: string;
  createdById: bigint;
  submittedById?: bigint | null;
  currentAppliedApprovalPolicyId?: bigint | null;
  appliedApprovalPolicies?: {
    id: bigint;
    status: string;
    requirements: {
      status: string;
      approvers: {
        userId: bigint;
        status: string;
      }[];
    }[];
  }[];
};

type SubmissionActivityActor = {
  id: bigint;
  name?: string;
  email?: string;
};

type SubmissionActivity = {
  type:
    | 'created'
    | 'submitted'
    | 'approval_decision'
    | 'approved'
    | 'rejected'
    | 'withdrawn';
  occurredAt: Date;
  actor?: SubmissionActivityActor;
  decision?: 'approved' | 'rejected';
  comment?: string | null;
  approvalPolicy?: {
    id: bigint;
    name: string;
    position: number;
  };
  approvalRequirement?: {
    id: bigint;
    name: string;
  };
};

type SubmissionForActivities = {
  createdAt: Date;
  createdById: bigint;
  createdBy?: SubmissionActivityActor;
  submittedAt?: Date | null;
  submittedById?: bigint | null;
  submittedBy?: SubmissionActivityActor | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  withdrawnAt?: Date | null;
  appliedApprovalPolicies?: {
    id: bigint;
    position: number;
    approvalPolicy: {
      id: bigint;
      name: string;
    };
    requirements: {
      approvalRequirement: {
        id: bigint;
        name: string;
      };
      approvers: {
        decisions?: {
          decision: 'approved' | 'rejected';
          comment?: string | null;
          decidedAt: Date;
          actor: SubmissionActivityActor;
        }[];
      }[];
    }[];
  }[];
};

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionsSubmitValidator: SubmissionsSubmitValidator,
    private readonly submissionsApprovalRouteMaterializer: SubmissionsApprovalRouteMaterializer,
  ) {}

  async create(createSubmissionDto: CreateSubmissionDto, createdById: bigint) {
    const { fieldGroupRows, ...submissionData } = createSubmissionDto;
    const groupIds = fieldGroupRows.map((row) => row.fieldGroupDefinitionId);
    const uniqueGroupIds = [...new Set(groupIds)];

    const groups = await this.prisma.fieldGroupDefinition.findMany({
      where: {
        id: { in: uniqueGroupIds },
        documentDefinitionId: submissionData.documentDefinitionId,
      },
      include: {
        fieldDefinitions: {
          select: { id: true },
        },
      },
    });

    if (groups.length !== uniqueGroupIds.length) {
      throw new BadRequestException('Invalid field group definition');
    }

    const fieldDefinitionIdsByGroupId = new Map(
      groups.map((group) => [
        group.id.toString(),
        new Set(group.fieldDefinitions.map((field) => field.id.toString())),
      ]),
    );

    for (const { fieldValues, ...fieldGroupRow } of fieldGroupRows) {
      const allowedFieldIds = fieldDefinitionIdsByGroupId.get(
        fieldGroupRow.fieldGroupDefinitionId.toString(),
      );

      if (
        !allowedFieldIds ||
        fieldValues.some(
          (fieldValue) =>
            !allowedFieldIds.has(fieldValue.fieldDefinitionId.toString()),
        )
      ) {
        throw new BadRequestException('Invalid field definition');
      }
    }

    const submissionId = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          ...submissionData,
          createdById,
          status: 'draft',
        },
      });

      for (const [
        i,
        { fieldValues, ...fieldGroupRow },
      ] of fieldGroupRows.entries()) {
        await tx.submissionFieldGroupRow.create({
          data: {
            ...fieldGroupRow,
            submissionId: submission.id,
            position: i + 1,
            fieldValues: {
              createMany: {
                data: fieldValues,
              },
            },
          },
        });
      }

      return submission.id;
    });

    return await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        fieldGroupRows: {
          include: {
            fieldValues: true,
          },
        },
      },
    });
  }

  async findAll(
    createdById: bigint,
    status?: string,
    paginationQuery: PaginationQuery = {},
  ) {
    const submissionStatus = parseSubmissionStatus(status);
    const { page, limit, skip } = parsePaginationQuery(paginationQuery);
    const where: Prisma.SubmissionWhereInput = {
      createdById,
    };

    if (submissionStatus) {
      where.status = submissionStatus;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        include: {
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
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: bigint, currentUserId: bigint) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id,
        OR: [
          {
            createdById: currentUserId,
          },
          {
            appliedApprovalPolicies: {
              some: {
                requirements: {
                  some: {
                    approvers: {
                      some: {
                        userId: currentUserId,
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

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return {
      ...submission,
      availableActions: this.buildAvailableActions(submission, currentUserId),
      activities: this.buildActivities(submission),
    };
  }

  private buildActivities(submission: SubmissionForActivities) {
    const activities: SubmissionActivity[] = [
      {
        type: 'created',
        occurredAt: submission.createdAt,
        actor:
          submission.createdBy ?? this.buildActorFromId(submission.createdById),
      },
    ];

    if (submission.submittedAt) {
      activities.push({
        type: 'submitted',
        occurredAt: submission.submittedAt,
        actor:
          submission.submittedBy ??
          this.buildActorFromId(submission.submittedById),
      });
    }

    for (const policy of submission.appliedApprovalPolicies ?? []) {
      for (const requirement of policy.requirements) {
        for (const approver of requirement.approvers) {
          for (const decision of approver.decisions ?? []) {
            activities.push({
              type: 'approval_decision',
              occurredAt: decision.decidedAt,
              actor: decision.actor,
              decision: decision.decision,
              comment: decision.comment,
              approvalPolicy: {
                id: policy.approvalPolicy.id,
                name: policy.approvalPolicy.name,
                position: policy.position,
              },
              approvalRequirement: {
                id: requirement.approvalRequirement.id,
                name: requirement.approvalRequirement.name,
              },
            });
          }
        }
      }
    }

    if (submission.approvedAt) {
      activities.push({
        type: 'approved',
        occurredAt: submission.approvedAt,
      });
    }

    if (submission.rejectedAt) {
      activities.push({
        type: 'rejected',
        occurredAt: submission.rejectedAt,
      });
    }

    if (submission.withdrawnAt) {
      activities.push({
        type: 'withdrawn',
        occurredAt: submission.withdrawnAt,
        actor:
          submission.submittedBy ??
          this.buildActorFromId(submission.submittedById),
      });
    }

    return activities.sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
  }

  private buildActorFromId(id?: bigint | null) {
    return id ? { id } : undefined;
  }

  private buildAvailableActions(
    submission: SubmissionForAvailableActions,
    currentUserId: bigint,
  ): SubmissionAvailableAction[] {
    const actions: SubmissionAvailableAction[] = [];

    if (
      submission.status === SubmissionStatus.draft &&
      submission.createdById === currentUserId
    ) {
      actions.push('submit', 'edit', 'delete');
    }

    if (submission.status !== SubmissionStatus.submitted) {
      return actions;
    }

    if (submission.submittedById === currentUserId) {
      actions.push('withdraw');
    }

    if (this.isCurrentApprover(submission, currentUserId)) {
      actions.push('approve', 'reject');
    }

    return actions;
  }

  private isCurrentApprover(
    submission: SubmissionForAvailableActions,
    currentUserId: bigint,
  ) {
    return (
      submission.appliedApprovalPolicies?.some((policy) => {
        const isCurrentPolicy =
          submission.currentAppliedApprovalPolicyId != null &&
          policy.id === submission.currentAppliedApprovalPolicyId;

        return (
          isCurrentPolicy &&
          policy.status === 'pending' &&
          policy.requirements.some(
            (requirement) =>
              requirement.status === 'pending' &&
              requirement.approvers.some(
                (approver) =>
                  approver.userId === currentUserId &&
                  approver.status === 'pending',
              ),
          )
        );
      }) ?? false
    );
  }

  async update(
    id: bigint,
    updateSubmissionDto: UpdateSubmissionDto,
    currentUserId: bigint,
  ) {
    const { fieldGroupRows, ...submissionData } = updateSubmissionDto;
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Invalid submission status');
    }

    if (submission.createdById !== currentUserId) {
      throw new ForbiddenException('Forbidden');
    }

    const groupIds = fieldGroupRows.map((row) => row.fieldGroupDefinitionId);
    const uniqueGroupIds = [...new Set(groupIds)];
    const groups = await this.prisma.fieldGroupDefinition.findMany({
      where: {
        id: { in: uniqueGroupIds },
        documentDefinitionId: submission.documentDefinitionId,
      },
      include: {
        fieldDefinitions: {
          select: { id: true },
        },
      },
    });

    if (groups.length !== uniqueGroupIds.length) {
      throw new BadRequestException('Invalid field group definition');
    }

    const fieldDefinitionIdsByGroupId = new Map(
      groups.map((group) => [
        group.id.toString(),
        new Set(group.fieldDefinitions.map((field) => field.id.toString())),
      ]),
    );

    for (const { fieldValues, ...fieldGroupRow } of fieldGroupRows) {
      const allowedFieldIds = fieldDefinitionIdsByGroupId.get(
        fieldGroupRow.fieldGroupDefinitionId.toString(),
      );

      if (
        !allowedFieldIds ||
        fieldValues.some(
          (fieldValue) =>
            !allowedFieldIds.has(fieldValue.fieldDefinitionId.toString()),
        )
      ) {
        throw new BadRequestException('Invalid field definition');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.submissionFieldValue.deleteMany({
        where: {
          submissionFieldGroupRow: {
            submissionId: id,
          },
        },
      });

      await tx.submissionFieldGroupRow.deleteMany({
        where: { submissionId: id },
      });

      await tx.submission.update({
        where: { id },
        data: {
          ...submissionData,
        },
      });

      for (const [
        i,
        { fieldValues, ...fieldGroupRow },
      ] of fieldGroupRows.entries()) {
        await tx.submissionFieldGroupRow.create({
          data: {
            ...fieldGroupRow,
            submissionId: submission.id,
            position: i + 1,
            fieldValues: {
              createMany: {
                data: fieldValues,
              },
            },
          },
        });
      }
    });

    return await this.prisma.submission.findUnique({
      where: { id: submission.id },
      include: {
        fieldGroupRows: {
          include: {
            fieldValues: true,
          },
        },
      },
    });
  }

  async remove(id: bigint, currentUserId: bigint) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'draft') {
      throw new BadRequestException('Invalid submission status');
    }

    if (submission.createdById !== currentUserId) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.submissionFieldValue.deleteMany({
        where: {
          submissionFieldGroupRow: {
            submissionId: id,
          },
        },
      });

      await tx.submissionFieldGroupRow.deleteMany({
        where: { submissionId: id },
      });

      return await tx.submission.delete({
        where: { id },
      });
    });
  }

  async submit(id: bigint, submittedById: bigint) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        fieldGroupRows: {
          include: {
            fieldValues: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status != 'draft') {
      throw new BadRequestException('Invalid submission status');
    }

    if (submission.createdById !== submittedById) {
      throw new ForbiddenException('Forbidden');
    }

    const documentDefinition = await this.prisma.documentDefinition.findUnique({
      where: { id: submission.documentDefinitionId },
      include: {
        fieldGroupDefinitions: {
          include: {
            fieldDefinitions: true,
          },
        },
        approvalPolicies: {
          include: {
            requirements: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!documentDefinition) {
      throw new NotFoundException('Document definition not found');
    }

    this.submissionsSubmitValidator.validate(submission, documentDefinition);
    return await this.prisma.$transaction(async (tx) => {
      const submittedAt = new Date();
      const applicantDepartmentId = await this.resolveApplicantDepartmentId(
        tx,
        { submittedById, submittedAt },
      );
      const firstAppliedApprovalPolicyId =
        await this.submissionsApprovalRouteMaterializer.materialize(tx, {
          submission,
          documentDefinition,
          applicantDepartmentId,
          submittedAt,
        });

      return tx.submission.update({
        where: { id },
        data: {
          status: 'submitted',
          submittedById,
          submittedAt,
          currentAppliedApprovalPolicyId: firstAppliedApprovalPolicyId,
          applicantDepartmentId: applicantDepartmentId,
        },
      });
    });
  }

  async approve(
    id: bigint,
    actorId: bigint,
    approveSubmissionDto: ApproveSubmissionDto = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const decidedAt = new Date();
      const submission = await this.findSubmissionForApprovalAction(tx, id);

      if (submission.status !== 'submitted') {
        throw new BadRequestException('Invalid submission status');
      }

      const currentPolicy = submission.currentAppliedApprovalPolicy;

      if (!currentPolicy) {
        throw new BadRequestException('Current approval policy not found');
      }

      const currentApprover = this.findCurrentApprover(currentPolicy, actorId);

      if (!currentApprover) {
        throw new ForbiddenException('Forbidden');
      }

      const approverUpdate = await tx.approver.updateMany({
        where: this.buildCurrentApproverUpdateWhere({
          id,
          currentAppliedApprovalPolicyId: currentPolicy.id,
          currentApproverId: currentApprover.approver.id,
        }),
        data: {
          status: 'approved',
          decidedAt,
        },
      });

      if (approverUpdate.count !== 1) {
        throw new BadRequestException('Approval already decided');
      }

      const requirementUpdate = await tx.appliedApprovalRequirement.updateMany({
        where: {
          id: currentApprover.requirement.id,
          status: 'pending',
          approvedCount: {
            lt: currentApprover.requirement.requiredCount,
          },
        },
        data: {
          approvedCount: {
            increment: 1,
          },
        },
      });

      if (requirementUpdate.count !== 1) {
        throw new BadRequestException('Approval already decided');
      }

      const approvedRequirement =
        await tx.appliedApprovalRequirement.findUniqueOrThrow({
          where: { id: currentApprover.requirement.id },
        });

      const currentRequirement =
        approvedRequirement.approvedCount >= approvedRequirement.requiredCount
          ? await tx.appliedApprovalRequirement.update({
              where: { id: approvedRequirement.id },
              data: {
                status: 'approved',
                approvedAt: decidedAt,
              },
            })
          : approvedRequirement;

      await tx.approvalDecision.create({
        data: {
          approverId: currentApprover.approver.id,
          actorId,
          decision: 'approved',
          comment: approveSubmissionDto.comment,
          decidedAt,
        },
      });

      const requirements = currentPolicy.requirements.map((requirement) =>
        requirement.id === currentRequirement.id
          ? currentRequirement
          : requirement,
      );

      if (!this.isApprovalPolicyApproved(currentPolicy, requirements)) {
        return tx.submission.findUnique({ where: { id } });
      }

      await tx.appliedApprovalPolicy.update({
        where: { id: currentPolicy.id },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
        },
      });

      if (currentPolicy.approvalPolicy.operator === 'any') {
        await tx.approver.updateMany({
          where: {
            status: 'pending',
            appliedApprovalRequirement: {
              appliedApprovalPolicyId: currentPolicy.id,
            },
          },
          data: {
            status: 'skipped',
          },
        });
      }

      const nextAppliedPolicy = await tx.appliedApprovalPolicy.findFirst({
        where: {
          submissionId: id,
          position: {
            gt: currentPolicy.position,
          },
          status: 'pending',
        },
        orderBy: {
          position: 'asc',
        },
      });

      if (nextAppliedPolicy) {
        return tx.submission.update({
          where: { id },
          data: {
            currentAppliedApprovalPolicyId: nextAppliedPolicy.id,
          },
        });
      }

      return tx.submission.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: decidedAt,
          currentAppliedApprovalPolicyId: null,
        },
      });
    });
  }

  async reject(
    id: bigint,
    actorId: bigint,
    rejectSubmissionDto: RejectSubmissionDto = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const decidedAt = new Date();
      const submission = await this.findSubmissionForApprovalAction(tx, id);

      if (submission.status !== 'submitted') {
        throw new BadRequestException('Invalid submission status');
      }

      const currentPolicy = submission.currentAppliedApprovalPolicy;

      if (!currentPolicy) {
        throw new BadRequestException('Current approval policy not found');
      }

      const currentApprover = this.findCurrentApprover(currentPolicy, actorId);

      if (!currentApprover) {
        throw new ForbiddenException('Forbidden');
      }

      const approverUpdate = await tx.approver.updateMany({
        where: this.buildCurrentApproverUpdateWhere({
          id,
          currentAppliedApprovalPolicyId: currentPolicy.id,
          currentApproverId: currentApprover.approver.id,
        }),
        data: {
          status: 'rejected',
          decidedAt,
        },
      });

      if (approverUpdate.count !== 1) {
        throw new BadRequestException('Approval already decided');
      }

      await tx.approvalDecision.create({
        data: {
          approverId: currentApprover.approver.id,
          actorId,
          decision: 'rejected',
          comment: rejectSubmissionDto.comment,
          decidedAt,
        },
      });

      await tx.appliedApprovalRequirement.update({
        where: { id: currentApprover.requirement.id },
        data: {
          status: 'rejected',
          rejectedAt: decidedAt,
        },
      });

      await tx.appliedApprovalPolicy.update({
        where: { id: currentPolicy.id },
        data: {
          status: 'rejected',
          rejectedAt: decidedAt,
        },
      });

      return tx.submission.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectedAt: decidedAt,
          currentAppliedApprovalPolicyId: null,
        },
      });
    });
  }

  async withdraw(id: bigint, actorId: bigint) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'submitted') {
      throw new BadRequestException('Invalid submission status');
    }

    if (submission.submittedById !== actorId) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.$transaction(async (tx) => {
      const withdrawnAt = new Date();

      await tx.approver.updateMany({
        where: {
          status: 'pending',
          appliedApprovalRequirement: {
            appliedApprovalPolicy: {
              submissionId: id,
            },
          },
        },
        data: {
          status: 'skipped',
        },
      });

      return tx.submission.update({
        where: { id },
        data: {
          status: 'withdrawn',
          withdrawnAt,
          currentAppliedApprovalPolicyId: null,
        },
      });
    });
  }

  async findApprovable(userId: bigint) {
    return this.prisma.submission.findMany({
      where: {
        status: 'submitted',
        currentAppliedApprovalPolicy: {
          status: 'pending',
          requirements: {
            some: {
              status: 'pending',
              approvers: {
                some: {
                  userId,
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
  }

  private async resolveApplicantDepartmentId(
    tx: Prisma.TransactionClient,
    params: { submittedById: bigint; submittedAt: Date },
  ) {
    const membership = await tx.departmentMembership.findFirst({
      where: {
        userId: params.submittedById,
        joinedAt: {
          lte: params.submittedAt,
        },
        OR: [
          { leftAt: null },
          {
            leftAt: {
              gt: params.submittedAt,
            },
          },
        ],
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (!membership) {
      throw new BadRequestException('Applicant department not found');
    }

    return membership.departmentId;
  }

  private async findSubmissionForApprovalAction(
    tx: Prisma.TransactionClient,
    id: bigint,
  ) {
    const submission = await tx.submission.findUnique({
      where: { id },
      include: {
        currentAppliedApprovalPolicy: {
          include: {
            approvalPolicy: true,
            requirements: {
              include: {
                approvers: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  private findCurrentApprover(
    currentPolicy: NonNullable<
      Awaited<
        ReturnType<SubmissionsService['findSubmissionForApprovalAction']>
      >['currentAppliedApprovalPolicy']
    >,
    actorId: bigint,
  ) {
    for (const requirement of currentPolicy.requirements) {
      if (requirement.status !== 'pending') {
        continue;
      }

      const approver = requirement.approvers.find(
        (approver) =>
          approver.userId === actorId && approver.status === 'pending',
      );

      if (approver) {
        return { requirement, approver };
      }
    }

    return null;
  }

  private isApprovalPolicyApproved(
    currentPolicy: NonNullable<
      Awaited<
        ReturnType<SubmissionsService['findSubmissionForApprovalAction']>
      >['currentAppliedApprovalPolicy']
    >,
    requirements: Array<{ status: string }>,
  ) {
    if (currentPolicy.approvalPolicy.operator === 'any') {
      return requirements.some(
        (requirement) => requirement.status === 'approved',
      );
    }

    return requirements.every(
      (requirement) => requirement.status === 'approved',
    );
  }

  private buildCurrentApproverUpdateWhere(params: {
    id: bigint;
    currentAppliedApprovalPolicyId: bigint;
    currentApproverId: bigint;
  }): Prisma.ApproverWhereInput {
    return {
      id: params.currentApproverId,
      status: 'pending',
      appliedApprovalRequirement: {
        status: 'pending',
        appliedApprovalPolicy: {
          id: params.currentAppliedApprovalPolicyId,
          status: 'pending',
          submission: {
            id: params.id,
            status: 'submitted',
            currentAppliedApprovalPolicyId:
              params.currentAppliedApprovalPolicyId,
          },
        },
      },
    };
  }
}
