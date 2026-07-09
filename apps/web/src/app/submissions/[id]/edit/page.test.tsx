vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/submissions', () => ({ getSubmission: vi.fn() }));
vi.mock('@/lib/errors', () => ({
  fetchOrNotFound: (promise: Promise<unknown>) => promise,
}));
vi.mock('@/lib/actions/submissions', () => ({
  updateSubmissionAction: vi.fn(),
  submitSubmissionAction: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { getSubmission } from '@/lib/api/submissions';
import EditSubmissionPage from './page';

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
];

function draftSubmission(availableActions: string[]) {
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
    ],
    appliedApprovalPolicies: [],
    availableActions,
    activities: [],
  };
}

describe('EditSubmissionPage', () => {
  it('renders the dynamic form pre-filled from fieldGroupRows when editable', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      draftSubmission(['submit', 'edit', 'delete']) as never,
    );

    render(await EditSubmissionPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByText('経費精算書 の編集')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /件名/ })).toHaveValue(
      '出張申請',
    );
    expect(
      screen.getByRole('button', { name: '下書き保存' }),
    ).toBeInTheDocument();
  });

  it('shows the submit button when "submit" is an available action', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      draftSubmission(['submit', 'edit']) as never,
    );

    render(await EditSubmissionPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByRole('button', { name: '提出' })).toBeInTheDocument();
  });

  it('hides the submit button when "submit" is not an available action', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      draftSubmission(['edit']) as never,
    );

    render(await EditSubmissionPage({ params: Promise.resolve({ id: '1' }) }));

    expect(
      screen.queryByRole('button', { name: '提出' }),
    ).not.toBeInTheDocument();
  });

  it('shows a not-editable message instead of the form when "edit" is not available', async () => {
    vi.mocked(getSubmission).mockResolvedValue(
      draftSubmission(['withdraw']) as never,
    );

    render(await EditSubmissionPage({ params: Promise.resolve({ id: '1' }) }));

    expect(screen.getByText('この申請は編集できません。')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
