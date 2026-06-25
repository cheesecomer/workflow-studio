import { Prisma } from '@workflow-studio/db';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsObject()
  draftContent?: Prisma.InputJsonObject;
}
