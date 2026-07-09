vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/documents', () => ({
  listDocuments: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { listDocuments } from '@/lib/api/documents';
import DocumentsPage from './page';

describe('DocumentsPage', () => {
  it('renders an empty state when there are no documents', async () => {
    vi.mocked(listDocuments).mockResolvedValue([]);

    render(await DocumentsPage());

    expect(
      screen.getByText('申請書がまだありません。'),
    ).toBeInTheDocument();
  });

  it('renders each document with its publish status', async () => {
    vi.mocked(listDocuments).mockResolvedValue([
      {
        id: '1',
        name: '経費精算書',
        currentDocumentDefinitionId: '10',
      } as never,
      {
        id: '2',
        name: '出張申請書',
        currentDocumentDefinitionId: null,
      } as never,
    ]);

    render(await DocumentsPage());

    expect(screen.getByRole('link', { name: /経費精算書/ })).toHaveAttribute(
      'href',
      '/documents/1',
    );
    expect(screen.getByRole('link', { name: /出張申請書/ })).toHaveAttribute(
      'href',
      '/documents/2',
    );
    expect(screen.getByText('公開済み')).toBeInTheDocument();
    expect(screen.getByText('未公開')).toBeInTheDocument();
  });
});
