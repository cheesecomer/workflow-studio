import { IsOptional, IsString } from 'class-validator';

export class RejectSubmissionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
