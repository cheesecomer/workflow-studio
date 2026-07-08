import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.position.findMany({
      select: {
        id: true,
        name: true,
        rank: true,
      },
      orderBy: { rank: 'asc' },
    });
  }
}
