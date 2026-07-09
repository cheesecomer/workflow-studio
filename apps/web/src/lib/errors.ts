import 'server-only';
import { notFound } from 'next/navigation';
import { ApiClientError } from './api/client';

export function toActionErrorMessage(error: ApiClientError): string {
  switch (error.status) {
    case 400:
      return error.message;
    case 403:
      return 'この操作を行う権限がありません';
    case 404:
      return '対象が見つかりませんでした';
    default:
      return 'サーバーエラーが発生しました';
  }
}

// For use in Server Components: 404s should render not-found.tsx, anything
// else should bubble to the nearest error.tsx (see the plan's error
// handling table) rather than being swallowed here.
export async function fetchOrNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
