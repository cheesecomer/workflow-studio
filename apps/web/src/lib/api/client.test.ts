vi.mock('server-only', () => ({}));
vi.mock('../env', () => ({ env: { API_URL: 'http://api.test' } }));

import { apiRequest, ApiClientError } from './client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a GET request to API_URL and returns parsed JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ id: string }>('/documents/1');

    expect(result).toEqual({ id: '1' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/documents/1');
    expect(init.cache).toBe('no-store');
    expect((init.headers as Headers).get('Content-Type')).toBe(
      'application/json',
    );
  });

  it('forwards method, body and merges custom headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/documents', {
      method: 'POST',
      body: JSON.stringify({ name: 'Expense Request' }),
      headers: { 'X-Test': '1' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Expense Request' }));

    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Test')).toBe('1');
  });

  it('does not set a Content-Type header when sending FormData', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/documents', { method: 'POST', body: new FormData() });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
  });

  it('does not override an explicitly set Content-Type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/documents', {
      headers: { 'Content-Type': 'text/plain' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('Content-Type')).toBe('text/plain');
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
      }),
    );

    await expect(apiRequest('/submissions/1/withdraw')).resolves.toBeUndefined();
  });

  it('throws ApiClientError with the parsed error body on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            statusCode: 404,
            message: 'Submission not found',
            error: 'Not Found',
          }),
      }),
    );

    const error = await apiRequest('/submissions/999').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 404, message: 'Submission not found' });
  });

  it('joins array messages from class-validator errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            statusCode: 400,
            message: ['name must be a string', 'name should not be empty'],
          }),
      }),
    );

    await expect(apiRequest('/documents')).rejects.toThrow(
      'name must be a string, name should not be empty',
    );
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('invalid json')),
      }),
    );

    await expect(apiRequest('/documents')).rejects.toThrow('API error (500)');
  });
});
