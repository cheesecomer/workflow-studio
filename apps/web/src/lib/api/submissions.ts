import 'server-only';
import { apiRequest, buildQueryString } from './client';
import type {
  ApprovableSubmissionListItem,
  CreateSubmissionInput,
  ListApprovableSubmissionsParams,
  ListSubmissionsParams,
  PaginatedResult,
  Submission,
  SubmissionDetail,
  SubmissionListItem,
  SubmissionWithFieldGroupRows,
  UpdateSubmissionInput,
} from '@/types/api';

export function listSubmissions(
  params: ListSubmissionsParams = {},
): Promise<PaginatedResult<SubmissionListItem>> {
  return apiRequest(`/submissions${buildQueryString(params)}`);
}

export function listApprovableSubmissions(
  params: ListApprovableSubmissionsParams = {},
): Promise<PaginatedResult<ApprovableSubmissionListItem>> {
  return apiRequest(`/submissions/approvable${buildQueryString(params)}`);
}

export function getSubmission(id: string): Promise<SubmissionDetail> {
  return apiRequest(`/submissions/${id}`);
}

export function createSubmission(
  input: CreateSubmissionInput,
): Promise<SubmissionWithFieldGroupRows> {
  return apiRequest('/submissions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSubmission(
  id: string,
  input: UpdateSubmissionInput,
): Promise<SubmissionWithFieldGroupRows> {
  return apiRequest(`/submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSubmission(id: string): Promise<Submission> {
  return apiRequest(`/submissions/${id}`, { method: 'DELETE' });
}

export function submitSubmission(id: string): Promise<Submission> {
  return apiRequest(`/submissions/${id}/submit`, { method: 'POST' });
}

export function approveSubmission(
  id: string,
  comment?: string,
): Promise<Submission> {
  return apiRequest(`/submissions/${id}/approve`, {
    method: 'POST',
    body: comment ? JSON.stringify({ comment }) : undefined,
  });
}

export function rejectSubmission(
  id: string,
  comment?: string,
): Promise<Submission> {
  return apiRequest(`/submissions/${id}/reject`, {
    method: 'POST',
    body: comment ? JSON.stringify({ comment }) : undefined,
  });
}

export function withdrawSubmission(id: string): Promise<Submission> {
  return apiRequest(`/submissions/${id}/withdraw`, { method: 'POST' });
}
