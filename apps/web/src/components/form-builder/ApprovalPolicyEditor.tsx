'use client';

import type { Dispatch } from 'react';
import { Input, inputClassName } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ApprovalPolicyOperator, Position } from '@/types/api';
import type { ApprovalPolicyEditorState } from './document-draft-state';
import type { DocumentBuilderAction } from './document-draft-reducer';
import { ApprovalRequirementEditor } from './ApprovalRequirementEditor';

const operatorOptions: { value: ApprovalPolicyOperator; label: string }[] = [
  { value: 'all', label: 'すべて満たす' },
  { value: 'any', label: 'いずれか満たす' },
];

type Props = {
  policy: ApprovalPolicyEditorState;
  positions: Position[];
  dispatch: Dispatch<DocumentBuilderAction>;
};

export function ApprovalPolicyEditor({ policy, positions, dispatch }: Props) {
  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span>ポリシー名</span>
          <Input
            value={policy.name}
            onChange={(event) =>
              dispatch({
                type: 'UPDATE_POLICY',
                policyId: policy.id,
                patch: { name: event.target.value },
              })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span>条件</span>
          <select
            className={inputClassName}
            value={policy.operator}
            onChange={(event) =>
              dispatch({
                type: 'UPDATE_POLICY',
                policyId: policy.id,
                patch: { operator: event.target.value as ApprovalPolicyOperator },
              })
            }
          >
            {operatorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            dispatch({ type: 'REMOVE_POLICY', policyId: policy.id })
          }
        >
          ポリシーを削除
        </Button>
      </div>

      <div className="flex flex-col gap-2 pl-4">
        {policy.requirements.map((requirement) => (
          <ApprovalRequirementEditor
            key={requirement.id}
            policyId={policy.id}
            requirement={requirement}
            positions={positions}
            dispatch={dispatch}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() =>
            dispatch({ type: 'ADD_REQUIREMENT', policyId: policy.id })
          }
        >
          承認要件を追加
        </Button>
      </div>
    </div>
  );
}
