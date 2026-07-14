import prompts from 'prompts';
import { login as apiLogin } from '../apiClient';
import { loadConfig, normalizeApiUrl, saveConfig } from '../config';
import { action } from '../output';

export const loginCommand = action(async (opts: { url?: string }) => {
  const existing = loadConfig();

  let apiUrl = opts.url ? normalizeApiUrl(opts.url) : existing.apiUrl;
  if (!apiUrl) {
    const res = await prompts({
      type: 'text',
      name: 'url',
      message: 'Địa chỉ backend TaskOps (VD: http://localhost:4000 hoặc http://server:8080)',
    });
    if (!res.url) {
      console.error('Đã huỷ.');
      process.exit(1);
    }
    apiUrl = normalizeApiUrl(res.url);
  }

  const creds = await prompts([
    { type: 'text', name: 'email', message: 'Email' },
    { type: 'password', name: 'password', message: 'Mật khẩu' },
  ]);
  if (!creds.email || !creds.password) {
    console.error('Đã huỷ.');
    process.exit(1);
  }

  const { accessToken, refreshToken, user } = await apiLogin(apiUrl, creds.email, creds.password);
  saveConfig({ apiUrl, accessToken, refreshToken, user });
  console.log(`Đăng nhập thành công với tư cách ${user?.name} <${user?.email}> (${user?.role}).`);
});
