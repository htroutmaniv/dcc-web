const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFormData<T>(path: string, formData: FormData, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    method: init?.method ?? 'POST',
    credentials: 'include',
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { message?: string; error?: unknown }).error;
    const msg =
      (body as { message?: string }).message ??
      (typeof err === 'string' ? err : err ? JSON.stringify(err) : undefined) ??
      res.statusText;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body != null && init.body !== '';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body as { message?: string; error?: unknown }).error;
    const msg =
      (body as { message?: string }).message ??
      (typeof err === 'string' ? err : err ? JSON.stringify(err) : undefined) ??
      res.statusText;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}
