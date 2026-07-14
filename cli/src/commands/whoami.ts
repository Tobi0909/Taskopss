import { apiRequest } from '../apiClient';
import { action } from '../output';
import { SafeUser } from '../config';

export const whoamiCommand = action(async () => {
  const user = await apiRequest<SafeUser>('GET', '/auth/me');
  console.log(`${user.name} <${user.email}> — ${user.role} (id: ${user.id})`);
});
