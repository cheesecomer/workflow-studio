import { render, screen } from '@testing-library/react';
import { FieldInput } from './FieldInput';
import type { FieldDefinition } from '@/types/api';

describe('FieldInput', () => {
  it('renders a text input using placeholder/maxLength from settings', () => {
    const field: FieldDefinition = {
      id: '1',
      key: 'subject',
      label: '件名',
      fieldType: 'text',
      required: true,
      position: 1,
      settings: { placeholder: '件名を入力', maxLength: 100 },
    };
    render(
      <FieldInput field={field} name="fg_1.row-a.1" defaultValue="出張申請" />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveValue('出張申請');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('placeholder', '件名を入力');
    expect(input).toHaveAttribute('maxlength', '100');
    expect(input).toHaveAttribute('name', 'fg_1.row-a.1');
  });

  it('renders a number input using min/max/step from settings', () => {
    const field: FieldDefinition = {
      id: '2',
      key: 'amount',
      label: '金額',
      fieldType: 'number',
      required: false,
      position: 1,
      settings: { min: 0, max: 100000, step: 100 },
    };
    render(
      <FieldInput field={field} name="fg_1.row-a.2" defaultValue={5000} />,
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input).toHaveValue(5000);
    expect(input).not.toBeRequired();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100000');
    expect(input).toHaveAttribute('step', '100');
  });

  it('renders a date input using min/max from settings', () => {
    const field: FieldDefinition = {
      id: '3',
      key: 'date',
      label: '日付',
      fieldType: 'date',
      required: true,
      position: 1,
      settings: { min: '2026-01-01', max: '2026-12-31' },
    };
    const { container } = render(
      <FieldInput
        field={field}
        name="fg_1.row-a.3"
        defaultValue="2026-06-30"
      />,
    );

    const input = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('2026-06-30');
    expect(input).toHaveAttribute('min', '2026-01-01');
    expect(input).toHaveAttribute('max', '2026-12-31');
  });

  it('renders a select populated from settings.options', () => {
    const field: FieldDefinition = {
      id: '4',
      key: 'method',
      label: '交通手段',
      fieldType: 'select',
      required: false,
      position: 1,
      settings: {
        options: [
          { value: 'train', label: '電車' },
          { value: 'bus', label: 'バス' },
        ],
      },
    };
    render(<FieldInput field={field} name="fg_2.row-a.4" defaultValue="bus" />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toHaveValue('bus');
    expect(screen.getByRole('option', { name: '電車' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'バス' })).toBeInTheDocument();
  });

  it('renders only the placeholder option when settings.options is malformed', () => {
    const field: FieldDefinition = {
      id: '4',
      key: 'method',
      label: '交通手段',
      fieldType: 'select',
      required: false,
      position: 1,
      settings: { options: ['not-an-object', { value: 'train' }] },
    };
    render(<FieldInput field={field} name="fg_2.row-a.4" />);

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(
      screen.getByRole('option', { name: '選択してください' }),
    ).toBeInTheDocument();
  });
});
