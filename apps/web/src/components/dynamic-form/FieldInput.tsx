import type { FieldDefinition } from '@/types/api';
import { getSelectOptions } from './field-settings';

type Props = {
  field: FieldDefinition;
  name: string;
  defaultValue?: unknown;
};

// Native <input>/<select> elements only — the dynamic form relies on
// uncontrolled FormData submission (see lib/submission-form-data.ts), so
// field values must never be lifted into React state. Styled to match the
// shadcn `Input` look without depending on a compound component that
// wouldn't participate in native form submission (shadcn's `Select` renders
// a Radix listbox, not a real <select>).
const fieldClassName =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 flex h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50';

export function FieldInput({ field, name, defaultValue }: Props) {
  const settings = field.settings;

  switch (field.fieldType) {
    case 'text':
      return (
        <input
          type="text"
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          placeholder={
            typeof settings.placeholder === 'string'
              ? settings.placeholder
              : undefined
          }
          maxLength={
            typeof settings.maxLength === 'number'
              ? settings.maxLength
              : undefined
          }
          className={fieldClassName}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'number' ? defaultValue : ''}
          min={typeof settings.min === 'number' ? settings.min : undefined}
          max={typeof settings.max === 'number' ? settings.max : undefined}
          step={typeof settings.step === 'number' ? settings.step : 'any'}
          className={fieldClassName}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          min={typeof settings.min === 'string' ? settings.min : undefined}
          max={typeof settings.max === 'string' ? settings.max : undefined}
          className={fieldClassName}
        />
      );

    case 'select': {
      const options = getSelectOptions(settings);

      return (
        <select
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          className={fieldClassName}
        >
          <option value="">選択してください</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
  }
}
