import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">ページが見つかりません</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        お探しのページは存在しないか、削除された可能性があります。
      </p>
      <Link href="/" className="text-sm font-medium underline">
        トップに戻る
      </Link>
    </main>
  );
}
