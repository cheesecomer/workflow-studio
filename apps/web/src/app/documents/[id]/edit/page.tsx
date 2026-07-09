import { getDocument } from '@/lib/api/documents';
import { listPositions } from '@/lib/api/positions';
import { fetchOrNotFound } from '@/lib/errors';
import { DocumentFormBuilder } from '@/components/form-builder/DocumentFormBuilder';

// Same reasoning as the other /documents routes — always reads live
// backend data, so it can't be statically prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function DocumentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, positions] = await Promise.all([
    fetchOrNotFound(getDocument(id)),
    listPositions(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">{document.name} の編集</h1>
      <DocumentFormBuilder document={document} positions={positions} />
    </main>
  );
}
