vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/submissions', () => ({
  listApprovableSubmissions: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { listApprovableSubmissions } from '@/lib/api/submissions';
import ApprovalsPage from './page';

function makeMeta(overrides: Partial<Record<string, number>> = {}) {
  return { page: 1, limit: 20, total: 0, totalPages: 0, ...overrides };
}

describe('ApprovalsPage', () => {
  it('renders an empty state when there is nothing to approve', async () => {
    vi.mocked(listApprovableSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta(),
    });

    render(await ApprovalsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByText('承認待ちの申請はありません。'),
    ).toBeInTheDocument();
  });

  it('renders each approvable submission with its applicant and a link to its detail page', async () => {
    vi.mocked(listApprovableSubmissions).mockResolvedValue({
      items: [
        {
          id: '1',
          submittedAt: '2026-07-01T00:00:00.000Z',
          documentDefinition: { id: '10', documentId: '1', name: '経費精算書', version: 1 },
          createdBy: { id: '2', name: '申請太郎', email: 'taro@example.com' },
        } as never,
      ],
      meta: makeMeta({ total: 1, totalPages: 1 }),
    });

    render(await ApprovalsPage({ searchParams: Promise.resolve({}) }));

    const link = screen.getByRole('link', { name: /経費精算書/ });
    expect(link).toHaveAttribute('href', '/submissions/1');
    expect(link).toHaveTextContent('申請太郎');
  });

  it('passes page and limit search params through to listApprovableSubmissions', async () => {
    vi.mocked(listApprovableSubmissions).mockResolvedValue({
      items: [],
      meta: makeMeta({ page: 2, limit: 2, total: 3, totalPages: 2 }),
    });

    render(
      await ApprovalsPage({
        searchParams: Promise.resolve({ page: '2', limit: '2' }),
      }),
    );

    expect(listApprovableSubmissions).toHaveBeenCalledWith({
      page: 2,
      limit: 2,
    });
    expect(screen.getByText('2 / 2 ページ（全 3 件）')).toBeInTheDocument();
  });
});
