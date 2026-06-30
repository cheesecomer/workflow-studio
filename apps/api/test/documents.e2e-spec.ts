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
  it('publishes a document', async () => {
    type PublishResponse = {
      id: string;
      name: string;
      publishedContent: Record<string, unknown>;
      currentDocumentDefinitionId: string;
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

    const documentId = (createResponse.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/documents/${documentId}/publish`)
      .send({
        name: 'Updated Expense Request',
        draftContent: {
          groups: [
            {
              key: 'price',
              label: '申請額',
              repeatable: false,
              minRows: 1,
              fields: [
                {
                  key: 'price',
                  label: '申請額',
                  fieldType: 'number',
                  required: true,
                  settings: {},
                },
              ],
            },
          ],
          workflow: {
            policies: [
              {
                name: 'Example Policy',
                condition: null,
                operator: 'all',
                requirements: [
                  {
                    name: 'Require 3 users',
                    departmentScope: 'same_tree',
                    positionOperator: 'eq',
                    positionId: '1',
                    upperPositionId: null,
                    requiredCount: 3,
                  },
                ],
              },
            ],
          },
        },
      })
      .expect(201)
      .expect(({ body }: { body: PublishResponse }) => {
        expect(body.id).toBe(documentId);
        expect(body.name).toBe('Updated Expense Request');
        expect(body.currentDocumentDefinitionId).toBeDefined();
        expect(body.publishedContent).toEqual({
          groups: [
            {
              key: 'price',
              label: '申請額',
              repeatable: false,
              minRows: 1,
              fields: [
                {
                  key: 'price',
                  label: '申請額',
                  fieldType: 'number',
                  required: true,
                  settings: {},
                },
              ],
            },
          ],
          workflow: {
            policies: [
              {
                name: 'Example Policy',
                condition: null,
                operator: 'all',
                requirements: [
                  {
                    name: 'Require 3 users',
                    departmentScope: 'same_tree',
                    positionOperator: 'eq',
                    positionId: '1',
                    upperPositionId: null,
                    requiredCount: 3,
                  },
                ],
              },
            ],
          },
        });
      });

    const document = await prisma.document.findUniqueOrThrow({
      where: { id: BigInt(documentId) },
      include: {
        currentDocumentDefinition: {
          include: {
            fieldGroupDefinitions: {
              include: {
                fieldDefinitions: true,
              },
            },
            approvalPolicies: {
              include: {
                requirements: true,
              },
            },
          },
        },
      },
    });

    expect(document.currentDocumentDefinition).toMatchObject({
      version: 1,
      name: 'Updated Expense Request',
    });

    expect(
      document.currentDocumentDefinition?.fieldGroupDefinitions,
    ).toHaveLength(1);
    expect(
      document.currentDocumentDefinition?.fieldGroupDefinitions[0]
        .fieldDefinitions,
    ).toHaveLength(1);
    expect(
      document.currentDocumentDefinition?.fieldGroupDefinitions[0]
        .fieldDefinitions[0],
    ).toMatchObject({
      key: 'price',
      label: '申請額',
      fieldType: 'number',
      required: true,
      position: 1,
      settings: {},
    });

    expect(document.currentDocumentDefinition?.approvalPolicies).toHaveLength(
      1,
    );
    expect(
      document.currentDocumentDefinition?.approvalPolicies[0],
    ).toMatchObject({
      name: 'Example Policy',
      operator: 'all',
      position: 1,
    });

    expect(
      document.currentDocumentDefinition?.approvalPolicies[0].requirements,
    ).toHaveLength(1);
    expect(
      document.currentDocumentDefinition?.approvalPolicies[0].requirements[0],
    ).toMatchObject({
      name: 'Require 3 users',
      departmentScope: 'same_tree',
      positionOperator: 'eq',
      positionId: 1n,
      upperPositionId: null,
      requiredCount: 3,
    });
  });
});
