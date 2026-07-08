import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PublishDocumentDto } from './dto/publish-document.dto';
import { Prisma } from '@workflow-studio/db';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  findSubmittable() {
    return this.prisma.documentDefinition.findMany({
      where: {
        currentForDocuments: { some: {} },
      },
      select: {
        id: true,
        documentId: true,
        name: true,
        version: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: bigint) {
    const document = await this.prisma.document.findFirst({
      where: { id },
      include: {
        currentDocumentDefinition: {
          include: {
            fieldGroupDefinitions: {
              include: {
                fieldDefinitions: {
                  orderBy: {
                    position: 'asc',
                  },
                },
              },
              orderBy: {
                position: 'asc',
              },
            },
            approvalPolicies: {
              include: {
                requirements: {
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
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async create(dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        name: dto.name,
        draftContent: dto.draftContent ?? {},
      },
    });
  }

  async update(id: bigint, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findFirst({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.update({
      where: { id: id },
      data: {
        name: dto.name,
        draftContent: dto.draftContent ?? {},
      },
    });
  }

  async remove(id: bigint) {
    const document = await this.prisma.document.findFirst({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.delete({
      where: { id: id },
    });
  }

  async publish(id: bigint, dto: PublishDocumentDto, publishedById: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({ where: { id } });
      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const latestDefinition = await tx.documentDefinition.findFirst({
        where: { documentId: id },
        orderBy: { version: 'desc' },
      });
      const version = (latestDefinition?.version ?? 0) + 1;

      const definition = await tx.documentDefinition.create({
        data: {
          name: dto.name,
          documentId: document.id,
          version: version,
          publishedById,
        },
      });

      for (const [
        i,
        { fields, ...group },
      ] of dto.draftContent.groups.entries()) {
        await tx.fieldGroupDefinition.create({
          data: {
            ...group,
            documentDefinitionId: definition.id,
            position: i + 1,
            fieldDefinitions: {
              createMany: {
                data: fields.map((it, ii) => ({
                  ...it,
                  position: ii + 1,
                  settings: it.settings as unknown as Prisma.InputJsonValue,
                })),
              },
            },
          },
        });
      }

      for (const [
        index,
        policy,
      ] of dto.draftContent.workflow.policies.entries()) {
        await tx.approvalPolicy.create({
          data: {
            documentDefinitionId: definition.id,
            name: policy.name,
            condition:
              policy.condition === null
                ? Prisma.DbNull
                : (policy.condition as unknown as Prisma.InputJsonValue),
            operator: policy.operator,
            position: index + 1,
            requirements: {
              createMany: {
                data: policy.requirements,
              },
            },
          },
        });
      }

      const draftContent = dto.draftContent as unknown as Prisma.InputJsonValue;
      await tx.document.update({
        where: { id: id },
        data: {
          name: dto.name,
          draftContent,
          publishedContent: draftContent,
          currentDocumentDefinitionId: definition.id,
        },
      });

      return await tx.document.findFirst({ where: { id } });
    });
  }
}
