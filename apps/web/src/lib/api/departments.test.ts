vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './client';
import { listDepartments } from './departments';

describe('listDepartments', () => {
  it('requests GET /departments and returns the parsed result', async () => {
    const departments = [{ id: '1', parentId: null, name: '本部' }];
    vi.mocked(apiRequest).mockResolvedValue(departments);

    await expect(listDepartments()).resolves.toBe(departments);

    expect(apiRequest).toHaveBeenCalledWith('/departments');
  });
});
