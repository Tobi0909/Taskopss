import { CliConfig, loadConfig, saveConfig, requireSession } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function extractRefreshCookie(res: Response): string | undefined {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return undefined;
  const match = setCookie.match(/refresh_token=([^;]+)/);
  return match?.[1];
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
    return JSON.stringify(body);
  } catch {
    return res.statusText;
  }
}

function buildUrl(apiUrl: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(apiUrl.replace(/\/$/, '') + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function rawRequest(
  apiUrl: string,
  method: string,
  path: string,
  opts: { query?: Record<string, string | undefined>; body?: unknown; accessToken?: string; refreshCookie?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.accessToken) headers['authorization'] = `Bearer ${opts.accessToken}`;
  if (opts.refreshCookie) headers['cookie'] = `refresh_token=${opts.refreshCookie}`;

  return fetch(buildUrl(apiUrl, path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/** Đăng nhập bằng email/mật khẩu, trả về access token + refresh token cookie + user. */
export async function login(
  apiUrl: string,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: CliConfig['user'] }> {
  const res = await rawRequest(apiUrl, 'POST', '/auth/login', { body: { email, password } });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  const refreshToken = extractRefreshCookie(res);
  if (!refreshToken) throw new Error('Không nhận được refresh token từ server');
  const body = (await res.json()) as { accessToken: string; user: CliConfig['user'] };
  return { accessToken: body.accessToken, refreshToken, user: body.user };
}

async function refreshSession(config: CliConfig): Promise<{ accessToken: string }> {
  if (!config.apiUrl || !config.refreshToken) {
    throw new ApiError(401, 'Phiên đã hết hạn, vui lòng chạy `taskops login`');
  }
  const res = await rawRequest(config.apiUrl, 'POST', '/auth/refresh', {
    refreshCookie: config.refreshToken,
  });
  if (!res.ok) {
    throw new ApiError(401, 'Phiên đã hết hạn, vui lòng chạy `taskops login`');
  }
  const refreshToken = extractRefreshCookie(res) ?? config.refreshToken;
  const body = (await res.json()) as { accessToken: string; user: CliConfig['user'] };
  const next: CliConfig = { ...config, accessToken: body.accessToken, refreshToken, user: body.user };
  saveConfig(next);
  return { accessToken: body.accessToken };
}

export interface RequestOptions {
  query?: Record<string, string | undefined>;
  body?: unknown;
}

/** Nếu có TASKOPS_API_TOKEN, dùng thẳng token đó thay vì phiên đăng nhập đã lưu. */
function envTokenSession(): { apiUrl: string; accessToken: string } | undefined {
  const accessToken = process.env.TASKOPS_API_TOKEN;
  if (!accessToken) return undefined;
  const apiUrl = process.env.TASKOPS_API_URL;
  if (!apiUrl) {
    console.error('Đã đặt TASKOPS_API_TOKEN nhưng thiếu TASKOPS_API_URL.');
    process.exit(1);
  }
  return { apiUrl: normalizeApiUrlIfNeeded(apiUrl), accessToken };
}

function normalizeApiUrlIfNeeded(apiUrl: string): string {
  return /\/api$/.test(apiUrl.replace(/\/+$/, '')) ? apiUrl.replace(/\/+$/, '') : `${apiUrl.replace(/\/+$/, '')}/api`;
}

/** Gọi API đã xác thực; tự refresh access token một lần nếu gặp 401 (bỏ qua nếu dùng API token qua env). */
export async function apiRequest<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const envSession = envTokenSession();
  if (envSession) {
    const res = await rawRequest(envSession.apiUrl, method, path, {
      query: opts.query,
      body: opts.body,
      accessToken: envSession.accessToken,
    });
    if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const config = loadConfig();
  requireSession(config);
  const apiUrl = config.apiUrl;
  let accessToken = config.accessToken;

  let res = await rawRequest(apiUrl, method, path, {
    query: opts.query,
    body: opts.body,
    accessToken,
  });

  if (res.status === 401) {
    accessToken = (await refreshSession(config)).accessToken;
    res = await rawRequest(apiUrl, method, path, {
      query: opts.query,
      body: opts.body,
      accessToken,
    });
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
