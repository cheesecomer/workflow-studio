import Link from 'next/link';
import { listApprovableSubmissions } from '@/lib/api/submissions';
import { parseLimit, parsePage } from '@/lib/pagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

// Always reads live backend data — see app/documents/page.tsx for the same
// reasoning.
export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const limitParam = limit !== undefined ? String(limit) : undefined;

  const { items, meta } = await listApprovableSubmissions({ page, limit });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">承認待ち一覧</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          承認待ちの申請はありません。
        </p>
      ) : (
        <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
          {items.map((submission) => (
            <li key={submission.id}>
              <Link
                href={`/submissions/${submission.id}`}
                className="hover:bg-muted flex items-center justify-between px-4 py-3"
              >
                <span>
                  {submission.documentDefinition.name}
                  <span className="text-muted-foreground text-xs">
                    {' '}
                    ・申請者: {submission.createdBy.name}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {submission.submittedAt
                    ? new Date(submission.submittedAt).toLocaleDateString(
                        'ja-JP',
                      )
                    : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls
        meta={meta}
        basePath="/approvals"
        searchParams={{ limit: limitParam }}
      />
    </main>
  );
}
