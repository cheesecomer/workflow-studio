import { Prisma } from '@workflow-studio/db';

export type DocumentDefinitionWithApprovalPolicies =
  Prisma.DocumentDefinitionGetPayload<{
    include: {
      approvalPolicies: {
        include: {
          requirements: true;
        };
      };
    };
  }>;
