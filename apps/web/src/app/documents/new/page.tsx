import { NewDocumentForm } from './NewDocumentForm';

export default function NewDocumentPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">申請書の新規作成</h1>
      <NewDocumentForm />
    </main>
  );
}
