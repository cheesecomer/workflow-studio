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
    type DocumentDetailResponse = {
      id: string;
      currentDocumentDefinition: {
        id: string;
        version: number;
        name: string;
        fieldGroupDefinitions: {
          id: string;
          key: string;
          label: string;
          position: number;
          fieldDefinitions: {
            id: string;
            key: string;
            label: string;
            fieldType: string;
            required: boolean;
            position: number;
            settings: Record<string, unknown>;
          }[];
        }[];
        approvalPolicies: {
          id: string;
          name: string;
          operator: string;
          position: number;
          requirements: {
            id: string;
            name: string;
            departmentScope: string;
            positionOperator: string;
            positionId: string;
            upperPositionId: string | null;
            requiredCount: number;
          }[];
        }[];
      } | null;
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

    const position =
      (await prisma.position.findFirst({
        where: { name: 'Manager' },
      })) ??
      (await prisma.position.create({
        data: { name: 'Manager', rank: 10 },
      }));

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
                    positionId: position.id.toString(),
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
                    positionId: position.id.toString(),
                    upperPositionId: null,
                    requiredCount: 3,
                  },
                ],
              },
            ],
          },
        });
      });

    await request(app.getHttpServer())
      .get(`/documents/${documentId}`)
      .expect(200)
      .expect(({ body }: { body: DocumentDetailResponse }) => {
        expect(body.currentDocumentDefinition).toMatchObject({
          version: 1,
          name: 'Updated Expense Request',
          fieldGroupDefinitions: [
            {
              key: 'price',
              label: '申請額',
              position: 1,
              fieldDefinitions: [
                {
                  key: 'price',
                  label: '申請額',
                  fieldType: 'number',
                  required: true,
                  position: 1,
                  settings: {},
                },
              ],
            },
          ],
          approvalPolicies: [
            {
              name: 'Example Policy',
              operator: 'all',
              position: 1,
              requirements: [
                {
                  name: 'Require 3 users',
                  departmentScope: 'same_tree',
                  positionOperator: 'eq',
                  positionId: position.id.toString(),
                  upperPositionId: null,
                  requiredCount: 3,
                },
              ],
            },
          ],
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
      positionId: position.id,
      upperPositionId: null,
      requiredCount: 3,
    });
  });

  describe('GET /documents/submittable', () => {
    it('returns only documents with a published definition', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const publishedDocument = await prisma.document.create({
        data: {
          name: 'Submittable Expense Request',
          draftContent: {},
          publishedContent: {},
        },
      });

      const publishedDefinition = await prisma.documentDefinition.create({
        data: {
          name: 'Submittable Expense Request',
          documentId: publishedDocument.id,
          version: 1,
          publishedById: currentUser.id,
        },
      });

      await prisma.document.update({
        where: { id: publishedDocument.id },
        data: { currentDocumentDefinitionId: publishedDefinition.id },
      });

      await prisma.document.create({
        data: {
          name: 'Draft Only Document',
          draftContent: {},
        },
      });

      const response = await request(app.getHttpServer())
        .get('/documents/submittable')
        .expect(200);

      const body = response.body as {
        id: string;
        documentId: string;
        name: string;
        version: number;
      }[];

      expect(
        body.find(
          (item) => item.documentId === publishedDocument.id.toString(),
        ),
      ).toMatchObject({
        id: publishedDefinition.id.toString(),
        name: 'Submittable Expense Request',
        version: 1,
      });
      expect(body.some((item) => item.name === 'Draft Only Document')).toBe(
        false,
      );
    });
  });
});
