import { apiRequest } from '../apiClient';
import { clearConfig, loadConfig } from '../config';
import { action } from '../output';

export const logoutCommand = action(async () => {
  const config = loadConfig();
  if (config.apiUrl && config.accessToken) {
    try {
      await apiRequest('POST', '/auth/logout');
    } catch {
      // token đã hết hạn hoặc server không phản hồi — vẫn xoá config local
    }
  }
  clearConfig();
  console.log('Đã đăng xuất.');
});
