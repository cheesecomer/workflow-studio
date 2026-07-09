import type { FieldDefinition } from '@/types/api';
import { getSelectOptions } from './field-settings';

type Props = {
  field: FieldDefinition;
  value: unknown;
};

export function ReadOnlyFieldValue({ field, value }: Props) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (field.fieldType) {
    case 'select': {
      const options = getSelectOptions(field.settings);
      const option = options.find((candidate) => candidate.value === value);
      return <span>{option?.label ?? String(value)}</span>;
    }

    case 'date':
      return (
        <span>
          {typeof value === 'string'
            ? new Date(value).toLocaleDateString('ja-JP')
            : String(value)}
        </span>
      );

    case 'number':
      return (
        <span>
          {typeof value === 'number'
            ? value.toLocaleString('ja-JP')
            : String(value)}
        </span>
      );

    case 'text':
    default:
      return <span>{String(value)}</span>;
  }
}
