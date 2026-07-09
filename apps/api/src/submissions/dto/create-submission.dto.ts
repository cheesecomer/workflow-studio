import { Prisma } from '@workflow-studio/db';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class FieldValue {
  @IsNumberString()
  fieldDefinitionId!: bigint;

  // Genuinely polymorphic (string/number/boolean/null/object/array) — see
  // SubmissionFieldValue.value in the schema. @IsOptional() alone still
  // registers this property with class-validator's whitelist, without
  // constraining which JSON type is allowed.
  @IsOptional()
  value!: Prisma.InputJsonValue;
}

export class FieldGroupRow {
  @IsNumberString()
  fieldGroupDefinitionId!: bigint;

  @IsInt()
  @Min(1)
  position!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValue)
  fieldValues!: FieldValue[];
}

export class CreateSubmissionDto {
  @IsNumberString()
  documentDefinitionId!: bigint;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldGroupRow)
  fieldGroupRows!: FieldGroupRow[];
}
