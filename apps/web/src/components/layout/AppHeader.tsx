import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <span className="text-lg font-semibold">Workflow Studio</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/documents" className="hover:underline">
            申請書管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
