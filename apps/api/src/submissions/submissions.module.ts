import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsSubmitValidator } from './submissions-submit.validator';
import { SubmissionsApprovalRouteMaterializer } from './submissions-approval-route.materializer';

@Module({
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    PrismaService,
    SubmissionsSubmitValidator,
    SubmissionsApprovalRouteMaterializer,
  ],
})
export class SubmissionsModule {}
