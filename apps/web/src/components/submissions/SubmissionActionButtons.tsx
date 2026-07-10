import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import {
  approveSubmissionAction,
  deleteSubmissionAction,
  rejectSubmissionAction,
  submitSubmissionDirectlyAction,
  withdrawSubmissionAction,
} from '@/lib/actions/submissions';
import type { SubmissionAvailableAction } from '@/types/api';

type Props = {
  id: string;
  availableActions: SubmissionAvailableAction[];
};

export function SubmissionActionButtons({ id, availableActions }: Props) {
  const canApprove = availableActions.includes('approve');
  const canReject = availableActions.includes('reject');

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-2">
        {availableActions.includes('edit') && (
          <Link
            href={`/submissions/${id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            編集
          </Link>
        )}
        {availableActions.includes('submit') && (
          <form action={submitSubmissionDirectlyAction.bind(null, id)}>
            <ConfirmActionButton
              type="submit"
              confirmMessage="この申請を提出しますか？"
            >
              提出
            </ConfirmActionButton>
          </form>
        )}
        {availableActions.includes('withdraw') && (
          <form action={withdrawSubmissionAction.bind(null, id)}>
            <ConfirmActionButton
              type="submit"
              variant="outline"
              confirmMessage="この申請を取り下げますか？"
            >
              取り下げ
            </ConfirmActionButton>
          </form>
        )}
        {availableActions.includes('delete') && (
          <form action={deleteSubmissionAction.bind(null, id)}>
            <ConfirmActionButton
              type="submit"
              variant="destructive"
              confirmMessage="この申請を削除しますか？"
            >
              削除
            </ConfirmActionButton>
          </form>
        )}
      </div>

      {(canApprove || canReject) && (
        <form className="flex w-full flex-col items-end gap-2">
          <label className="flex w-full flex-col gap-1 text-sm">
            <span className="text-muted-foreground">コメント（任意）</span>
            <textarea
              name="comment"
              rows={2}
              className="border-input rounded-lg border px-2 py-1 text-sm"
            />
          </label>
          <div className="flex gap-2">
            {canReject && (
              <ConfirmActionButton
                type="submit"
                variant="destructive"
                formAction={rejectSubmissionAction.bind(null, id)}
                confirmMessage="この申請を却下しますか？"
              >
                却下
              </ConfirmActionButton>
            )}
            {canApprove && (
              <ConfirmActionButton
                type="submit"
                formAction={approveSubmissionAction.bind(null, id)}
                confirmMessage="この申請を承認しますか？"
              >
                承認
              </ConfirmActionButton>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
