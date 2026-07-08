vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './client';
import { listPositions } from './positions';

describe('listPositions', () => {
  it('requests GET /positions and returns the parsed result', async () => {
    const positions = [{ id: '1', name: '社員', rank: 10 }];
    vi.mocked(apiRequest).mockResolvedValue(positions);

    await expect(listPositions()).resolves.toBe(positions);

    expect(apiRequest).toHaveBeenCalledWith('/positions');
  });
});
