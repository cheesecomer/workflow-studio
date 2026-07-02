import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsSubmitValidator } from './submissions-submit.validator';
import { SubmissionsApprovalRouteMaterializer } from './submissions-approval-route.materializer';
import { Prisma } from '@workflow-studio/db';

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

  async findAll(createdById: bigint) {
    return this.prisma.submission.findMany({
      where: { createdById },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: bigint) {
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

    return submission;
  }

  async update(id: bigint, updateSubmissionDto: UpdateSubmissionDto) {
    const { fieldGroupRows, ...submissionData } = updateSubmissionDto;
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
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

  async remove(id: bigint) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
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

    if (submission.status != 'draft') {
      throw new BadRequestException('Invalid submission status');
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
}
