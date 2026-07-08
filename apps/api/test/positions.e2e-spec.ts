import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BigIntInterceptor } from '../src/common/interceptors/bigint.interceptor';
import { App } from 'supertest/types';

describe('PositionsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new BigIntInterceptor());
    prisma = app.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns positions ordered by rank', async () => {
    const position =
      (await prisma.position.findFirst({
        where: { name: 'Positions E2E Test Position' },
      })) ??
      (await prisma.position.create({
        data: { name: 'Positions E2E Test Position', rank: 12345 },
      }));

    const response = await request(app.getHttpServer())
      .get('/positions')
      .expect(200);

    const body = response.body as {
      id: string;
      name: string;
      rank: number;
    }[];

    const ranks = body.map((item) => item.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: position.id.toString(),
          name: 'Positions E2E Test Position',
          rank: 12345,
        }),
      ]),
    );
  });
});
