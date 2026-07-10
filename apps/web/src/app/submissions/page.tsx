import Link from 'next/link';
import { listSubmissions } from '@/lib/api/submissions';
import { submissionStatusLabel } from '@/lib/format';
import { parseLimit, parsePage } from '@/lib/pagination';
import { buttonVariants } from '@/components/ui/button';
import { PaginationControls } from '@/components/ui/PaginationControls';
import type { SubmissionStatus } from '@/types/api';

// Always reads live backend data — see app/documents/page.tsx for the same
// reasoning.
export const dynamic = 'force-dynamic';

const STATUS_FILTERS: SubmissionStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'withdrawn',
];

function parseStatus(value: string | undefined): SubmissionStatus | undefined {
  return STATUS_FILTERS.find((status) => status === value);
}

function buildStatusHref(
  status: SubmissionStatus | undefined,
  limit: string | undefined,
) {
  const query = new URLSearchParams();
  if (status) {
    query.set('status', status);
  }
  if (limit) {
    query.set('limit', limit);
  }
  const qs = query.toString();
  return qs ? `/submissions?${qs}` : '/submissions';
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const limitParam = limit !== undefined ? String(limit) : undefined;

  const { items, meta } = await listSubmissions({ status, page, limit });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">申請一覧</h1>
        <Link
          href="/submissions/new"
          className={buttonVariants({ variant: 'default' })}
        >
          新規申請
        </Link>
      </div>

      <nav
        aria-label="ステータスで絞り込み"
        className="flex flex-wrap gap-3 text-sm"
      >
        <Link
          href={buildStatusHref(undefined, limitParam)}
          aria-current={status === undefined ? 'page' : undefined}
          className={
            status === undefined
              ? 'font-semibold underline'
              : 'text-muted-foreground hover:underline'
          }
        >
          すべて
        </Link>
        {STATUS_FILTERS.map((filterStatus) => (
          <Link
            key={filterStatus}
            href={buildStatusHref(filterStatus, limitParam)}
            aria-current={status === filterStatus ? 'page' : undefined}
            className={
              status === filterStatus
                ? 'font-semibold underline'
                : 'text-muted-foreground hover:underline'
            }
          >
            {submissionStatusLabel[filterStatus]}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          該当する申請がありません。
        </p>
      ) : (
        <ul className="border-border divide-border flex flex-col divide-y rounded-lg border">
          {items.map((submission) => (
            <li key={submission.id}>
              <Link
                href={`/submissions/${submission.id}`}
                className="hover:bg-muted flex items-center justify-between px-4 py-3"
              >
                <span>{submission.documentDefinition.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {new Date(submission.createdAt).toLocaleDateString(
                      'ja-JP',
                    )}
                  </span>
                  <span className="text-xs">
                    {submissionStatusLabel[submission.status]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaginationControls
        meta={meta}
        basePath="/submissions"
        searchParams={{ status, limit: limitParam }}
      />
    </main>
  );
}
