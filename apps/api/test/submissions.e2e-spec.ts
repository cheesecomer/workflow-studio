import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BigIntInterceptor } from '../src/common/interceptors/bigint.interceptor';
import { App } from 'supertest/types';

describe('SubmissionsController (e2e)', () => {
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

  beforeEach(async () => {
    await prisma.submission.deleteMany();
    await prisma.fieldDefinition.deleteMany();
    await prisma.approvalRequirement.deleteMany();
    await prisma.approvalPolicy.deleteMany();
    await prisma.documentDefinition.deleteMany();
    await prisma.document.deleteMany();
  });

  it('runs submission CRUD flow', async () => {
    const document = await prisma.document.create({
      data: {
        name: '経費申請',
        draftContent: {},
        publishedContent: {},
      },
    });

    const documentDefinition = await prisma.documentDefinition.create({
      data: {
        name: '経費申請',
        documentId: document.id,
        version: 1,
        publishedById: 1n,
        fieldDefinitions: {
          createMany: {
            data: [
              {
                label: '品目',
                key: 'name',
                fieldType: 'text',
                required: true,
                position: 1,
                settings: {},
              },
              {
                label: '申請額',
                key: 'value',
                fieldType: 'text',
                required: true,
                position: 2,
                settings: {},
              },
            ],
          },
        },
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post('/submissions')
      .send({
        documentDefinitionId: documentDefinition.id.toString(),
        fieldValues: [],
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      documentDefinitionId: documentDefinition.id.toString(),
      status: 'draft',
      fieldValues: [],
    });
    type SubmissionResponse = {
      id: string;
    };

    const submissionId = (createResponse.body as SubmissionResponse).id;

    await request(app.getHttpServer())
      .get('/submissions')
      .expect(200)
      .expect(({ body }: { body: SubmissionResponse[] }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: submissionId,
          documentDefinitionId: documentDefinition.id.toString(),
          status: 'draft',
        });
      });

    await request(app.getHttpServer())
      .get(`/submissions/${submissionId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: submissionId,
          documentDefinitionId: documentDefinition.id.toString(),
          status: 'draft',
          fieldValues: [],
        });
      });

    await request(app.getHttpServer())
      .patch(`/submissions/${submissionId}`)
      .send({
        fieldValues: [],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: submissionId,
          fieldValues: [],
        });
      });

    await request(app.getHttpServer())
      .delete(`/submissions/${submissionId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: submissionId,
        });
      });

    await request(app.getHttpServer())
      .get(`/submissions/${submissionId}`)
      .expect(404);
  });
});
