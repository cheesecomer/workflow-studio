import { Prisma } from '@workflow-studio/db';

export class FieldValue {
  fieldDefinitionId!: bigint;
  value!: Prisma.InputJsonValue;
}

export class FieldGroupRow {
  fieldGroupDefinitionId!: bigint;
  position!: number;
  fieldValues!: FieldValue[];
}

export class CreateSubmissionDto {
  documentDefinitionId!: bigint;
  fieldGroupRows!: FieldGroupRow[];
}
