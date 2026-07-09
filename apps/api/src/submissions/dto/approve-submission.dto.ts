import { IsOptional, IsString } from 'class-validator';

export class ApproveSubmissionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
