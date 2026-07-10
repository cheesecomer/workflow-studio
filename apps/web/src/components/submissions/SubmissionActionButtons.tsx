import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import {
  deleteSubmissionAction,
  submitSubmissionDirectlyAction,
  withdrawSubmissionAction,
} from '@/lib/actions/submissions';
import type { SubmissionAvailableAction } from '@/types/api';

type Props = {
  id: string;
  availableActions: SubmissionAvailableAction[];
};

export function SubmissionActionButtons({ id, availableActions }: Props) {
  return (
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
  );
}
