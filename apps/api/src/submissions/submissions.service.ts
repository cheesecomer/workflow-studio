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

  async findAll(createdById: bigint, status?: string) {
    const submissionStatus = parseSubmissionStatus(status);
    const where: Prisma.SubmissionWhereInput = {
      createdById,
    };

    if (submissionStatus) {
      where.status = submissionStatus;
    }

    return this.prisma.submission.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
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

    return submission;
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
