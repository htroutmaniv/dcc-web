const API_BASE = '/api';

/** Zod-style validation errors surfaced from API 400 responses. */
export type ApiValidationError = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public validation?: ApiValidationError,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isValidationError(value: unknown): value is ApiValidationError {
  if (!value || typeof value !== 'object') return false;
  const v = value as ApiValidationError;
  return Array.isArray(v.formErrors) && v.fieldErrors != null && typeof v.fieldErrors === 'object';
}

function extractApiError(body: unknown, statusText: string): { message: string; validation?: ApiValidationError } {
  if (!body || typeof body !== 'object') {
    return { message: statusText };
  }
  const record = body as {
    message?: string;
    error?: unknown;
    validation?: unknown;
  };

  if (isValidationError(record.validation)) {
    const parts = [
      ...record.validation.formErrors,
      ...Object.entries(record.validation.fieldErrors).flatMap(([field, msgs]) =>
        msgs.map((m) => `${field}: ${m}`),
      ),
    ];
    return {
      message: parts.join('; ') || record.message || statusText,
      validation: record.validation,
    };
  }

  const err = record.error;
  const msg =
    record.message ??
    (typeof err === 'string' ? err : err ? JSON.stringify(err) : undefined) ??
    statusText;
  return { message: msg };
}

async function parseResponseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
  });
  const body = await parseResponseBody(res);
  if (!res.ok) {
    const { message, validation } = extractApiError(body, res.statusText);
    throw new ApiError(message, res.status, validation);
  }
  return body as T;
}

export async function apiFormData<T>(
  path: string,
  formData: FormData,
  init?: RequestInit,
): Promise<T> {
  return request<T>(path, {
    ...init,
    method: init?.method ?? 'POST',
    body: formData,
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body != null && init.body !== '';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return request<T>(path, { ...init, headers });
}
