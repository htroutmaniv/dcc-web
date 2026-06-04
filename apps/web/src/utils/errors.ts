import { ApiError } from '../api/client';

export function formatError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Request failed';
}
