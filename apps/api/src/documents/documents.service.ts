import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from '@workflow-studio/db';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const document = await this.prisma.document.findFirst({
      where: { id },
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
}
