'use client';

import type { Dispatch } from 'react';
import { Input, inputClassName } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FieldType } from '@/types/api';
import type { FieldEditorState } from './document-draft-state';
import type { DocumentBuilderAction } from './document-draft-reducer';
import { FieldSettingsEditor } from './FieldSettingsEditor';

const fieldTypeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'select', label: '選択肢' },
];

type Props = {
  groupId: string;
  field: FieldEditorState;
  dispatch: Dispatch<DocumentBuilderAction>;
};

export function FieldEditor({ groupId, field, dispatch }: Props) {
  const update = (patch: Partial<Omit<FieldEditorState, 'id'>>) =>
    dispatch({ type: 'UPDATE_FIELD', groupId, fieldId: field.id, patch });

  return (
    <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span>ラベル</span>
          <Input
            value={field.label}
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>
        <label className="flex w-32 flex-col gap-1 text-xs">
          <span>種類</span>
          <select
            className={inputClassName}
            value={field.fieldType}
            onChange={(event) =>
              update({
                fieldType: event.target.value as FieldType,
                settings: {},
              })
            }
          >
            {fieldTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => update({ required: event.target.checked })}
          />
          必須
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            dispatch({ type: 'REMOVE_FIELD', groupId, fieldId: field.id })
          }
        >
          削除
        </Button>
      </div>
      <FieldSettingsEditor
        fieldType={field.fieldType}
        settings={field.settings}
        onChange={(settings) => update({ settings })}
      />
    </div>
  );
}
