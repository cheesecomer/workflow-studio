vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/documents', () => ({ getDocument: vi.fn() }));
vi.mock('@/lib/api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('@/lib/errors', () => ({
  fetchOrNotFound: (promise: Promise<unknown>) => promise,
}));
vi.mock('@/lib/actions/documents', () => ({
  updateDocumentAction: vi.fn(),
  publishDocumentAction: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { getDocument } from '@/lib/api/documents';
import { listPositions } from '@/lib/api/positions';
import DocumentEditPage from './page';

describe('DocumentEditPage', () => {
  it('renders the heading and passes positions down to the builder', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      draftContent: {},
      publishedContent: null,
      currentDocumentDefinitionId: null,
      currentDocumentDefinition: null,
    } as never);
    vi.mocked(listPositions).mockResolvedValue([
      { id: '1', name: '社員', rank: 10 },
    ]);

    render(
      await DocumentEditPage({ params: Promise.resolve({ id: '1' }) }),
    );

    expect(screen.getByText('経費精算書 の編集')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'グループを追加' }),
    ).toBeInTheDocument();
  });
});
