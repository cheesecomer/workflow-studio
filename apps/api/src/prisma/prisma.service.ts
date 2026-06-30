import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WorkflowStudioPrismaClient } from '@workflow-studio/db';

@Injectable()
export class PrismaService
  extends WorkflowStudioPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
