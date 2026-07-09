vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/documents', () => ({
  getDocument: vi.fn(),
  getSubmittableDocuments: vi.fn(),
}));
vi.mock('@/lib/errors', () => ({
  fetchOrNotFound: (promise: Promise<unknown>) => promise,
}));
vi.mock('@/lib/actions/submissions', () => ({
  createSubmissionAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { getDocument, getSubmittableDocuments } from '@/lib/api/documents';
import NewSubmissionPage from './page';

describe('NewSubmissionPage', () => {
  afterEach(() => {
    vi.mocked(notFound).mockClear();
  });

  it('lists submittable documents when no documentId is given', async () => {
    vi.mocked(getSubmittableDocuments).mockResolvedValue([
      { id: '10', documentId: '1', name: '経費精算書', version: 2 },
    ]);

    render(
      await NewSubmissionPage({ searchParams: Promise.resolve({}) }),
    );

    expect(screen.getByText('申請する書類を選択')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /経費精算書/ });
    expect(link).toHaveAttribute('href', '/submissions/new?documentId=1');
    expect(screen.getByText('version 2')).toBeInTheDocument();
  });

  it('shows an empty state when there are no submittable documents', async () => {
    vi.mocked(getSubmittableDocuments).mockResolvedValue([]);

    render(
      await NewSubmissionPage({ searchParams: Promise.resolve({}) }),
    );

    expect(
      screen.getByText('申請可能な書類がありません。'),
    ).toBeInTheDocument();
  });

  it('renders the dynamic form for the selected document', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      currentDocumentDefinition: {
        id: '10',
        documentId: '1',
        name: '経費精算書',
        version: 2,
        fieldGroupDefinitions: [
          {
            id: '100',
            key: 'basic',
            label: '基本情報',
            position: 1,
            repeatable: false,
            minRows: 1,
            fieldDefinitions: [
              {
                id: '1000',
                key: 'subject',
                label: '件名',
                fieldType: 'text',
                required: true,
                position: 1,
                settings: {},
              },
            ],
          },
        ],
        approvalPolicies: [],
      },
    } as never);

    render(
      await NewSubmissionPage({
        searchParams: Promise.resolve({ documentId: '1' }),
      }),
    );

    expect(screen.getByText('経費精算書 の申請')).toBeInTheDocument();
    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '下書き保存' }),
    ).toBeInTheDocument();
    expect(getDocument).toHaveBeenCalledWith('1');
  });

  it('calls notFound() when the selected document has no current definition', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      currentDocumentDefinition: null,
    } as never);

    await expect(
      NewSubmissionPage({
        searchParams: Promise.resolve({ documentId: '1' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
