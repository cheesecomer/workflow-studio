import { render, screen } from '@testing-library/react';
import { ReadOnlyFieldValue } from './ReadOnlyFieldValue';
import type { FieldDefinition } from '@/types/api';

const textField: FieldDefinition = {
  id: '1',
  key: 'subject',
  label: '件名',
  fieldType: 'text',
  required: true,
  position: 1,
  settings: {},
};

const numberField: FieldDefinition = {
  id: '2',
  key: 'amount',
  label: '金額',
  fieldType: 'number',
  required: true,
  position: 1,
  settings: {},
};

const dateField: FieldDefinition = {
  id: '3',
  key: 'date',
  label: '日付',
  fieldType: 'date',
  required: true,
  position: 1,
  settings: {},
};

const selectField: FieldDefinition = {
  id: '4',
  key: 'method',
  label: '交通手段',
  fieldType: 'select',
  required: false,
  position: 1,
  settings: { options: [{ value: 'train', label: '電車' }] },
};

describe('ReadOnlyFieldValue', () => {
  it('renders a placeholder for null values', () => {
    render(<ReadOnlyFieldValue field={textField} value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a placeholder for empty string values', () => {
    render(<ReadOnlyFieldValue field={textField} value="" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders number values with locale formatting', () => {
    render(<ReadOnlyFieldValue field={numberField} value={12000} />);
    expect(screen.getByText('12,000')).toBeInTheDocument();
  });

  it('renders date values formatted for ja-JP', () => {
    render(<ReadOnlyFieldValue field={dateField} value="2026-06-30" />);
    expect(
      screen.getByText(new Date('2026-06-30').toLocaleDateString('ja-JP')),
    ).toBeInTheDocument();
  });

  it('resolves select values to their option label', () => {
    render(<ReadOnlyFieldValue field={selectField} value="train" />);
    expect(screen.getByText('電車')).toBeInTheDocument();
  });

  it('falls back to the raw value when a select option is not found', () => {
    render(<ReadOnlyFieldValue field={selectField} value="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('falls back to the raw value when settings.options is malformed', () => {
    const malformedSelectField: FieldDefinition = {
      ...selectField,
      settings: { options: ['not-an-object'] },
    };
    render(<ReadOnlyFieldValue field={malformedSelectField} value="train" />);
    expect(screen.getByText('train')).toBeInTheDocument();
  });

  it('renders text values as-is', () => {
    render(<ReadOnlyFieldValue field={textField} value="出張申請" />);
    expect(screen.getByText('出張申請')).toBeInTheDocument();
  });
});
