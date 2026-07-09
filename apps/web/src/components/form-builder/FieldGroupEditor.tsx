'use client';

import type { Dispatch } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FieldGroupEditorState } from './document-draft-state';
import type { DocumentBuilderAction } from './document-draft-reducer';
import { FieldEditor } from './FieldEditor';

type Props = {
  group: FieldGroupEditorState;
  dispatch: Dispatch<DocumentBuilderAction>;
};

export function FieldGroupEditor({ group, dispatch }: Props) {
  const update = (
    patch: Partial<Omit<FieldGroupEditorState, 'id' | 'fields'>>,
  ) => dispatch({ type: 'UPDATE_GROUP', groupId: group.id, patch });

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span>グループ名</span>
          <Input
            value={group.label}
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={group.repeatable}
            onChange={(event) =>
              update({ repeatable: event.target.checked })
            }
          />
          明細（複数行入力可）
        </label>
        <label className="flex w-24 flex-col gap-1 text-xs">
          <span>最小行数</span>
          <Input
            type="number"
            min={1}
            value={group.minRows}
            onChange={(event) =>
              update({
                minRows: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'REMOVE_GROUP', groupId: group.id })}
        >
          グループを削除
        </Button>
      </div>

      <div className="flex flex-col gap-2 pl-4">
        {group.fields.map((field) => (
          <FieldEditor
            key={field.id}
            groupId={group.id}
            field={field}
            dispatch={dispatch}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => dispatch({ type: 'ADD_FIELD', groupId: group.id })}
        >
          項目を追加
        </Button>
      </div>
    </div>
  );
}
