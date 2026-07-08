import 'server-only';
import { env } from '../env';

type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body?: ApiErrorBody,
  ) {
    super(
      Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? `API error (${status})`),
    );
    this.name = 'ApiClientError';
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${env.API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as
      | ApiErrorBody
      | undefined;
    throw new ApiClientError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}
