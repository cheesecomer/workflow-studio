'use client';

import { useActionState } from 'react';
import type { FieldGroupDefinition, FieldGroupRowInput } from '@/types/api';
import { Button } from '@/components/ui/button';
import { FieldGroupRows } from './FieldGroupRows';

export type FormActionState = { ok: boolean; message?: string } | null;

type Props = {
  fieldGroupDefinitions: FieldGroupDefinition[];
  initialRows?: FieldGroupRowInput[];
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  submitLabel: string;
};

export function DynamicSubmissionForm({
  fieldGroupDefinitions,
  initialRows,
  action,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok && state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      {fieldGroupDefinitions.map((group) => (
        <FieldGroupRows
          key={group.id}
          group={group}
          initialRows={initialRows?.filter(
            (row) => row.fieldGroupDefinitionId === group.id,
          )}
        />
      ))}
      <Button type="submit" disabled={isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
