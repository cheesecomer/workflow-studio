vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../api/documents', () => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '../api/documents';
import { ApiClientError } from '../api/client';
import { createDocumentAction, deleteDocumentAction } from './documents';

describe('createDocumentAction', () => {
  afterEach(() => {
    vi.mocked(createDocument).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('returns a validation error when name is missing', async () => {
    const formData = new FormData();

    const result = await createDocumentAction(null, formData);

    expect(result).toEqual({
      ok: false,
      message: '申請書名を入力してください',
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('returns a validation error when name is blank', async () => {
    const formData = new FormData();
    formData.set('name', '   ');

    const result = await createDocumentAction(null, formData);

    expect(result).toEqual({
      ok: false,
      message: '申請書名を入力してください',
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('creates the document, revalidates the list, and redirects to the edit page', async () => {
    vi.mocked(createDocument).mockResolvedValue({ id: '1' } as never);
    const formData = new FormData();
    formData.set('name', '経費精算書');

    await expect(createDocumentAction(null, formData)).rejects.toThrow(
      'REDIRECT:/documents/1/edit',
    );

    expect(createDocument).toHaveBeenCalledWith({ name: '経費精算書' });
    expect(revalidatePath).toHaveBeenCalledWith('/documents');
    expect(redirect).toHaveBeenCalledWith('/documents/1/edit');
  });

  it('returns an error message and does not redirect when the API rejects', async () => {
    vi.mocked(createDocument).mockRejectedValue(
      new ApiClientError(400, {
        statusCode: 400,
        message: 'name must be a string',
      }),
    );
    const formData = new FormData();
    formData.set('name', '経費精算書');

    const result = await createDocumentAction(null, formData);

    expect(result).toEqual({ ok: false, message: 'name must be a string' });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-ApiClientError) errors', async () => {
    vi.mocked(createDocument).mockRejectedValue(new Error('network down'));
    const formData = new FormData();
    formData.set('name', '経費精算書');

    await expect(createDocumentAction(null, formData)).rejects.toThrow(
      'network down',
    );
  });
});

describe('deleteDocumentAction', () => {
  afterEach(() => {
    vi.mocked(deleteDocument).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('deletes the document, revalidates the list, and redirects to it', async () => {
    vi.mocked(deleteDocument).mockResolvedValue({ id: '1' } as never);

    await expect(deleteDocumentAction('1')).rejects.toThrow(
      'REDIRECT:/documents',
    );

    expect(deleteDocument).toHaveBeenCalledWith('1');
    expect(revalidatePath).toHaveBeenCalledWith('/documents');
    expect(redirect).toHaveBeenCalledWith('/documents');
  });
});
