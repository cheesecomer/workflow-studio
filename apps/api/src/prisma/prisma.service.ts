import { Injectable, OnModuleInit } from '@nestjs/common';
import { WorkflowStudioPrismaClient } from '@workflow-studio/db';

@Injectable()
export class PrismaService
  extends WorkflowStudioPrismaClient
  implements OnModuleInit
{
  async onModuleInit() {
    await this.$connect();
  }
}
