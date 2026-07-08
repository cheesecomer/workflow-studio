'use client';

import { useState } from 'react';
import type { FieldGroupDefinition, FieldGroupRowInput } from '@/types/api';
import { buildFieldName } from '@/lib/submission-form-data';
import { FieldInput } from './FieldInput';

type Props = {
  group: FieldGroupDefinition;
  initialRows?: FieldGroupRowInput[];
};

type Row = {
  key: string;
  // Captured once per row at creation time — never looked up by array index
  // at render time, so removing/adding rows can't shift which initial
  // values a given (already-mounted) row shows.
  initialRow?: FieldGroupRowInput;
};

function createInitialRows(
  group: FieldGroupDefinition,
  initialRows: FieldGroupRowInput[] | undefined,
): Row[] {
  if (initialRows && initialRows.length > 0) {
    return initialRows.map((initialRow) => ({
      key: crypto.randomUUID(),
      initialRow,
    }));
  }

  const count = Math.max(group.minRows, group.repeatable ? 0 : 1);
  return Array.from({ length: count }, () => ({ key: crypto.randomUUID() }));
}

export function FieldGroupRows({ group, initialRows }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    createInitialRows(group, initialRows),
  );

  const addRow = () => {
    setRows((prev) => [...prev, { key: crypto.randomUUID() }]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-medium">{group.label}</legend>
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="border-border flex flex-col gap-3 rounded-lg border p-3"
        >
          {group.repeatable && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {index + 1}行目
              </span>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length <= group.minRows}
                className="text-destructive text-xs disabled:opacity-40"
              >
                削除
              </button>
            </div>
          )}
          {group.fieldDefinitions.map((field) => {
            const name = buildFieldName(group.id, row.key, field.id);
            const initialValue = row.initialRow?.fieldValues.find(
              (fieldValue) => fieldValue.fieldDefinitionId === field.id,
            )?.value;

            return (
              <label key={field.id} className="flex flex-col gap-1 text-sm">
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive"> *</span>
                  )}
                </span>
                <FieldInput
                  field={field}
                  name={name}
                  defaultValue={initialValue}
                />
              </label>
            );
          })}
        </div>
      ))}
      {group.repeatable && (
        <button
          type="button"
          onClick={addRow}
          className="border-input text-sm font-medium hover:bg-muted w-fit rounded-lg border px-3 py-1"
        >
          行を追加
        </button>
      )}
    </fieldset>
  );
}
