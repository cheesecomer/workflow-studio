'use client';

import type { ComponentProps } from 'react';
import { Button } from './button';

type Props = {
  confirmMessage: string;
} & ComponentProps<typeof Button>;

export function ConfirmActionButton({
  confirmMessage,
  onClick,
  ...props
}: Props) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
