'use client';

import type { Dispatch } from 'react';
import { Input, inputClassName } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DepartmentScope, Position, PositionOperator } from '@/types/api';
import type { ApprovalRequirementEditorState } from './document-draft-state';
import type { DocumentBuilderAction } from './document-draft-reducer';

const departmentScopeOptions: { value: DepartmentScope; label: string }[] = [
  { value: 'same_tree', label: '同一ツリー' },
  { value: 'same_department', label: '同一部門' },
  { value: 'entire_company', label: '全社' },
];

const positionOperatorOptions: { value: PositionOperator; label: string }[] = [
  { value: 'eq', label: '指定役職と一致' },
  { value: 'gte', label: '指定役職以上' },
  { value: 'between', label: '指定役職以上・上限以下' },
];

type Props = {
  policyId: string;
  requirement: ApprovalRequirementEditorState;
  positions: Position[];
  dispatch: Dispatch<DocumentBuilderAction>;
};

export function ApprovalRequirementEditor({
  policyId,
  requirement,
  positions,
  dispatch,
}: Props) {
  const update = (patch: Partial<Omit<ApprovalRequirementEditorState, 'id'>>) =>
    dispatch({
      type: 'UPDATE_REQUIREMENT',
      policyId,
      requirementId: requirement.id,
      patch,
    });

  return (
    <div className="border-border flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <label className="flex flex-1 flex-col gap-1 text-xs">
        <span>要件名</span>
        <Input
          value={requirement.name}
          onChange={(event) => update({ name: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span>部署範囲</span>
        <select
          className={inputClassName}
          value={requirement.departmentScope}
          onChange={(event) =>
            update({ departmentScope: event.target.value as DepartmentScope })
          }
        >
          {departmentScopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span>役職条件</span>
        <select
          className={inputClassName}
          value={requirement.positionOperator}
          onChange={(event) =>
            update({ positionOperator: event.target.value as PositionOperator })
          }
        >
          {positionOperatorOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span>役職</span>
        <select
          className={inputClassName}
          value={requirement.positionId}
          onChange={(event) => update({ positionId: event.target.value })}
        >
          <option value="">選択してください</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.name}
            </option>
          ))}
        </select>
      </label>
      {requirement.positionOperator === 'between' && (
        <label className="flex flex-col gap-1 text-xs">
          <span>上限役職</span>
          <select
            className={inputClassName}
            value={requirement.upperPositionId ?? ''}
            onChange={(event) =>
              update({ upperPositionId: event.target.value || null })
            }
          >
            <option value="">選択してください</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex w-24 flex-col gap-1 text-xs">
        <span>必要人数</span>
        <Input
          type="number"
          min={1}
          value={requirement.requiredCount}
          onChange={(event) =>
            update({
              requiredCount: Math.max(1, Number(event.target.value) || 1),
            })
          }
        />
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          dispatch({
            type: 'REMOVE_REQUIREMENT',
            policyId,
            requirementId: requirement.id,
          })
        }
      >
        削除
      </Button>
    </div>
  );
}
