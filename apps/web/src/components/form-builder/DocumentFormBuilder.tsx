'use client';

import { useReducer, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DocumentWithCurrentDefinition, Position } from '@/types/api';
import {
  publishDocumentAction,
  updateDocumentAction,
} from '@/lib/actions/documents';
import {
  buildDocumentDraft,
  parseDocumentDraft,
} from './document-draft-state';
import { documentBuilderReducer } from './document-draft-reducer';
import { FieldGroupEditor } from './FieldGroupEditor';
import { ApprovalPolicyEditor } from './ApprovalPolicyEditor';

type Props = {
  document: DocumentWithCurrentDefinition;
  positions: Position[];
};

export function DocumentFormBuilder({ document, positions }: Props) {
  const [name, setName] = useState(document.name);
  const [state, dispatch] = useReducer(
    documentBuilderReducer,
    document.draftContent,
    parseDocumentDraft,
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
  } | null>(null);

  const handleSaveDraft = () => {
    startTransition(async () => {
      const draftContent = buildDocumentDraft(state);
      const response = await updateDocumentAction(document.id, {
        name,
        draftContent,
      });
      setResult(response);
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      const draftContent = buildDocumentDraft(state);
      const response = await publishDocumentAction(document.id, {
        name,
        draftContent,
      });
      // On success publishDocumentAction redirects (throws internally) and
      // never returns; a returned value here always means it failed.
      if (response) {
        setResult(response);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {result && !result.ok && result.message && (
        <p role="alert" className="text-destructive text-sm">
          {result.message}
        </p>
      )}
      {result?.ok && result.message && (
        <p role="status" className="text-sm text-green-700 dark:text-green-500">
          {result.message}
        </p>
      )}

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span>申請書名</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={255}
        />
      </label>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">項目グループ</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'ADD_GROUP' })}
          >
            グループを追加
          </Button>
        </div>
        {state.groups.map((group) => (
          <FieldGroupEditor key={group.id} group={group} dispatch={dispatch} />
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">承認ポリシー</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'ADD_POLICY' })}
          >
            ポリシーを追加
          </Button>
        </div>
        {state.policies.map((policy) => (
          <ApprovalPolicyEditor
            key={policy.id}
            policy={policy}
            positions={positions}
            dispatch={dispatch}
          />
        ))}
      </section>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleSaveDraft}
        >
          下書き保存
        </Button>
        <Button type="button" disabled={isPending} onClick={handlePublish}>
          公開
        </Button>
      </div>
    </div>
  );
}
