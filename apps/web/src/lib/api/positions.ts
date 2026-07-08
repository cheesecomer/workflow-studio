import 'server-only';
import { apiRequest } from './client';
import type { Position } from '@/types/api';

export function listPositions(): Promise<Position[]> {
  return apiRequest('/positions');
}
