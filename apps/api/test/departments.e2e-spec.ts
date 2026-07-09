import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BigIntInterceptor } from '../src/common/interceptors/bigint.interceptor';
import { App } from 'supertest/types';

describe('DepartmentsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new BigIntInterceptor());
    // See positions.e2e-spec.ts for why this must mirror main.ts exactly.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    prisma = app.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns departments', async () => {
    const parent =
      (await prisma.department.findFirst({
        where: { name: 'Departments E2E Test Parent' },
      })) ??
      (await prisma.department.create({
        data: { name: 'Departments E2E Test Parent' },
      }));

    const child =
      (await prisma.department.findFirst({
        where: { name: 'Departments E2E Test Child' },
      })) ??
      (await prisma.department.create({
        data: { name: 'Departments E2E Test Child', parentId: parent.id },
      }));

    const response = await request(app.getHttpServer())
      .get('/departments')
      .expect(200);

    const body = response.body as {
      id: string;
      parentId: string | null;
      name: string;
    }[];

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: parent.id.toString(),
          name: 'Departments E2E Test Parent',
          parentId: null,
        }),
        expect.objectContaining({
          id: child.id.toString(),
          name: 'Departments E2E Test Child',
          parentId: parent.id.toString(),
        }),
      ]),
    );
  });
});
