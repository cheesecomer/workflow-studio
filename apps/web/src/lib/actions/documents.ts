'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '../api/documents';
import { ApiClientError } from '../api/client';
import { toActionErrorMessage } from '../errors';

export type DocumentActionState = { ok: boolean; message?: string } | null;

export async function createDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const name = formData.get('name');

  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, message: '申請書名を入力してください' };
  }

  let documentId: string;
  try {
    const document = await createDocument({ name });
    documentId = document.id;
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, message: toActionErrorMessage(error) };
    }
    throw error;
  }

  revalidatePath('/documents');
  redirect(`/documents/${documentId}/edit`);
}

export async function deleteDocumentAction(id: string): Promise<void> {
  await deleteDocument(id);
  revalidatePath('/documents');
  redirect('/documents');
}
