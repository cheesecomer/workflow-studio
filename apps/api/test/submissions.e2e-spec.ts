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
    await prisma.approvalDecision.deleteMany();
    await prisma.approver.deleteMany();
    await prisma.appliedApprovalRequirement.deleteMany();
    await prisma.appliedApprovalPolicy.deleteMany();
    await prisma.approvalRequirement.deleteMany();
    await prisma.approvalPolicy.deleteMany();
    await prisma.submissionFieldValue.deleteMany();
    await prisma.submissionFieldGroupRow.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.departmentMembership.deleteMany();
    await prisma.position.deleteMany();
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
      documentDefinition: {
        id: string;
        documentId: string;
        name: string;
        version: number;
      };
      applicantDepartment: {
        id: string;
        name: string;
      } | null;
      currentAppliedApprovalPolicy: Record<string, unknown> | null;
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
          documentDefinition: {
            id: documentDefinition.id.toString(),
            documentId: document.id.toString(),
            name: '経費申請',
            version: 1,
          },
          applicantDepartment: null,
          currentAppliedApprovalPolicy: null,
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

  describe('GET /submissions', () => {
    it('filters current user submissions by status', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const otherUser =
        (await prisma.user.findFirst({
          where: { email: 'submission-list-other@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'submission-list-other@example.com',
            name: 'submission list other',
            passwordDigest: 'password',
          },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const draftSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'draft',
          createdById: currentUser.id,
        },
      });

      await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: currentUser.id,
          submittedById: currentUser.id,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'draft',
          createdById: otherUser.id,
        },
      });

      await request(app.getHttpServer())
        .get('/submissions?status=draft')
        .expect(200)
        .expect(({ body }: { body: { id: string; status: string }[] }) => {
          expect(body).toHaveLength(1);
          expect(body[0]).toMatchObject({
            id: draftSubmission.id.toString(),
            status: 'draft',
          });
        });
    });

    it('rejects invalid status filter', async () => {
      await request(app.getHttpServer())
        .get('/submissions?status=unknown')
        .expect(400);
    });
  });

  describe('draft submission controls', () => {
    it('rejects update and delete for non-draft or non-owner submissions', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const otherUser =
        (await prisma.user.findFirst({
          where: { email: 'draft-control-other@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'draft-control-other@example.com',
            name: 'draft control other',
            passwordDigest: 'password',
          },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const otherDraftSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'draft',
          createdById: otherUser.id,
        },
      });

      const submittedSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: currentUser.id,
          submittedById: currentUser.id,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      await request(app.getHttpServer())
        .patch(`/submissions/${otherDraftSubmission.id.toString()}`)
        .send({ fieldGroupRows: [] })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/submissions/${submittedSubmission.id.toString()}`)
        .send({ fieldGroupRows: [] })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/submissions/${otherDraftSubmission.id.toString()}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/submissions/${submittedSubmission.id.toString()}`)
        .expect(400);
    });
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

  describe('GET /submissions/approvable', () => {
    it('returns only submissions approvable by current user', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const otherUser =
        (await prisma.user.findFirst({
          where: { email: 'other-approver@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'other-approver@example.com',
            name: 'approver',
            passwordDigest: 'password',
          },
        }));

      const applicant =
        (await prisma.user.findFirst({
          where: { email: 'applicant@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'applicant@example.com',
            name: 'applicant',
            passwordDigest: 'password',
          },
        }));

      const department = await prisma.department.create({
        data: {
          name: 'Engineering',
        },
      });

      const position =
        (await prisma.position.findFirst({
          where: { name: 'Manager' },
        })) ??
        (await prisma.position.create({
          data: { name: 'Manager', rank: 10 },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const approvableSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const notApprovableSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      const approvedSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'approved',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-03T00:00:00.000Z'),
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      });

      const approvalPolicy = await prisma.approvalPolicy.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Manager approval',
          operator: 'all',
          position: 1,
        },
      });

      const approvalRequirement = await prisma.approvalRequirement.create({
        data: {
          approvalPolicyId: approvalPolicy.id,
          name: 'Manager',
          departmentScope: 'same_department',
          positionOperator: 'eq',
          positionId: position.id,
          requiredCount: 1,
        },
      });

      const approvableAppliedPolicy = await prisma.appliedApprovalPolicy.create(
        {
          data: {
            submissionId: approvableSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        },
      );

      await prisma.submission.update({
        where: { id: approvableSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: approvableAppliedPolicy.id,
        },
      });

      const approvableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: approvableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: approvableAppliedRequirement.id,
          userId: currentUser.id,
          status: 'pending',
        },
      });

      const notApprovableAppliedPolicy =
        await prisma.appliedApprovalPolicy.create({
          data: {
            submissionId: notApprovableSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        });

      await prisma.submission.update({
        where: { id: notApprovableSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: notApprovableAppliedPolicy.id,
        },
      });

      const notApprovableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: notApprovableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: notApprovableAppliedRequirement.id,
          userId: otherUser.id,
          status: 'pending',
        },
      });

      const approvedAppliedPolicy = await prisma.appliedApprovalPolicy.create({
        data: {
          submissionId: approvedSubmission.id,
          approvalPolicyId: approvalPolicy.id,
          position: 1,
          status: 'approved',
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      });

      await prisma.submission.update({
        where: { id: approvedSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: approvedAppliedPolicy.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/submissions/approvable')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(
        (
          response.body as {
            id: string;
            status: string;
            documentDefinition: {
              id: string;
              documentId: string;
              name: string;
              version: number;
            };
            createdBy: {
              id: string;
              name: string;
              email: string;
            };
            applicantDepartment: {
              id: string;
              name: string;
            };
            submittedAt: string;
            currentAppliedApprovalPolicy: {
              id: string;
              approvalPolicy: {
                id: string;
                name: string;
                operator: string;
                position: number;
              };
            };
          }[]
        )[0],
      ).toMatchObject({
        id: approvableSubmission.id.toString(),
        status: 'submitted',
        submittedAt: '2026-01-01T00:00:00.000Z',
        documentDefinition: {
          id: documentDefinition.id.toString(),
          documentId: document.id.toString(),
          name: '経費申請',
          version: 1,
        },
        createdBy: {
          id: applicant.id.toString(),
          name: 'applicant',
          email: 'applicant@example.com',
        },
        applicantDepartment: {
          id: department.id.toString(),
          name: 'Engineering',
        },
        currentAppliedApprovalPolicy: {
          id: approvableAppliedPolicy.id.toString(),
          approvalPolicy: {
            id: approvalPolicy.id.toString(),
            name: 'Manager approval',
            operator: 'all',
            position: 1,
          },
        },
      });
    });
  });

  describe('GET /submissions/:id', () => {
    it('returns a submission to the applicant', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const department = await prisma.department.create({
        data: {
          name: 'Engineering',
        },
      });

      const position =
        (await prisma.position.findFirst({
          where: { name: 'Manager' },
        })) ??
        (await prisma.position.create({
          data: { name: 'Manager', rank: 10 },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const basicGroup = await prisma.fieldGroupDefinition.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          label: '品目',
          key: 'items',
          position: 1,
          repeatable: false,
          minRows: 1,
        },
      });

      const titleField = await prisma.fieldDefinition.create({
        data: {
          fieldGroupDefinitionId: basicGroup.id,
          label: '品目',
          key: 'title',
          fieldType: 'text',
          required: true,
          position: 1,
          settings: {},
        },
      });

      const submittedSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: currentUser.id,
          submittedById: currentUser.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const approvalPolicy = await prisma.approvalPolicy.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Manager approval',
          operator: 'all',
          position: 1,
        },
      });

      const approvalRequirement = await prisma.approvalRequirement.create({
        data: {
          approvalPolicyId: approvalPolicy.id,
          name: 'Manager',
          departmentScope: 'same_department',
          positionOperator: 'eq',
          positionId: position.id,
          requiredCount: 1,
        },
      });

      const approvableAppliedPolicy = await prisma.appliedApprovalPolicy.create(
        {
          data: {
            submissionId: submittedSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        },
      );

      await prisma.submission.update({
        where: { id: submittedSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: approvableAppliedPolicy.id,
        },
      });

      const approvableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: approvableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: approvableAppliedRequirement.id,
          userId: currentUser.id,
          status: 'pending',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/submissions/${submittedSubmission.id}`)
        .expect(200);
      expect(response.body).toMatchObject({
        id: submittedSubmission.id.toString(),
        documentDefinitionId: documentDefinition.id.toString(),
        status: 'submitted',
        documentDefinition: {
          id: documentDefinition.id.toString(),
          documentId: document.id.toString(),
          name: '経費申請',
          version: 1,
          fieldGroupDefinitions: [
            {
              id: basicGroup.id.toString(),
              label: '品目',
              key: 'items',
              position: 1,
              repeatable: false,
              minRows: 1,
              fieldDefinitions: [
                {
                  id: titleField.id.toString(),
                  label: '品目',
                  key: 'title',
                  fieldType: 'text',
                  required: true,
                  position: 1,
                  settings: {},
                },
              ],
            },
          ],
        },
        fieldGroupRows: [],
        appliedApprovalPolicies: [
          {
            id: approvableAppliedPolicy.id.toString(),
            approvalPolicyId: approvalPolicy.id.toString(),
            position: 1,
            status: 'pending',
            approvalPolicy: {
              id: approvalPolicy.id.toString(),
              name: 'Manager approval',
              operator: 'all',
            },
            requirements: [
              {
                id: approvableAppliedRequirement.id.toString(),
                approvalRequirementId: approvalRequirement.id.toString(),
                status: 'pending',
                requiredCount: 1,
                approvedCount: 0,
                approvalRequirement: {
                  id: approvalRequirement.id.toString(),
                  name: 'Manager',
                },
                approvers: [
                  {
                    userId: currentUser.id.toString(),
                    status: 'pending',
                    user: {
                      id: currentUser.id.toString(),
                      name: currentUser.name,
                      email: currentUser.email,
                    },
                    decisions: [],
                  },
                ],
              },
            ],
          },
        ],
      });
      const body = response.body as {
        appliedApprovalPolicies: {
          requirements: {
            approvers: {
              user: {
                id: string;
                name: string;
                email: string;
              };
            }[];
          }[];
        }[];
      };

      expect(
        body.appliedApprovalPolicies[0].requirements[0].approvers[0].user,
      ).not.toHaveProperty('passwordDigest');
    });

    it('returns a submission to an approver', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const otherUser =
        (await prisma.user.findFirst({
          where: { email: 'other-approver@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'other-approver@example.com',
            name: 'approver',
            passwordDigest: 'password',
          },
        }));

      const applicant =
        (await prisma.user.findFirst({
          where: { email: 'applicant@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'applicant@example.com',
            name: 'applicant',
            passwordDigest: 'password',
          },
        }));

      const department = await prisma.department.create({
        data: {
          name: 'Engineering',
        },
      });

      const position =
        (await prisma.position.findFirst({
          where: { name: 'Manager' },
        })) ??
        (await prisma.position.create({
          data: { name: 'Manager', rank: 10 },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const approvableSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const notApprovableSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      const approvedSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'approved',
          createdById: applicant.id,
          submittedById: applicant.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-03T00:00:00.000Z'),
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      });

      const approvalPolicy = await prisma.approvalPolicy.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Manager approval',
          operator: 'all',
          position: 1,
        },
      });

      const approvalRequirement = await prisma.approvalRequirement.create({
        data: {
          approvalPolicyId: approvalPolicy.id,
          name: 'Manager',
          departmentScope: 'same_department',
          positionOperator: 'eq',
          positionId: position.id,
          requiredCount: 1,
        },
      });

      const approvableAppliedPolicy = await prisma.appliedApprovalPolicy.create(
        {
          data: {
            submissionId: approvableSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        },
      );

      await prisma.submission.update({
        where: { id: approvableSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: approvableAppliedPolicy.id,
        },
      });

      const approvableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: approvableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: approvableAppliedRequirement.id,
          userId: currentUser.id,
          status: 'pending',
        },
      });

      const notApprovableAppliedPolicy =
        await prisma.appliedApprovalPolicy.create({
          data: {
            submissionId: notApprovableSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        });

      await prisma.submission.update({
        where: { id: notApprovableSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: notApprovableAppliedPolicy.id,
        },
      });

      const notApprovableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: notApprovableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: notApprovableAppliedRequirement.id,
          userId: otherUser.id,
          status: 'pending',
        },
      });

      const approvedAppliedPolicy = await prisma.appliedApprovalPolicy.create({
        data: {
          submissionId: approvedSubmission.id,
          approvalPolicyId: approvalPolicy.id,
          position: 1,
          status: 'approved',
          approvedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      });

      await prisma.submission.update({
        where: { id: approvedSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: approvedAppliedPolicy.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/submissions/${approvableSubmission.id}`)
        .expect(200);
      expect(response.body).toMatchObject({
        id: approvableSubmission.id.toString(),
        documentDefinitionId: documentDefinition.id.toString(),
        status: 'submitted',
        fieldGroupRows: [],
        appliedApprovalPolicies: [
          {
            id: approvableAppliedPolicy.id.toString(),
            approvalPolicyId: approvalPolicy.id.toString(),
            position: 1,
            status: 'pending',
            requirements: [
              {
                id: approvableAppliedRequirement.id.toString(),
                status: 'pending',
                approvers: [
                  {
                    userId: currentUser.id.toString(),
                    status: 'pending',
                    user: {
                      id: currentUser.id.toString(),
                      name: currentUser.name,
                      email: currentUser.email,
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    });
    it('throws NotFoundException when the user cannot access the submission', async () => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const approver =
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

      const applicant =
        (await prisma.user.findFirst({
          where: { email: 'applicant@example.com' },
        })) ??
        (await prisma.user.create({
          data: {
            email: 'applicant@example.com',
            name: 'applicant',
            passwordDigest: 'password',
          },
        }));

      const department = await prisma.department.create({
        data: {
          name: 'Engineering',
        },
      });

      const position =
        (await prisma.position.findFirst({
          where: { name: 'Manager' },
        })) ??
        (await prisma.position.create({
          data: { name: 'Manager', rank: 10 },
        }));

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
          publishedById: currentUser.id,
        },
      });

      const notApprovableSubmission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status: 'submitted',
          createdById: approver.id,
          submittedById: approver.id,
          applicantDepartmentId: department.id,
          submittedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      const approvalPolicy = await prisma.approvalPolicy.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Manager approval',
          operator: 'all',
          position: 1,
        },
      });

      const approvalRequirement = await prisma.approvalRequirement.create({
        data: {
          approvalPolicyId: approvalPolicy.id,
          name: 'Manager',
          departmentScope: 'same_department',
          positionOperator: 'eq',
          positionId: position.id,
          requiredCount: 1,
        },
      });

      const notApprovableAppliedPolicy =
        await prisma.appliedApprovalPolicy.create({
          data: {
            submissionId: notApprovableSubmission.id,
            approvalPolicyId: approvalPolicy.id,
            position: 1,
            status: 'pending',
          },
        });

      await prisma.submission.update({
        where: { id: notApprovableSubmission.id },
        data: {
          currentAppliedApprovalPolicyId: notApprovableAppliedPolicy.id,
        },
      });

      const notApprovableAppliedRequirement =
        await prisma.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: notApprovableAppliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        });

      await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: notApprovableAppliedRequirement.id,
          userId: applicant.id,
          status: 'pending',
        },
      });

      await request(app.getHttpServer())
        .get(`/submissions/${notApprovableSubmission.id}`)
        .expect(404);
    });
  });

  describe('approval actions', () => {
    const createApprovalActionFixture = async (params?: {
      approverId?: bigint;
      applicantId?: bigint;
      status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'withdrawn';
      operator?: 'all' | 'any';
    }) => {
      const currentUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const applicant =
        params?.applicantId === undefined
          ? currentUser
          : await prisma.user.findUniqueOrThrow({
              where: { id: params.applicantId },
            });

      const approver =
        params?.approverId === undefined
          ? currentUser
          : await prisma.user.findUniqueOrThrow({
              where: { id: params.approverId },
            });

      const department = await prisma.department.create({
        data: { name: 'Approval action department' },
      });

      const position = await prisma.position.create({
        data: { name: 'Approval action manager', rank: 1000 },
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
          publishedById: currentUser.id,
        },
      });

      const approvalPolicy = await prisma.approvalPolicy.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          name: 'Manager approval',
          operator: params?.operator ?? 'all',
          position: 1,
        },
      });

      const approvalRequirement = await prisma.approvalRequirement.create({
        data: {
          approvalPolicyId: approvalPolicy.id,
          name: 'Manager',
          departmentScope: 'same_department',
          positionOperator: 'eq',
          positionId: position.id,
          requiredCount: 1,
        },
      });

      const status = params?.status ?? 'submitted';
      const submission = await prisma.submission.create({
        data: {
          documentDefinitionId: documentDefinition.id,
          status,
          createdById: applicant.id,
          submittedById: status === 'draft' ? null : applicant.id,
          applicantDepartmentId: status === 'draft' ? null : department.id,
          submittedAt:
            status === 'draft' ? null : new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const appliedPolicy = await prisma.appliedApprovalPolicy.create({
        data: {
          submissionId: submission.id,
          approvalPolicyId: approvalPolicy.id,
          position: 1,
          status: 'pending',
        },
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          currentAppliedApprovalPolicyId:
            status === 'submitted' ? appliedPolicy.id : null,
        },
      });

      const appliedRequirement = await prisma.appliedApprovalRequirement.create(
        {
          data: {
            appliedApprovalPolicyId: appliedPolicy.id,
            approvalRequirementId: approvalRequirement.id,
            status: 'pending',
            requiredCount: 1,
            approvedCount: 0,
          },
        },
      );

      const appliedApprover = await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: appliedRequirement.id,
          userId: approver.id,
          status: 'pending',
        },
      });

      return {
        currentUser,
        submission,
        appliedPolicy,
        appliedRequirement,
        appliedApprover,
      };
    };

    it('approves a submitted submission by the current approver', async () => {
      const { currentUser, submission, appliedApprover } =
        await createApprovalActionFixture();

      const response = await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/approve`)
        .send({
          comment: 'Looks good',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: submission.id.toString(),
        status: 'approved',
        currentAppliedApprovalPolicyId: null,
      });

      await expect(
        prisma.approver.findUniqueOrThrow({
          where: { id: appliedApprover.id },
        }),
      ).resolves.toMatchObject({
        status: 'approved',
      });

      await expect(
        prisma.approvalDecision.findFirstOrThrow({
          where: {
            approverId: appliedApprover.id,
            actorId: currentUser.id,
          },
        }),
      ).resolves.toMatchObject({
        decision: 'approved',
        comment: 'Looks good',
      });
    });

    it('rejects a submitted submission by the current approver', async () => {
      const { currentUser, submission, appliedApprover } =
        await createApprovalActionFixture();

      const response = await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/reject`)
        .send({
          comment: 'Please fix amount',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: submission.id.toString(),
        status: 'rejected',
        currentAppliedApprovalPolicyId: null,
      });

      await expect(
        prisma.approvalDecision.findFirstOrThrow({
          where: {
            approverId: appliedApprover.id,
            actorId: currentUser.id,
          },
        }),
      ).resolves.toMatchObject({
        decision: 'rejected',
        comment: 'Please fix amount',
      });
    });

    it('withdraws a submitted submission by the applicant', async () => {
      const { submission, appliedApprover } =
        await createApprovalActionFixture();

      const response = await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/withdraw`)
        .expect(201);

      expect(response.body).toMatchObject({
        id: submission.id.toString(),
        status: 'withdrawn',
        currentAppliedApprovalPolicyId: null,
      });

      await expect(
        prisma.approver.findUniqueOrThrow({
          where: { id: appliedApprover.id },
        }),
      ).resolves.toMatchObject({
        status: 'skipped',
      });
    });

    it('skips remaining pending approvers when any approval policy is approved', async () => {
      const otherUser = await prisma.user.upsert({
        where: { email: 'approval-action-any-other@example.com' },
        update: {},
        create: {
          email: 'approval-action-any-other@example.com',
          name: 'other approver',
          passwordDigest: 'password',
        },
      });
      const { submission, appliedRequirement } =
        await createApprovalActionFixture({
          operator: 'any',
        });
      const otherApprover = await prisma.approver.create({
        data: {
          appliedApprovalRequirementId: appliedRequirement.id,
          userId: otherUser.id,
          status: 'pending',
        },
      });

      await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/approve`)
        .expect(201);

      await expect(
        prisma.approver.findUniqueOrThrow({
          where: { id: otherApprover.id },
        }),
      ).resolves.toMatchObject({
        status: 'skipped',
      });
    });

    it('does not approve when the current user is not the current approver', async () => {
      const otherUser = await prisma.user.upsert({
        where: { email: 'approval-action-other@example.com' },
        update: {},
        create: {
          email: 'approval-action-other@example.com',
          name: 'other',
          passwordDigest: 'password',
        },
      });
      const { submission } = await createApprovalActionFixture({
        approverId: otherUser.id,
      });

      await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/approve`)
        .expect(403);
    });

    it('does not approve a submission that is not submitted', async () => {
      const { submission } = await createApprovalActionFixture({
        status: 'approved',
      });

      await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/approve`)
        .expect(400);
    });

    it('does not withdraw another user submission', async () => {
      const otherUser = await prisma.user.upsert({
        where: { email: 'approval-action-applicant@example.com' },
        update: {},
        create: {
          email: 'approval-action-applicant@example.com',
          name: 'applicant',
          passwordDigest: 'password',
        },
      });
      const { submission } = await createApprovalActionFixture({
        applicantId: otherUser.id,
      });

      await request(app.getHttpServer())
        .post(`/submissions/${submission.id.toString()}/withdraw`)
        .expect(403);
    });
  });
});
