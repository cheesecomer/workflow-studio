import { Prisma } from '@workflow-studio/db';

export class FieldValue {
  fieldDefinitionId!: bigint;
  value!: Prisma.InputJsonValue;
}

export class UpdateSubmissionDto {
  fieldValues!: FieldValue[];
}
