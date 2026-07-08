vi.mock('server-only', () => ({}));

import { env } from './env';

describe('env', () => {
  const originalApiUrl = process.env.API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  });

  it('returns API_URL when set', () => {
    process.env.API_URL = 'http://api:3000';

    expect(env.API_URL).toBe('http://api:3000');
  });

  it('throws when API_URL is not set', () => {
    delete process.env.API_URL;

    expect(() => env.API_URL).toThrow(
      'API_URL environment variable is not set',
    );
  });
});
