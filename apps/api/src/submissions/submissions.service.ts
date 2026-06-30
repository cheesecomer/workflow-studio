import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
