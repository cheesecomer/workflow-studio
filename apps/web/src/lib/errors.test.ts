vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { notFound } from 'next/navigation';
import { ApiClientError } from './api/client';
import { fetchOrNotFound, toActionErrorMessage } from './errors';

describe('toActionErrorMessage', () => {
  it('returns the raw message for 400', () => {
    const error = new ApiClientError(400, {
      statusCode: 400,
      message: 'name must be a string',
    });
    expect(toActionErrorMessage(error)).toBe('name must be a string');
  });

  it('returns a fixed message for 403', () => {
    const error = new ApiClientError(403, {
      statusCode: 403,
      message: 'Forbidden',
    });
    expect(toActionErrorMessage(error)).toBe(
      'この操作を行う権限がありません',
    );
  });

  it('returns a fixed message for 404', () => {
    const error = new ApiClientError(404, {
      statusCode: 404,
      message: 'Not Found',
    });
    expect(toActionErrorMessage(error)).toBe('対象が見つかりませんでした');
  });

  it('returns a generic message for other statuses', () => {
    const error = new ApiClientError(500, {
      statusCode: 500,
      message: 'Internal Server Error',
    });
    expect(toActionErrorMessage(error)).toBe('サーバーエラーが発生しました');
  });
});

describe('fetchOrNotFound', () => {
  afterEach(() => {
    vi.mocked(notFound).mockClear();
  });

  it('resolves with the value on success', async () => {
    await expect(fetchOrNotFound(Promise.resolve('ok'))).resolves.toBe('ok');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('calls notFound() for a 404 ApiClientError', async () => {
    const error = new ApiClientError(404, {
      statusCode: 404,
      message: 'Not Found',
    });

    await expect(fetchOrNotFound(Promise.reject(error))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-404 ApiClientErrors without calling notFound()', async () => {
    const error = new ApiClientError(500, {
      statusCode: 500,
      message: 'boom',
    });

    await expect(fetchOrNotFound(Promise.reject(error))).rejects.toBe(error);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('rethrows non-ApiClientError errors without calling notFound()', async () => {
    const error = new Error('unexpected');

    await expect(fetchOrNotFound(Promise.reject(error))).rejects.toBe(error);
    expect(notFound).not.toHaveBeenCalled();
  });
});
