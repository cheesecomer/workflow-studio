import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        parentId: true,
        name: true,
      },
      orderBy: { id: 'asc' },
    });
  }
}
