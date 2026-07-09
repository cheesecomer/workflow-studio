import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Real native <input> — required for uncontrolled FormData-driven forms
// (see components/dynamic-form/FieldInput.tsx). `inputClassName` is exported
// separately so non-<input> native elements (e.g. <select>) can share the
// same look without wrapping them in this component.
export const inputClassName =
  'border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 flex h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(inputClassName, className)}
      {...props}
    />
  );
}
