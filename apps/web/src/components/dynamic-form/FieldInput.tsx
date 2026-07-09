import type { FieldDefinition } from '@/types/api';
import { Input, inputClassName } from '@/components/ui/input';
import { getSelectOptions } from './field-settings';

type Props = {
  field: FieldDefinition;
  name: string;
  defaultValue?: unknown;
};

// Native <input>/<select> elements only — the dynamic form relies on
// uncontrolled FormData submission (see lib/submission-form-data.ts), so
// field values must never be lifted into React state. `select` is styled to
// match `Input` by reusing its className directly rather than depending on
// a compound component that wouldn't participate in native form submission
// (shadcn's `Select` renders a Radix listbox, not a real <select>).
export function FieldInput({ field, name, defaultValue }: Props) {
  const settings = field.settings;

  switch (field.fieldType) {
    case 'text':
      return (
        <Input
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
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'number' ? defaultValue : ''}
          min={typeof settings.min === 'number' ? settings.min : undefined}
          max={typeof settings.max === 'number' ? settings.max : undefined}
          step={typeof settings.step === 'number' ? settings.step : 'any'}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          id={name}
          name={name}
          required={field.required}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          min={typeof settings.min === 'string' ? settings.min : undefined}
          max={typeof settings.max === 'string' ? settings.max : undefined}
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
          className={inputClassName}
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
