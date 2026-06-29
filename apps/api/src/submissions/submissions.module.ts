import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PrismaService],
})
export class SubmissionsModule {}
