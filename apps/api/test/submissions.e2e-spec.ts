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
    await prisma.approver.deleteMany();
    await prisma.appliedApprovalRequirement.deleteMany();
    await prisma.appliedApprovalPolicy.deleteMany();
    await prisma.submissionFieldValue.deleteMany();
    await prisma.submissionFieldGroupRow.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.departmentMembership.deleteMany();
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

  it('submits draft submission', async () => {
    const chief =
      (await prisma.position.findFirst({
        where: { name: 'Chief' },
      })) ??
      (await prisma.position.create({
        data: { name: 'Chief', rank: 3 },
      }));
    const leader =
      (await prisma.position.findFirst({
        where: { name: 'Reader' },
      })) ??
      (await prisma.position.create({
        data: { name: 'Reader', rank: 2 },
      }));
    const staff =
      (await prisma.position.findFirst({
        where: { name: 'Staff' },
      })) ??
      (await prisma.position.create({
        data: { name: 'Staff', rank: 1 },
      }));
    const department =
      (await prisma.department.findFirst({
        where: { name: 'Department' },
      })) ??
      (await prisma.department.create({
        data: { name: 'Department' },
      }));

    const currentUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' },
    });

    await prisma.departmentMembership.create({
      data: {
        userId: currentUser.id,
        departmentId: department.id,
        positionId: staff.id,
        joinedAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    const approverUser =
      (await prisma.user.findFirst({
        where: { email: 'approver@example.com' },
      })) ??
      (await prisma.user.create({
        data: {
          email: 'approver@example.com',
          name: 'approver',
          passwordDigest: 'password',
        },
      }));

    await prisma.departmentMembership.create({
      data: {
        userId: approverUser.id,
        departmentId: department.id,
        positionId: chief.id,
        joinedAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    const notApproverUser =
      (await prisma.user.findFirst({
        where: { email: 'not.approver@example.com' },
      })) ??
      (await prisma.user.create({
        data: {
          email: 'not.approver@example.com',
          name: 'not approver',
          passwordDigest: 'password',
        },
      }));

    await prisma.departmentMembership.create({
      data: {
        userId: notApproverUser.id,
        departmentId: department.id,
        positionId: leader.id,
        joinedAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

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

    await prisma.approvalPolicy.create({
      data: {
        documentDefinitionId: documentDefinition.id,
        name: 'approver',
        position: 1,
        operator: 'all',
        requirements: {
          createMany: {
            data: [
              {
                name: 'Chief',
                departmentScope: 'same_tree',
                positionOperator: 'eq',
                positionId: chief.id,
                requiredCount: 1,
              },
            ],
          },
        },
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

    const draftSubmission = await prisma.submission.create({
      data: {
        documentDefinitionId: documentDefinition.id,
        status: 'draft',
        createdById: currentUser.id,
      },
    });

    await prisma.submissionFieldGroupRow.create({
      data: {
        submissionId: draftSubmission.id,
        fieldGroupDefinitionId: basicGroup.id,
        position: 1,
        fieldValues: {
          createMany: {
            data: [
              {
                fieldDefinitionId: titleField.id,
                value: '交通費精算',
              },
              {
                fieldDefinitionId: amountField.id,
                value: 13000,
              },
            ],
          },
        },
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/submissions/${draftSubmission.id.toString()}/submit`)
      .expect(201);

    const submission = response.body as {
      id: string;
      submittedAt: Date;
      currentAppliedApprovalPolicyId: string;
      status: string;
    };

    expect(submission).toMatchObject({
      id: draftSubmission.id.toString(),
      status: 'submitted',
      submittedById: currentUser.id.toString(),
    });

    expect(submission.submittedAt).toBeTruthy();
    expect(submission.currentAppliedApprovalPolicyId).toBeTruthy();

    const appliedPolicies = await prisma.appliedApprovalPolicy.findMany({
      where: {
        submissionId: draftSubmission.id,
      },
      include: {
        requirements: {
          include: {
            approvers: true,
          },
        },
      },
    });

    expect(appliedPolicies).toHaveLength(1);
    expect(appliedPolicies[0].position).toBe(1);
    expect(appliedPolicies[0].status).toBe('pending');

    expect(appliedPolicies[0].requirements).toHaveLength(1);
    expect(appliedPolicies[0].requirements[0].requiredCount).toBe(1);
    expect(appliedPolicies[0].requirements[0].approvedCount).toBe(0);

    expect(appliedPolicies[0].requirements[0].approvers).toHaveLength(1);
    expect(appliedPolicies[0].requirements[0].approvers[0].userId).toBe(
      approverUser.id,
    );
  });
});
