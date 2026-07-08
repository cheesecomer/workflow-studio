vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './client';
import {
  createDocument,
  deleteDocument,
  getDocument,
  getSubmittableDocuments,
  listDocuments,
  publishDocument,
  updateDocument,
} from './documents';

describe('documents API client', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it('listDocuments requests GET /documents', async () => {
    const documents = [{ id: '1', name: 'Expense Request' }];
    vi.mocked(apiRequest).mockResolvedValue(documents);

    await expect(listDocuments()).resolves.toBe(documents);
    expect(apiRequest).toHaveBeenCalledWith('/documents');
  });

  it('getSubmittableDocuments requests GET /documents/submittable', async () => {
    const submittable = [{ id: '10', documentId: '1', name: '経費申請', version: 1 }];
    vi.mocked(apiRequest).mockResolvedValue(submittable);

    await expect(getSubmittableDocuments()).resolves.toBe(submittable);
    expect(apiRequest).toHaveBeenCalledWith('/documents/submittable');
  });

  it('getDocument requests GET /documents/:id', async () => {
    const document = { id: '1', currentDocumentDefinition: null };
    vi.mocked(apiRequest).mockResolvedValue(document);

    await expect(getDocument('1')).resolves.toBe(document);
    expect(apiRequest).toHaveBeenCalledWith('/documents/1');
  });

  it('createDocument posts to /documents', async () => {
    const created = { id: '1', name: 'Expense Request' };
    vi.mocked(apiRequest).mockResolvedValue(created);

    const input = { name: 'Expense Request', draftContent: { fields: [] } };
    await expect(createDocument(input)).resolves.toBe(created);

    expect(apiRequest).toHaveBeenCalledWith('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('updateDocument patches /documents/:id', async () => {
    const updated = { id: '1', name: 'Updated' };
    vi.mocked(apiRequest).mockResolvedValue(updated);

    const input = { name: 'Updated' };
    await expect(updateDocument('1', input)).resolves.toBe(updated);

    expect(apiRequest).toHaveBeenCalledWith('/documents/1', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  });

  it('deleteDocument deletes /documents/:id', async () => {
    const deleted = { id: '1' };
    vi.mocked(apiRequest).mockResolvedValue(deleted);

    await expect(deleteDocument('1')).resolves.toBe(deleted);
    expect(apiRequest).toHaveBeenCalledWith('/documents/1', {
      method: 'DELETE',
    });
  });

  it('publishDocument posts to /documents/:id/publish', async () => {
    const published = { id: '1', currentDocumentDefinitionId: '10' };
    vi.mocked(apiRequest).mockResolvedValue(published);

    const input = {
      name: 'Expense Request',
      draftContent: { groups: [], workflow: { policies: [] } },
    };
    await expect(publishDocument('1', input)).resolves.toBe(published);

    expect(apiRequest).toHaveBeenCalledWith('/documents/1/publish', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
});
