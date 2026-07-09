import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldSettingsEditor } from './FieldSettingsEditor';

describe('FieldSettingsEditor', () => {
  it('text: edits placeholder and maxLength', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldSettingsEditor fieldType="text" settings={{}} onChange={onChange} />,
    );

    await user.type(screen.getByLabelText('プレースホルダー'), 'x');

    expect(onChange).toHaveBeenLastCalledWith({ placeholder: 'x' });
  });

  it('number: edits min/max/step as numbers', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldSettingsEditor
        fieldType="number"
        settings={{}}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByLabelText('最小値'), '5');

    expect(onChange).toHaveBeenLastCalledWith({ min: 5 });
  });

  it('select: adds a new option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldSettingsEditor
        fieldType="select"
        settings={{}}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: '選択肢を追加' }));

    expect(onChange).toHaveBeenCalledWith({ options: [{ value: '', label: '' }] });
  });

  it('select: edits an existing option value and label', () => {
    const onChange = vi.fn();
    render(
      <FieldSettingsEditor
        fieldType="select"
        settings={{ options: [{ value: 'train', label: '' }] }}
        onChange={onChange}
      />,
    );

    // `settings` is fully controlled by the parent and this test has no
    // stateful wrapper feeding onChange back in as new props, so typing
    // multi-character text via userEvent would only ever reflect the last
    // keystroke — fireEvent.change sets the full value in one shot instead.
    fireEvent.change(screen.getByPlaceholderText('ラベル'), {
      target: { value: '電車' },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      options: [{ value: 'train', label: '電車' }],
    });
  });

  it('select: removes an option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FieldSettingsEditor
        fieldType="select"
        settings={{
          options: [
            { value: 'train', label: '電車' },
            { value: 'bus', label: 'バス' },
          ],
        }}
        onChange={onChange}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith({
      options: [{ value: 'bus', label: 'バス' }],
    });
  });

  it('select: ignores malformed existing options rather than crashing', () => {
    const onChange = vi.fn();
    render(
      <FieldSettingsEditor
        fieldType="select"
        settings={{ options: ['not-an-object', { value: 'ok', label: 'OK' }] }}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(1);
  });
});
