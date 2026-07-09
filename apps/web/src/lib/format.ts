import type { FieldType } from '@/types/api';

export const fieldTypeLabel: Record<FieldType, string> = {
  text: 'テキスト',
  number: '数値',
  date: '日付',
  select: '選択肢',
};
