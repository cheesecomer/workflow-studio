import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldGroupRows } from './FieldGroupRows';
import type { FieldGroupDefinition } from '@/types/api';

const nonRepeatableGroup: FieldGroupDefinition = {
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

const repeatableGroup: FieldGroupDefinition = {
  id: '2',
  key: 'lines',
  label: '交通費明細',
  position: 2,
  repeatable: true,
  minRows: 1,
  fieldDefinitions: [
    {
      id: '21',
      key: 'amount',
      label: '金額',
      fieldType: 'number',
      required: true,
      position: 1,
      settings: {},
    },
  ],
};

describe('FieldGroupRows', () => {
  it('renders exactly one row for a non-repeatable group and no add/remove controls', () => {
    render(<FieldGroupRows group={nonRepeatableGroup} />);

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: '行を追加' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '削除' }),
    ).not.toBeInTheDocument();
  });

  it('renders minRows rows for a repeatable group and allows adding more', async () => {
    const user = userEvent.setup();
    render(<FieldGroupRows group={repeatableGroup} />);

    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '行を追加' }));

    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });

  it('disables the remove button once at minRows', () => {
    render(<FieldGroupRows group={repeatableGroup} />);

    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled();
  });

  it('preserves other rows values when a row is removed', async () => {
    const user = userEvent.setup();
    render(<FieldGroupRows group={repeatableGroup} />);

    await user.click(screen.getByRole('button', { name: '行を追加' }));
    const inputs = screen.getAllByRole('spinbutton');
    await user.type(inputs[0], '1000');
    await user.type(inputs[1], '2000');

    const removeButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(removeButtons[0]);

    const remainingInputs = screen.getAllByRole('spinbutton');
    expect(remainingInputs).toHaveLength(1);
    expect(remainingInputs[0]).toHaveValue(2000);
  });

  it('pre-fills values from initialRows', () => {
    render(
      <FieldGroupRows
        group={nonRepeatableGroup}
        initialRows={[
          {
            fieldGroupDefinitionId: '1',
            position: 1,
            fieldValues: [{ fieldDefinitionId: '11', value: '出張申請' }],
          },
        ]}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('出張申請');
  });

  it('does not leak stale initialRows data into a newly added row after removal', async () => {
    const user = userEvent.setup();
    render(
      <FieldGroupRows
        group={repeatableGroup}
        initialRows={[
          {
            fieldGroupDefinitionId: '2',
            position: 1,
            fieldValues: [{ fieldDefinitionId: '21', value: 100 }],
          },
          {
            fieldGroupDefinitionId: '2',
            position: 2,
            fieldValues: [{ fieldDefinitionId: '21', value: 200 }],
          },
          {
            fieldGroupDefinitionId: '2',
            position: 3,
            fieldValues: [{ fieldDefinitionId: '21', value: 300 }],
          },
        ]}
      />,
    );

    // Remove the 2nd row (value 200).
    const removeButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(removeButtons[1]);

    // A newly added row must start empty, not inherit row 3's (300) initial
    // value just because it now sits at row 3's old array index.
    await user.click(screen.getByRole('button', { name: '行を追加' }));

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['100', '300', '']);
  });
});
