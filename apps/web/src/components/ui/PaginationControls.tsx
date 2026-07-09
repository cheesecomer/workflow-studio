import Link from 'next/link';
import type { PaginatedResult } from '@/types/api';

type Props = {
  meta: PaginatedResult<unknown>['meta'];
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && key !== 'page') {
      query.set(key, value);
    }
  }
  query.set('page', String(page));

  return `${basePath}?${query.toString()}`;
}

export function PaginationControls({ meta, basePath, searchParams }: Props) {
  const hasPrev = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;

  return (
    <nav
      aria-label="ページネーション"
      className="flex items-center justify-between text-sm"
    >
      {hasPrev ? (
        <Link
          href={buildHref(basePath, searchParams, meta.page - 1)}
          className="hover:underline"
        >
          前へ
        </Link>
      ) : (
        <span className="text-muted-foreground/50">前へ</span>
      )}
      <span className="text-muted-foreground">
        {meta.page} / {Math.max(meta.totalPages, 1)} ページ（全 {meta.total} 件）
      </span>
      {hasNext ? (
        <Link
          href={buildHref(basePath, searchParams, meta.page + 1)}
          className="hover:underline"
        >
          次へ
        </Link>
      ) : (
        <span className="text-muted-foreground/50">次へ</span>
      )}
    </nav>
  );
}
