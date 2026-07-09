vi.mock('server-only', () => ({}));
vi.mock('@/lib/actions/documents', () => ({
  updateDocumentAction: vi.fn(),
  publishDocumentAction: vi.fn(),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  publishDocumentAction,
  updateDocumentAction,
} from '@/lib/actions/documents';
import type { DocumentWithCurrentDefinition, Position } from '@/types/api';
import { DocumentFormBuilder } from './DocumentFormBuilder';

const positions: Position[] = [
  { id: '1', name: '社員', rank: 10 },
  { id: '2', name: '課長', rank: 30 },
];

function emptyDocument(): DocumentWithCurrentDefinition {
  return {
    id: '1',
    name: '経費精算書',
    draftContent: {},
    publishedContent: null,
    currentDocumentDefinitionId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentDocumentDefinition: null,
  };
}

describe('DocumentFormBuilder', () => {
  afterEach(() => {
    vi.mocked(updateDocumentAction).mockReset();
    vi.mocked(publishDocumentAction).mockReset();
  });

  it('starts with no groups or policies for a brand-new document', () => {
    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    expect(screen.queryByLabelText('識別子(key)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下書き保存' })).toBeInTheDocument();
  });

  it('adds a group and a field, then saves the draft with the entered values and an auto-generated key', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({
      ok: true,
      message: '下書きを保存しました',
    });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'グループを追加' }));
    await user.type(screen.getByLabelText('グループ名'), '基本情報');

    await user.click(screen.getByRole('button', { name: '項目を追加' }));
    await user.type(screen.getByLabelText('ラベル'), '件名');

    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    expect(updateDocumentAction).toHaveBeenCalledWith('1', {
      name: '経費精算書',
      draftContent: {
        groups: [
          {
            key: expect.any(String),
            label: '基本情報',
            repeatable: false,
            minRows: 1,
            fields: [
              {
                key: expect.any(String),
                label: '件名',
                fieldType: 'text',
                required: false,
                settings: {},
              },
            ],
          },
        ],
        workflow: { policies: [] },
      },
    });

    const [, payload] = vi.mocked(updateDocumentAction).mock.calls[0];
    expect(payload.draftContent.groups[0].key).not.toBe('');
    expect(payload.draftContent.groups[0].fields[0].key).not.toBe('');
    expect(payload.draftContent.groups[0].key).not.toBe(
      payload.draftContent.groups[0].fields[0].key,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      '下書きを保存しました',
    );
  });

  it('adds an approval policy and requirement using the given positions', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'ポリシーを追加' }));
    await user.type(screen.getByLabelText('ポリシー名'), '上長承認');

    await user.click(screen.getByRole('button', { name: '承認要件を追加' }));
    await user.type(screen.getByLabelText('要件名'), '直属上長');
    await user.selectOptions(screen.getByLabelText('役職'), '課長');

    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    expect(updateDocumentAction).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        draftContent: expect.objectContaining({
          workflow: {
            policies: [
              expect.objectContaining({
                name: '上長承認',
                operator: 'all',
                requirements: [
                  expect.objectContaining({
                    name: '直属上長',
                    positionId: '2',
                  }),
                ],
              }),
            ],
          },
        }),
      }),
    );
  });

  it('only shows the upper-position select when positionOperator is "between"', async () => {
    const user = userEvent.setup();
    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'ポリシーを追加' }));
    await user.click(screen.getByRole('button', { name: '承認要件を追加' }));

    expect(screen.queryByLabelText('上限役職')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('役職条件'), '指定役職以上・上限以下');

    expect(screen.getByLabelText('上限役職')).toBeInTheDocument();
  });

  it('shows the error message returned by publishDocumentAction without redirecting', async () => {
    vi.mocked(publishDocumentAction).mockResolvedValue({
      ok: false,
      message: '公開できませんでした',
    });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: '公開' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '公開できませんでした',
    );
  });

  it('removing a group also removes it from the saved draft', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'グループを追加' }));
    await user.click(screen.getByRole('button', { name: 'グループを削除' }));
    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    expect(updateDocumentAction).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        draftContent: expect.objectContaining({ groups: [] }),
      }),
    );
  });

  it('clamps a negative minRows to 1 before saving', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'グループを追加' }));
    fireEvent.change(screen.getByLabelText('最小行数'), {
      target: { value: '-3' },
    });
    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    const [, payload] = vi.mocked(updateDocumentAction).mock.calls[0];
    expect(payload.draftContent.groups[0].minRows).toBe(1);
  });

  it('clamps a negative requiredCount to 1 before saving', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'ポリシーを追加' }));
    await user.click(screen.getByRole('button', { name: '承認要件を追加' }));
    fireEvent.change(screen.getByLabelText('必要人数'), {
      target: { value: '-5' },
    });
    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    const [, payload] = vi.mocked(updateDocumentAction).mock.calls[0];
    expect(
      payload.draftContent.workflow.policies[0].requirements[0].requiredCount,
    ).toBe(1);
  });

  it('does not publish a stale upperPositionId after switching positionOperator away from "between"', async () => {
    vi.mocked(updateDocumentAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<DocumentFormBuilder document={emptyDocument()} positions={positions} />);

    await user.click(screen.getByRole('button', { name: 'ポリシーを追加' }));
    await user.click(screen.getByRole('button', { name: '承認要件を追加' }));

    await user.selectOptions(
      screen.getByLabelText('役職条件'),
      '指定役職以上・上限以下',
    );
    await user.selectOptions(screen.getByLabelText('上限役職'), '課長');
    await user.selectOptions(screen.getByLabelText('役職条件'), '指定役職と一致');

    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    const [, payload] = vi.mocked(updateDocumentAction).mock.calls[0];
    expect(
      payload.draftContent.workflow.policies[0].requirements[0]
        .upperPositionId,
    ).toBeNull();
  });
});
