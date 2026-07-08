import 'server-only';
import { apiRequest } from './client';
import type {
  CreateDocumentInput,
  Document,
  DocumentWithCurrentDefinition,
  PublishDocumentInput,
  SubmittableDocument,
  UpdateDocumentInput,
} from '@/types/api';

export function listDocuments(): Promise<Document[]> {
  return apiRequest('/documents');
}

export function getSubmittableDocuments(): Promise<SubmittableDocument[]> {
  return apiRequest('/documents/submittable');
}

export function getDocument(
  id: string,
): Promise<DocumentWithCurrentDefinition> {
  return apiRequest(`/documents/${id}`);
}

export function createDocument(input: CreateDocumentInput): Promise<Document> {
  return apiRequest('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDocument(
  id: string,
  input: UpdateDocumentInput,
): Promise<Document> {
  return apiRequest(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteDocument(id: string): Promise<Document> {
  return apiRequest(`/documents/${id}`, { method: 'DELETE' });
}

export function publishDocument(
  id: string,
  input: PublishDocumentInput,
): Promise<Document> {
  return apiRequest(`/documents/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
