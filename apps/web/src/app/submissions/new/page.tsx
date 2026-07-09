import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDocument, getSubmittableDocuments } from '@/lib/api/documents';
import { fetchOrNotFound } from '@/lib/errors';
import { createSubmissionAction } from '@/lib/actions/submissions';
import { DynamicSubmissionForm } from '@/components/dynamic-form/DynamicSubmissionForm';

// Always reads live backend data — see app/documents/page.tsx for the same
// reasoning.
export const dynamic = 'force-dynamic';

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;

  if (!documentId) {
    const submittableDocuments = await getSubmittableDocuments();

    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <h1 className="text-xl font-semibold">申請する書類を選択</h1>
        {submittableDocuments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            申請可能な書類がありません。
          </p>
        ) : (
          <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
            {submittableDocuments.map((document) => (
              <li key={document.id}>
                <Link
                  href={`/submissions/new?documentId=${document.documentId}`}
                  className="hover:bg-muted flex items-center justify-between px-4 py-3"
                >
                  <span>{document.name}</span>
                  <span className="text-muted-foreground text-xs">
                    version {document.version}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  const document = await fetchOrNotFound(getDocument(documentId));
  const definition = document.currentDocumentDefinition;

  // A submittable document always has a current definition by construction
  // (GET /documents/submittable only lists published ones) — if this ever
  // doesn't hold, treat it the same as a bad id rather than crashing.
  if (!definition) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">{document.name} の申請</h1>
      <DynamicSubmissionForm
        fieldGroupDefinitions={definition.fieldGroupDefinitions}
        action={createSubmissionAction.bind(
          null,
          definition.id,
          definition.fieldGroupDefinitions,
        )}
        submitLabel="下書き保存"
      />
    </main>
  );
}
