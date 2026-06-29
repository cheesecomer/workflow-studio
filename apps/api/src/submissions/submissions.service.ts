import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubmissionDto: CreateSubmissionDto, createdById: bigint) {
    const { fieldValues, ...submissionData } = createSubmissionDto;
    return this.prisma.submission.create({
      data: {
        ...submissionData,
        createdById,
        status: 'draft',
        fieldValues: {
          createMany: {
            data: fieldValues,
          },
        },
      },
      include: {
        fieldValues: true,
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
        fieldValues: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async update(id: bigint, updateSubmissionDto: UpdateSubmissionDto) {
    const { fieldValues, ...submissionData } = updateSubmissionDto;
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.submissionFieldValue.deleteMany({
        where: { submissionId: id },
      });

      return tx.submission.update({
        where: { id },
        data: {
          ...submissionData,
          fieldValues: {
            createMany: {
              data: fieldValues,
            },
          },
        },
        include: {
          fieldValues: true,
        },
      });
    });
  }

  async remove(id: bigint) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.prisma.submission.delete({
      where: { id },
    });
  }
}
