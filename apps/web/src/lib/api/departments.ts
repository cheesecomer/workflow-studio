import 'server-only';
import { apiRequest } from './client';
import type { Department } from '@/types/api';

export function listDepartments(): Promise<Department[]> {
  return apiRequest('/departments');
}
