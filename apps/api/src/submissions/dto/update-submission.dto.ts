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

  // See create-submission.dto.ts's FieldValue for why @IsOptional() alone.
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

export class UpdateSubmissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldGroupRow)
  fieldGroupRows!: FieldGroupRow[];
}
