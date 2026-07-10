'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  approveSubmission,
  createSubmission,
  deleteSubmission,
  rejectSubmission,
  submitSubmission,
  updateSubmission,
  withdrawSubmission,
} from '../api/submissions';
import { ApiClientError } from '../api/client';
import { toActionErrorMessage } from '../errors';
import { buildFieldGroupRowsFromFormData } from '../submission-form-data';
import type { FieldGroupDefinition } from '@/types/api';

export type SubmissionActionState = { ok: boolean; message?: string } | null;

export async function createSubmissionAction(
  documentDefinitionId: string,
  fieldGroupDefinitions: FieldGroupDefinition[],
  _prevState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const fieldGroupRows = buildFieldGroupRowsFromFormData(
    formData,
    fieldGroupDefinitions,
  );

  let submissionId: string;
  try {
    const submission = await createSubmission({
      documentDefinitionId,
      fieldGroupRows,
    });
    submissionId = submission.id;
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: toActionErrorMessage(error) };
    }
    throw error;
  }

  revalidatePath('/submissions');
  redirect(`/submissions/${submissionId}/edit`);
}

export async function updateSubmissionAction(
  id: string,
  fieldGroupDefinitions: FieldGroupDefinition[],
  _prevState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const fieldGroupRows = buildFieldGroupRowsFromFormData(
    formData,
    fieldGroupDefinitions,
  );

  try {
    await updateSubmission(id, { fieldGroupRows });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: toActionErrorMessage(error) };
    }
    throw error;
  }

  revalidatePath(`/submissions/${id}/edit`);
  return { ok: true, message: '下書きを保存しました' };
}

export async function submitSubmissionAction(
  id: string,
  fieldGroupDefinitions: FieldGroupDefinition[],
  _prevState: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const fieldGroupRows = buildFieldGroupRowsFromFormData(
    formData,
    fieldGroupDefinitions,
  );

  try {
    // Persist whatever is currently in the form before transitioning
    // status — POST /submissions/:id/submit itself takes no body and just
    // submits whatever is already saved, so skipping this would silently
    // drop any edits made since the last "save draft".
    await updateSubmission(id, { fieldGroupRows });
    await submitSubmission(id);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: toActionErrorMessage(error) };
    }
    throw error;
  }

  revalidatePath('/submissions');
  revalidatePath(`/submissions/${id}`);
  revalidatePath(`/submissions/${id}/edit`);
  redirect(`/submissions/${id}`);
}

// Submits from the detail page, where there's no form to save first — just
// transitions status on whatever was last saved via updateSubmissionAction
// (POST /submissions/:id/submit itself takes no body).
export async function submitSubmissionDirectlyAction(id: string): Promise<void> {
  await submitSubmission(id);
  revalidatePath('/submissions');
  revalidatePath(`/submissions/${id}`);
  revalidatePath(`/submissions/${id}/edit`);
  redirect(`/submissions/${id}`);
}

export async function withdrawSubmissionAction(id: string): Promise<void> {
  await withdrawSubmission(id);
  revalidatePath('/submissions');
  revalidatePath(`/submissions/${id}`);
  revalidatePath(`/submissions/${id}/edit`);
  redirect(`/submissions/${id}`);
}

export async function deleteSubmissionAction(id: string): Promise<void> {
  await deleteSubmission(id);
  revalidatePath('/submissions');
  redirect('/submissions');
}

function commentFrom(formData: FormData): string | undefined {
  const comment = formData.get('comment');
  return typeof comment === 'string' && comment.trim() !== ''
    ? comment
    : undefined;
}

export async function approveSubmissionAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await approveSubmission(id, commentFrom(formData));
  revalidatePath('/submissions');
  revalidatePath(`/submissions/${id}`);
  revalidatePath('/approvals');
  redirect(`/submissions/${id}`);
}

export async function rejectSubmissionAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await rejectSubmission(id, commentFrom(formData));
  revalidatePath('/submissions');
  revalidatePath(`/submissions/${id}`);
  revalidatePath('/approvals');
  redirect(`/submissions/${id}`);
}
