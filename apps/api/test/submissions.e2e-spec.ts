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
    await prisma.submissionFieldValue.deleteMany();
    await prisma.submissionFieldGroupRow.deleteMany();
    await prisma.submission.deleteMany();
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
      },
    });

    const basicGroup = await prisma.fieldGroupDefinition.create({
      data: {
        documentDefinitionId: documentDefinition.id,
        label: '品目',
        key: 'name',
        position: 1,
        repeatable: false,
        minRows: 1,
      },
    });

    const titleField = await prisma.fieldDefinition.create({
      data: {
        fieldGroupDefinitionId: basicGroup.id,
        label: '品目',
        key: 'name',
        fieldType: 'text',
        required: true,
        position: 1,
        settings: {},
      },
    });

    const amountField = await prisma.fieldDefinition.create({
      data: {
        fieldGroupDefinitionId: basicGroup.id,
        label: '申請額',
        key: 'value',
        fieldType: 'text',
        required: true,
        position: 2,
        settings: {},
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post('/submissions')
      .send({
        documentDefinitionId: documentDefinition.id.toString(),
        fieldGroupRows: [
          {
            fieldGroupDefinitionId: basicGroup.id.toString(),
            position: 1,
            fieldValues: [
              {
                fieldDefinitionId: titleField.id.toString(),
                value: '6月交通費精算',
              },
              {
                fieldDefinitionId: amountField.id.toString(),
                value: 11000,
              },
            ],
          },
        ],
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      documentDefinitionId: documentDefinition.id.toString(),
      status: 'draft',
      fieldGroupRows: [
        {
          fieldGroupDefinitionId: basicGroup.id.toString(),
          position: 1,
          fieldValues: [
            {
              fieldDefinitionId: titleField.id.toString(),
              value: '6月交通費精算',
            },
            {
              fieldDefinitionId: amountField.id.toString(),
              value: 11000,
            },
          ],
        },
      ],
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
          fieldGroupRows: [
            {
              fieldGroupDefinitionId: basicGroup.id.toString(),
              position: 1,
              fieldValues: [
                {
                  fieldDefinitionId: titleField.id.toString(),
                  value: '6月交通費精算',
                },
                {
                  fieldDefinitionId: amountField.id.toString(),
                  value: 11000,
                },
              ],
            },
          ],
        });
      });

    await request(app.getHttpServer())
      .patch(`/submissions/${submissionId}`)
      .send({
        fieldGroupRows: [
          {
            fieldGroupDefinitionId: basicGroup.id.toString(),
            position: 1,
            fieldValues: [
              {
                fieldDefinitionId: titleField.id.toString(),
                value: '6月交通費精算',
              },
              {
                fieldDefinitionId: amountField.id.toString(),
                value: 13000,
              },
            ],
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: submissionId,
          fieldGroupRows: [
            {
              fieldGroupDefinitionId: basicGroup.id.toString(),
              position: 1,
              fieldValues: [
                {
                  fieldDefinitionId: titleField.id.toString(),
                  value: '6月交通費精算',
                },
                {
                  fieldDefinitionId: amountField.id.toString(),
                  value: 13000,
                },
              ],
            },
          ],
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
