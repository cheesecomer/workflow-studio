'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createDocumentAction,
  type DocumentActionState,
} from '@/lib/actions/documents';

export function NewDocumentForm() {
  const [state, formAction, isPending] = useActionState<
    DocumentActionState,
    FormData
  >(createDocumentAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok && state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span>申請書名</span>
        <Input type="text" name="name" required maxLength={255} />
      </label>
      <Button type="submit" disabled={isPending} className="w-fit">
        作成
      </Button>
    </form>
  );
}
