'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">エラーが発生しました</h1>
      <p className="text-muted-foreground max-w-md text-sm">{error.message}</p>
      <Button variant="outline" onClick={() => unstable_retry()}>
        再試行
      </Button>
    </main>
  );
}
