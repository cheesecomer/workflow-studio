vi.mock('server-only', () => ({}));
vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiRequest: vi.fn(),
}));

import { apiRequest } from './client';
import {
  approveSubmission,
  createSubmission,
  deleteSubmission,
  getSubmission,
  listApprovableSubmissions,
  listSubmissions,
  rejectSubmission,
  submitSubmission,
  updateSubmission,
  withdrawSubmission,
} from './submissions';

describe('submissions API client', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  describe('listSubmissions', () => {
    it('requests GET /submissions with no query string by default', async () => {
      const result = { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      vi.mocked(apiRequest).mockResolvedValue(result);

      await expect(listSubmissions()).resolves.toBe(result);
      expect(apiRequest).toHaveBeenCalledWith('/submissions');
    });

    it('builds a query string from status/page/limit', async () => {
      vi.mocked(apiRequest).mockResolvedValue({
        items: [],
        meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      await listSubmissions({ status: 'draft', page: 2, limit: 10 });

      expect(apiRequest).toHaveBeenCalledWith(
        '/submissions?status=draft&page=2&limit=10',
      );
    });
  });

  describe('listApprovableSubmissions', () => {
    it('requests GET /submissions/approvable with no query string by default', async () => {
      vi.mocked(apiRequest).mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await listApprovableSubmissions();

      expect(apiRequest).toHaveBeenCalledWith('/submissions/approvable');
    });

    it('builds a query string from page/limit', async () => {
      vi.mocked(apiRequest).mockResolvedValue({
        items: [],
        meta: { page: 3, limit: 5, total: 0, totalPages: 0 },
      });

      await listApprovableSubmissions({ page: 3, limit: 5 });

      expect(apiRequest).toHaveBeenCalledWith(
        '/submissions/approvable?page=3&limit=5',
      );
    });
  });

  it('getSubmission requests GET /submissions/:id', async () => {
    const submission = { id: '1' };
    vi.mocked(apiRequest).mockResolvedValue(submission);

    await expect(getSubmission('1')).resolves.toBe(submission);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1');
  });

  it('createSubmission posts to /submissions', async () => {
    const created = { id: '1', fieldGroupRows: [] };
    vi.mocked(apiRequest).mockResolvedValue(created);

    const input = {
      documentDefinitionId: '10',
      fieldGroupRows: [
        { fieldGroupDefinitionId: '1', position: 1, fieldValues: [] },
      ],
    };
    await expect(createSubmission(input)).resolves.toBe(created);

    expect(apiRequest).toHaveBeenCalledWith('/submissions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });

  it('updateSubmission patches /submissions/:id', async () => {
    const updated = { id: '1', fieldGroupRows: [] };
    vi.mocked(apiRequest).mockResolvedValue(updated);

    const input = { fieldGroupRows: [] };
    await expect(updateSubmission('1', input)).resolves.toBe(updated);

    expect(apiRequest).toHaveBeenCalledWith('/submissions/1', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  });

  it('deleteSubmission deletes /submissions/:id', async () => {
    const deleted = { id: '1' };
    vi.mocked(apiRequest).mockResolvedValue(deleted);

    await expect(deleteSubmission('1')).resolves.toBe(deleted);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1', {
      method: 'DELETE',
    });
  });

  it('submitSubmission posts to /submissions/:id/submit', async () => {
    const submitted = { id: '1', status: 'submitted' };
    vi.mocked(apiRequest).mockResolvedValue(submitted);

    await expect(submitSubmission('1')).resolves.toBe(submitted);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/submit', {
      method: 'POST',
    });
  });

  it('approveSubmission posts a comment to /submissions/:id/approve', async () => {
    const approved = { id: '1', status: 'submitted' };
    vi.mocked(apiRequest).mockResolvedValue(approved);

    await expect(approveSubmission('1', 'LGTM')).resolves.toBe(approved);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/approve', {
      method: 'POST',
      body: JSON.stringify({ comment: 'LGTM' }),
    });
  });

  it('approveSubmission sends no body when comment is omitted', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: '1', status: 'submitted' });

    await approveSubmission('1');

    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/approve', {
      method: 'POST',
      body: undefined,
    });
  });

  it('rejectSubmission posts a comment to /submissions/:id/reject', async () => {
    const rejected = { id: '1', status: 'submitted' };
    vi.mocked(apiRequest).mockResolvedValue(rejected);

    await expect(rejectSubmission('1', '差し戻し')).resolves.toBe(rejected);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/reject', {
      method: 'POST',
      body: JSON.stringify({ comment: '差し戻し' }),
    });
  });

  it('rejectSubmission sends no body when comment is omitted', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: '1', status: 'submitted' });

    await rejectSubmission('1');

    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/reject', {
      method: 'POST',
      body: undefined,
    });
  });

  it('withdrawSubmission posts to /submissions/:id/withdraw with no body', async () => {
    const withdrawn = { id: '1', status: 'withdrawn' };
    vi.mocked(apiRequest).mockResolvedValue(withdrawn);

    await expect(withdrawSubmission('1')).resolves.toBe(withdrawn);
    expect(apiRequest).toHaveBeenCalledWith('/submissions/1/withdraw', {
      method: 'POST',
    });
  });
});
