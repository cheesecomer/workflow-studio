'use client';

import { useActionState } from 'react';
import type { FieldGroupDefinition, FieldGroupRowInput } from '@/types/api';
import { Button } from '@/components/ui/button';
import { FieldGroupRows } from './FieldGroupRows';

export type FormActionState = { ok: boolean; message?: string } | null;

type FormAction = (
  state: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

type Props = {
  fieldGroupDefinitions: FieldGroupDefinition[];
  initialRows?: FieldGroupRowInput[];
  action: FormAction;
  submitLabel: string;
  // For screens that need a second submit behavior sharing the same fields
  // (e.g. "save draft" vs. "submit") — see the submission edit page. Both
  // buttons live in the same <form> and get the same FormData; the second
  // button overrides which action runs via the native `formAction` prop
  // (React 19), rather than duplicating the field tree in a second form.
  secondaryAction?: {
    action: FormAction;
    label: string;
  };
};

async function noopAction(state: FormActionState): Promise<FormActionState> {
  return state;
}

export function DynamicSubmissionForm({
  fieldGroupDefinitions,
  initialRows,
  action,
  submitLabel,
  secondaryAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [secondaryState, secondaryFormAction, isSecondaryPending] =
    useActionState(secondaryAction?.action ?? noopAction, null);

  const pending = isPending || isSecondaryPending;
  const errorState = [state, secondaryState].find(
    (candidate) => candidate && !candidate.ok && candidate.message,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errorState && (
        <p role="alert" className="text-destructive text-sm">
          {errorState.message}
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
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {secondaryAction && (
          <Button
            type="submit"
            variant="outline"
            formAction={secondaryFormAction}
            disabled={pending}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </form>
  );
}
