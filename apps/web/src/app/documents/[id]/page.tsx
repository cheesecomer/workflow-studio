import Link from 'next/link';
import { getDocument } from '@/lib/api/documents';
import { fetchOrNotFound } from '@/lib/errors';
import { deleteDocumentAction } from '@/lib/actions/documents';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { fieldTypeLabel } from '@/lib/format';

// See app/documents/page.tsx — always reads live backend data, and this
// segment also has a dynamic [id] param, so it can't be statically
// prerendered anyway.
export const dynamic = 'force-dynamic';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await fetchOrNotFound(getDocument(id));
  const definition = document.currentDocumentDefinition;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{document.name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/documents/${document.id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            編集
          </Link>
          <form action={deleteDocumentAction.bind(null, document.id)}>
            <ConfirmActionButton
              type="submit"
              variant="destructive"
              confirmMessage="この申請書を削除しますか？"
            >
              削除
            </ConfirmActionButton>
          </form>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {definition ? `公開済み（version ${definition.version}）` : '未公開'}
      </p>

      {definition ? (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium">項目グループ</h2>
            {definition.fieldGroupDefinitions.map((group) => (
              <div key={group.id} className="border-border rounded-lg border p-3">
                <p className="font-medium">
                  {group.label}
                  {group.repeatable && (
                    <span className="text-muted-foreground text-xs">
                      {' '}
                      (明細・最小{group.minRows}行)
                    </span>
                  )}
                </p>
                <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
                  {group.fieldDefinitions.map((field) => (
                    <li key={field.id}>
                      {field.label}（{fieldTypeLabel[field.fieldType]}
                      {field.required ? '・必須' : ''}）
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium">承認ポリシー</h2>
            {definition.approvalPolicies.map((policy) => (
              <div key={policy.id} className="border-border rounded-lg border p-3">
                <p className="font-medium">
                  {policy.name}（
                  {policy.operator === 'all' ? '全て満たす' : 'いずれか満たす'}
                  ）
                </p>
                <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-sm">
                  {policy.requirements.map((requirement) => (
                    <li key={requirement.id}>{requirement.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          まだ公開されていません。編集画面から公開してください。
        </p>
      )}
    </main>
  );
}
