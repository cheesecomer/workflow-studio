import { IsObject, IsString, MaxLength } from 'class-validator';
import type { DocumentDraft } from '../types/document-draft';

export class PublishDocumentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsObject()
  draftContent!: DocumentDraft;
}
