vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/submissions', () => ({
  listSubmissions: vi.fn(),
}));

import { render, screen, within } from '@testing-library/react';
import { listSubmissions } from '@/lib/api/submissions';
import SubmissionsPage from './page';

function makeMeta(overrides: Partial<Record<string, number>> = {}) {
  return { page: 1, limit: 20, total: 0, totalPages: 0, ...overrides };
}

describe('SubmissionsPage', () => {
  it('renders an empty state when there are no submissions', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta(),
    });

    render(await SubmissionsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByText('該当する申請がありません。'),
    ).toBeInTheDocument();
  });

  it('renders each submission with its document name, status, and a link to its detail page', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [
        {
          id: '1',
          status: 'draft',
          createdAt: '2026-07-01T00:00:00.000Z',
          documentDefinition: { id: '10', documentId: '1', name: '経費精算書', version: 1 },
        } as never,
        {
          id: '2',
          status: 'submitted',
          createdAt: '2026-07-02T00:00:00.000Z',
          documentDefinition: { id: '11', documentId: '2', name: '出張申請書', version: 1 },
        } as never,
      ],
      meta: makeMeta({ total: 2, totalPages: 1 }),
    });

    render(await SubmissionsPage({ searchParams: Promise.resolve({}) }));

    const list = screen.getByRole('list');
    expect(within(list).getByRole('link', { name: /経費精算書/ })).toHaveAttribute(
      'href',
      '/submissions/1',
    );
    expect(within(list).getByRole('link', { name: /出張申請書/ })).toHaveAttribute(
      'href',
      '/submissions/2',
    );
    expect(within(list).getByText('下書き')).toBeInTheDocument();
    expect(within(list).getByText('申請中')).toBeInTheDocument();
  });

  it('passes the status filter through to listSubmissions and highlights the active filter', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta(),
    });

    render(
      await SubmissionsPage({
        searchParams: Promise.resolve({ status: 'submitted' }),
      }),
    );

    expect(listSubmissions).toHaveBeenCalledWith({
      status: 'submitted',
      page: 1,
      limit: undefined,
    });
    expect(
      screen.getByRole('link', { name: '申請中' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'すべて' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('ignores an unrecognized status value and falls back to no filter', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta(),
    });

    render(
      await SubmissionsPage({
        searchParams: Promise.resolve({ status: 'not-a-status' }),
      }),
    );

    expect(listSubmissions).toHaveBeenCalledWith({
      status: undefined,
      page: 1,
      limit: undefined,
    });
  });

  it('passes page and limit search params through to listSubmissions', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta({ page: 2, limit: 2, total: 5, totalPages: 3 }),
    });

    render(
      await SubmissionsPage({
        searchParams: Promise.resolve({ page: '2', limit: '2' }),
      }),
    );

    expect(listSubmissions).toHaveBeenCalledWith({
      status: undefined,
      page: 2,
      limit: 2,
    });
    expect(
      screen.getByText('2 / 3 ページ（全 5 件）'),
    ).toBeInTheDocument();
  });

  it('normalizes an invalid limit value instead of carrying it into filter/pagination links', async () => {
    vi.mocked(listSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta({ total: 5, totalPages: 1 }),
    });

    render(
      await SubmissionsPage({
        searchParams: Promise.resolve({ limit: 'abc' }),
      }),
    );

    expect(listSubmissions).toHaveBeenCalledWith({
      status: undefined,
      page: 1,
      limit: undefined,
    });
    expect(screen.getByRole('link', { name: 'すべて' })).toHaveAttribute(
      'href',
      '/submissions',
    );
  });
});
