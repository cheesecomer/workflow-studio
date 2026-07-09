import Link from 'next/link';
import { listDocuments } from '@/lib/api/documents';
import { buttonVariants } from '@/components/ui/button';

// This route always reads live backend data (apiRequest() sets
// `cache: 'no-store'`); force-dynamic keeps `next build` from trying to
// prerender it at build time, when API_URL isn't necessarily available.
export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">申請書管理</h1>
        <Link href="/documents/new" className={buttonVariants({ variant: 'default' })}>
          新規作成
        </Link>
      </div>

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          申請書がまだありません。
        </p>
      ) : (
        <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                href={`/documents/${document.id}`}
                className="hover:bg-muted flex items-center justify-between px-4 py-3"
              >
                <span>{document.name}</span>
                <span className="text-muted-foreground text-xs">
                  {document.currentDocumentDefinitionId
                    ? '公開済み'
                    : '未公開'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
