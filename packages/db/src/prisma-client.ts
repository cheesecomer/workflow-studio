import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class WorkflowStudioPrismaClient extends PrismaClient {
  private readonly pool: Pool;
  private poolEnded = false;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  override async $disconnect() {
    await super.$disconnect();

    if (!this.poolEnded) {
      this.poolEnded = true;
      await this.pool.end();
    }
  }
}
