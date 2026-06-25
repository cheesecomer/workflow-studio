import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BigIntInterceptor } from '../src/common/interceptors/bigint.interceptor';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DocumentsController (e2e)', () => {
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
    await prisma.$disconnect();
  });

  it('runs document CRUD flow', async () => {
    type DocumentResponse = {
      id: string;
      name: string;
      draftContent: Record<string, unknown>;
    };

    const createResponse = await request(app.getHttpServer())
      .post('/documents')
      .send({
        name: 'Expense Request',
        draftContent: {
          fields: [],
        },
      })
      .expect(201);

    const documentId = (createResponse.body as DocumentResponse).id;

    await request(app.getHttpServer()).get('/documents').expect(200);

    await request(app.getHttpServer())
      .get(`/documents/${documentId}`)
      .expect(200)
      .expect(({ body }: { body: DocumentResponse }) => {
        expect(body.id).toBe(documentId);
        expect(body.name).toBe('Expense Request');
      });

    await request(app.getHttpServer())
      .patch(`/documents/${documentId}`)
      .send({
        name: 'Updated Expense Request',
      })
      .expect(200)
      .expect(({ body }: { body: DocumentResponse }) => {
        expect(body.id).toBe(documentId);
        expect(body.name).toBe('Updated Expense Request');
      });

    await request(app.getHttpServer())
      .delete(`/documents/${documentId}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/documents/${documentId}`)
      .expect(404);
  });
});
