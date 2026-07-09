vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/documents', () => ({ getDocument: vi.fn() }));
vi.mock('@/lib/errors', () => ({
  fetchOrNotFound: (promise: Promise<unknown>) => promise,
}));
vi.mock('@/lib/actions/documents', () => ({ deleteDocumentAction: vi.fn() }));

import { render, screen } from '@testing-library/react';
import { getDocument } from '@/lib/api/documents';
import DocumentDetailPage from './page';

describe('DocumentDetailPage', () => {
  it('shows the unpublished state with no structure sections', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      currentDocumentDefinitionId: null,
      currentDocumentDefinition: null,
    } as never);

    render(await DocumentDetailPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByText('未公開')).toBeInTheDocument();
    expect(
      screen.getByText(
        'まだ公開されていません。編集画面から公開してください。',
      ),
    ).toBeInTheDocument();
  });

  it('renders field groups and approval policies when published', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      currentDocumentDefinitionId: '10',
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
        approvalPolicies: [
          {
            id: '200',
            name: '上長承認',
            condition: null,
            operator: 'all',
            position: 1,
            requirements: [
              {
                id: '2000',
                name: '直属上長',
                departmentScope: 'same_tree',
                positionOperator: 'gte',
                positionId: '1',
                upperPositionId: null,
                requiredCount: 1,
              },
            ],
          },
        ],
      },
    } as never);

    render(await DocumentDetailPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByText('公開済み（version 2）')).toBeInTheDocument();
    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(screen.getByText('件名（テキスト・必須）')).toBeInTheDocument();
    expect(screen.getByText('上長承認（全て満たす）')).toBeInTheDocument();
    expect(screen.getByText('直属上長')).toBeInTheDocument();
  });

  it('renders edit and delete controls', async () => {
    vi.mocked(getDocument).mockResolvedValue({
      id: '1',
      name: '経費精算書',
      currentDocumentDefinitionId: null,
      currentDocumentDefinition: null,
    } as never);

    render(await DocumentDetailPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/documents/1/edit',
    );
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });
});
