import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  avatarColor: string;
}

export interface CliConfig {
  apiUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: SafeUser;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'taskops-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.chmodSync(CONFIG_FILE, 0o600);
}

export function clearConfig(): void {
  try {
    fs.rmSync(CONFIG_FILE, { force: true });
  } catch {
    // ignore
  }
}

export function requireApiUrl(config: CliConfig): string {
  if (!config.apiUrl) {
    console.error('Chưa cấu hình server. Chạy `taskops login --url <địa chỉ backend>` trước.');
    process.exit(1);
  }
  return config.apiUrl;
}

export function normalizeApiUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
}

export function requireSession(config: CliConfig): asserts config is CliConfig & {
  apiUrl: string;
  accessToken: string;
} {
  if (!config.apiUrl || !config.accessToken) {
    console.error('Chưa đăng nhập. Chạy `taskops login` trước.');
    process.exit(1);
  }
}
