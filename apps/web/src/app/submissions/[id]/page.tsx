import { getSubmission } from '@/lib/api/submissions';
import { fetchOrNotFound } from '@/lib/errors';
import { describeSubmissionActivity, submissionStatusLabel } from '@/lib/format';
import { ReadOnlyFieldValue } from '@/components/dynamic-form/ReadOnlyFieldValue';
import { SubmissionActionButtons } from '@/components/submissions/SubmissionActionButtons';
import type { SubmissionFieldGroupRow } from '@/types/api';

// Always reads live backend data — see app/documents/page.tsx for the same
// reasoning.
export const dynamic = 'force-dynamic';

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await fetchOrNotFound(getSubmission(id));

  const rowsByGroup = new Map<string, SubmissionFieldGroupRow[]>();
  for (const row of submission.fieldGroupRows) {
    const rows = rowsByGroup.get(row.fieldGroupDefinitionId) ?? [];
    rows.push(row);
    rowsByGroup.set(row.fieldGroupDefinitionId, rows);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {submission.documentDefinition.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {submissionStatusLabel[submission.status]}
          </p>
        </div>
        <SubmissionActionButtons
          id={submission.id}
          availableActions={submission.availableActions}
        />
      </div>

      <section className="flex flex-col gap-4">
        {submission.documentDefinition.fieldGroupDefinitions.map((group) => (
          <fieldset key={group.id} className="flex flex-col gap-3">
            <legend className="text-sm font-medium">{group.label}</legend>
            {(rowsByGroup.get(group.id) ?? []).map((row, index) => (
              <div
                key={row.id}
                className="border-border flex flex-col gap-2 rounded-lg border p-3"
              >
                {group.repeatable && (
                  <span className="text-muted-foreground text-xs">
                    {index + 1}行目
                  </span>
                )}
                {group.fieldDefinitions.map((field) => {
                  const value = row.fieldValues.find(
                    (fieldValue) => fieldValue.fieldDefinitionId === field.id,
                  )?.value;

                  return (
                    <div key={field.id} className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">
                        {field.label}
                      </span>
                      <ReadOnlyFieldValue field={field} value={value} />
                    </div>
                  );
                })}
              </div>
            ))}
          </fieldset>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">タイムライン</h2>
        <ol className="flex flex-col gap-3 text-sm">
          {submission.activities.map((activity, index) => (
            <li
              key={index}
              className="border-border flex flex-col gap-0.5 border-l-2 pl-3"
            >
              <span>{describeSubmissionActivity(activity)}</span>
              <span className="text-muted-foreground text-xs">
                {new Date(activity.occurredAt).toLocaleString('ja-JP')}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
