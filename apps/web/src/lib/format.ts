import type { FieldType, SubmissionActivity, SubmissionStatus } from '@/types/api';

export const fieldTypeLabel: Record<FieldType, string> = {
  text: 'テキスト',
  number: '数値',
  date: '日付',
  select: '選択肢',
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済み',
  rejected: '却下',
  withdrawn: '取り下げ',
};

function actorName(activity: SubmissionActivity): string | undefined {
  return activity.actor?.name ?? activity.actor?.email;
}

// Each activity type carries a different subset of fields (see
// SubmissionsService#buildActivities) — 'approved'/'rejected' are
// submission-level completions with no single actor, while
// 'approval_decision' is one approver's individual decision.
export function describeSubmissionActivity(activity: SubmissionActivity): string {
  const actor = actorName(activity);

  switch (activity.type) {
    case 'created':
      return actor ? `${actor} が申請を作成しました` : '申請が作成されました';
    case 'submitted':
      return actor ? `${actor} が提出しました` : '提出されました';
    case 'approval_decision': {
      const decisionLabel = activity.decision === 'approved' ? '承認' : '却下';
      const context = activity.approvalRequirement?.name;
      const who = actor ?? '承認者';
      const commentSuffix = activity.comment ? `「${activity.comment}」` : '';
      return context
        ? `${who} が「${context}」を${decisionLabel}しました${commentSuffix}`
        : `${who} が${decisionLabel}しました${commentSuffix}`;
    }
    case 'approved':
      return '全ての承認が完了し、申請が承認されました';
    case 'rejected':
      return '申請が却下されました';
    case 'withdrawn':
      return actor
        ? `${actor} が申請を取り下げました`
        : '申請が取り下げられました';
  }
}
