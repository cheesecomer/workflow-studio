// apps/api/src/auth/dev-user.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevUserMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' },
    });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  }
}
