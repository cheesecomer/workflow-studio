import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicSubmissionForm } from './DynamicSubmissionForm';
import type { FieldGroupDefinition } from '@/types/api';

const group: FieldGroupDefinition = {
  id: '1',
  key: 'basic',
  label: '基本情報',
  position: 1,
  repeatable: false,
  minRows: 1,
  fieldDefinitions: [
    {
      id: '11',
      key: 'subject',
      label: '件名',
      fieldType: 'text',
      required: true,
      position: 1,
      settings: {},
    },
  ],
};

describe('DynamicSubmissionForm', () => {
  it('renders each field group and the submit button label', () => {
    render(
      <DynamicSubmissionForm
        fieldGroupDefinitions={[group]}
        action={async () => null}
        submitLabel="下書き保存"
      />,
    );

    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /件名/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '下書き保存' }),
    ).toBeInTheDocument();
  });

  it('shows the error message returned by the action after submit', async () => {
    const user = userEvent.setup();
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, message: '入力内容を確認してください' });

    render(
      <DynamicSubmissionForm
        fieldGroupDefinitions={[group]}
        action={action}
        submitLabel="下書き保存"
      />,
    );

    await user.type(screen.getByRole('textbox', { name: /件名/ }), '出張申請');
    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '入力内容を確認してください',
    );
    expect(action).toHaveBeenCalled();
  });

  it('does not render an error message when the action succeeds', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });

    render(
      <DynamicSubmissionForm
        fieldGroupDefinitions={[group]}
        action={action}
        submitLabel="下書き保存"
      />,
    );

    // The field is required — the browser blocks submission until it has a
    // value, regardless of the action's own behavior.
    await user.type(screen.getByRole('textbox', { name: /件名/ }), '出張申請');
    await user.click(screen.getByRole('button', { name: '下書き保存' }));

    expect(action).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
