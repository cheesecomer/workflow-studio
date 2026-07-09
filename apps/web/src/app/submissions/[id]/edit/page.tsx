import { getSubmission } from '@/lib/api/submissions';
import { fetchOrNotFound } from '@/lib/errors';
import {
  submitSubmissionAction,
  updateSubmissionAction,
} from '@/lib/actions/submissions';
import { DynamicSubmissionForm } from '@/components/dynamic-form/DynamicSubmissionForm';

// Always reads live backend data — see app/documents/page.tsx for the same
// reasoning.
export const dynamic = 'force-dynamic';

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await fetchOrNotFound(getSubmission(id));

  if (!submission.availableActions.includes('edit')) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <h1 className="text-xl font-semibold">
          {submission.documentDefinition.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          この申請は編集できません。
        </p>
      </main>
    );
  }

  // The field definitions come from the submission's own (version-pinned)
  // documentDefinition, not a fresh GET /documents/:id — a draft must keep
  // editing against the definition version it was created with, even if
  // the document has since been republished as a newer version.
  const fieldGroupDefinitions =
    submission.documentDefinition.fieldGroupDefinitions;
  const canSubmit = submission.availableActions.includes('submit');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">
        {submission.documentDefinition.name} の編集
      </h1>
      <DynamicSubmissionForm
        fieldGroupDefinitions={fieldGroupDefinitions}
        initialRows={submission.fieldGroupRows}
        action={updateSubmissionAction.bind(null, id, fieldGroupDefinitions)}
        submitLabel="下書き保存"
        secondaryAction={
          canSubmit
            ? {
                action: submitSubmissionAction.bind(
                  null,
                  id,
                  fieldGroupDefinitions,
                ),
                label: '提出',
              }
            : undefined
        }
      />
    </main>
  );
}
