vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/submissions', () => ({ getSubmission: vi.fn() }));
vi.mock('@/lib/errors', () => ({
  fetchOrNotFound: (promise: Promise<unknown>) => promise,
}));
vi.mock('@/lib/actions/submissions', () => ({
  deleteSubmissionAction: vi.fn(),
  submitSubmissionDirectlyAction: vi.fn(),
  withdrawSubmissionAction: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { getSubmission } from '@/lib/api/submissions';
import SubmissionDetailPage from './page';

const fieldGroupDefinitions = [
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
        fieldType: 'text' as const,
        required: true,
        position: 1,
        settings: {},
      },
    ],
  },
  {
    id: '200',
    key: 'lines',
    label: '明細',
    position: 2,
    repeatable: true,
    minRows: 1,
    fieldDefinitions: [
      {
        id: '2000',
        key: 'date',
        label: '日付',
        fieldType: 'date' as const,
        required: true,
        position: 1,
        settings: {},
      },
    ],
  },
];

function baseSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    documentDefinitionId: '10',
    createdById: '1',
    submittedById: null,
    applicantDepartmentId: null,
    status: 'draft',
    currentAppliedApprovalPolicyId: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: { id: '1', name: '申請者', email: 'a@example.com' },
    submittedBy: null,
    documentDefinition: {
      id: '10',
      documentId: '1',
      name: '経費精算書',
      fieldGroupDefinitions,
    },
    fieldGroupRows: [
      {
        id: '1',
        fieldGroupDefinitionId: '100',
        position: 1,
        fieldValues: [{ id: '1', fieldDefinitionId: '1000', value: '出張申請' }],
      },
      {
        id: '2',
        fieldGroupDefinitionId: '200',
        position: 2,
        fieldValues: [
          { id: '2', fieldDefinitionId: '2000', value: '2026-07-01' },
        ],
      },
      {
        id: '3',
        fieldGroupDefinitionId: '200',
        position: 3,
        fieldValues: [
          { id: '3', fieldDefinitionId: '2000', value: '2026-07-02' },
        ],
      },
    ],
    appliedApprovalPolicies: [],
    availableActions: ['edit', 'submit', 'delete'],
    activities: [
      {
        type: 'created',
        occurredAt: '2026-01-01T00:00:00.000Z',
        actor: { id: '1', name: '申請者', email: 'a@example.com' },
      },
    ],
    ...overrides,
  };
}

describe('SubmissionDetailPage', () => {
  it('renders field values grouped by field group, including all rows of a repeatable group', async () => {
    vi.mocked(getSubmission).mockResolvedValue(baseSubmission() as never);

    render(
      await SubmissionDetailPage({ params: Promise.resolve({ id: '1' }) }),
    );

    expect(screen.getByText('経費精算書')).toBeInTheDocument();
    expect(screen.getByText('下書き')).toBeInTheDocument();
    expect(screen.getByText('出張申請')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-07-01').toLocaleDateString('ja-JP')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-07-02').toLocaleDateString('ja-JP')),
    ).toBeInTheDocument();
  });

  it('renders the action buttons for the submission\'s available actions', async () => {
    vi.mocked(getSubmission).mockResolvedValue(baseSubmission() as never);

    render(
      await SubmissionDetailPage({ params: Promise.resolve({ id: '1' }) }),
    );

    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/submissions/1/edit',
    );
    expect(screen.getByRole('button', { name: '提出' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('shows only the withdraw button for a submitted submission', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      baseSubmission({ status: 'submitted', availableActions: ['withdraw'] }) as never,
    );

    render(
      await SubmissionDetailPage({ params: Promise.resolve({ id: '1' }) }),
    );

    expect(screen.getByText('申請中')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '取り下げ' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
  });

  it('renders the activity timeline in chronological order', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      baseSubmission({
        status: 'submitted',
        availableActions: ['withdraw'],
        submittedById: '1',
        submittedBy: { id: '1', name: '申請者', email: 'a@example.com' },
        activities: [
          {
            type: 'created',
            occurredAt: '2026-01-01T00:00:00.000Z',
            actor: { id: '1', name: '申請者', email: 'a@example.com' },
          },
          {
            type: 'submitted',
            occurredAt: '2026-01-02T00:00:00.000Z',
            actor: { id: '1', name: '申請者', email: 'a@example.com' },
          },
        ],
      }) as never,
    );

    render(
      await SubmissionDetailPage({ params: Promise.resolve({ id: '1' }) }),
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('申請者 が申請を作成しました');
    expect(items[1]).toHaveTextContent('申請者 が提出しました');
  });
});
