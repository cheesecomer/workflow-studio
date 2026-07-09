'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSelectOptions } from '@/components/dynamic-form/field-settings';
import type { FieldType } from '@/types/api';

type Props = {
  fieldType: FieldType;
  settings: Record<string, unknown>;
  onChange: (settings: Record<string, unknown>) => void;
};

export function FieldSettingsEditor({ fieldType, settings, onChange }: Props) {
  switch (fieldType) {
    case 'text':
      return (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>プレースホルダー</span>
            <Input
              value={
                typeof settings.placeholder === 'string'
                  ? settings.placeholder
                  : ''
              }
              onChange={(event) =>
                onChange({ ...settings, placeholder: event.target.value })
              }
            />
          </label>
          <label className="flex w-32 flex-col gap-1 text-xs">
            <span>最大文字数</span>
            <Input
              type="number"
              value={
                typeof settings.maxLength === 'number' ? settings.maxLength : ''
              }
              onChange={(event) =>
                onChange({
                  ...settings,
                  maxLength:
                    event.target.value === ''
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      );

    case 'number':
      return (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>最小値</span>
            <Input
              type="number"
              value={typeof settings.min === 'number' ? settings.min : ''}
              onChange={(event) =>
                onChange({
                  ...settings,
                  min:
                    event.target.value === ''
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>最大値</span>
            <Input
              type="number"
              value={typeof settings.max === 'number' ? settings.max : ''}
              onChange={(event) =>
                onChange({
                  ...settings,
                  max:
                    event.target.value === ''
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>刻み幅</span>
            <Input
              type="number"
              value={typeof settings.step === 'number' ? settings.step : ''}
              onChange={(event) =>
                onChange({
                  ...settings,
                  step:
                    event.target.value === ''
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      );

    case 'date':
      return (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>最小日付</span>
            <Input
              type="date"
              value={typeof settings.min === 'string' ? settings.min : ''}
              onChange={(event) =>
                onChange({ ...settings, min: event.target.value || undefined })
              }
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span>最大日付</span>
            <Input
              type="date"
              value={typeof settings.max === 'string' ? settings.max : ''}
              onChange={(event) =>
                onChange({ ...settings, max: event.target.value || undefined })
              }
            />
          </label>
        </div>
      );

    case 'select': {
      const options = getSelectOptions(settings);

      const updateOptions = (next: { value: string; label: string }[]) => {
        onChange({ ...settings, options: next });
      };

      return (
        <div className="flex flex-col gap-2">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="value"
                value={option.value}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = { ...next[index], value: event.target.value };
                  updateOptions(next);
                }}
              />
              <Input
                placeholder="ラベル"
                value={option.label}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = { ...next[index], label: event.target.value };
                  updateOptions(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateOptions(options.filter((_, i) => i !== index))
                }
              >
                削除
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => updateOptions([...options, { value: '', label: '' }])}
          >
            選択肢を追加
          </Button>
        </div>
      );
    }
  }
}
