import { Prisma } from '@workflow-studio/db';

export type SubmissionWithFieldGroupRows = Prisma.SubmissionGetPayload<{
  include: {
    fieldGroupRows: {
      include: {
        fieldValues: true;
      };
    };
  };
}>;
