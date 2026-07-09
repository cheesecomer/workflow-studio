import type { FieldType, SubmissionStatus } from '@/types/api';

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
