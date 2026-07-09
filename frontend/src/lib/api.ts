import type { ApiError } from '@/types/api';

let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthFailure(cb: (() => void) | null) {
  onAuthFailure = cb;
}

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  isRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, isRetry, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && !isRetry && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, isRetry: true });
    }
    setAccessToken(null);
    onAuthFailure?.();
    throw new ApiRequestError(401, 'Phiên đăng nhập đã hết hạn');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json() : undefined;

  if (!res.ok) {
    const err = data as ApiError | undefined;
    const message = Array.isArray(err?.message) ? err.message.join(', ') : err?.message;
    throw new ApiRequestError(res.status, message ?? 'Có lỗi xảy ra');
  }

  return data as T;
}

export async function downloadFile(path: string, filename: string, isRetry = false): Promise<void> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return downloadFile(path, filename, true);
    }
    setAccessToken(null);
    onAuthFailure?.();
    throw new ApiRequestError(401, 'Phiên đăng nhập đã hết hạn');
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, 'Không tải được file');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export { refreshAccessToken };
