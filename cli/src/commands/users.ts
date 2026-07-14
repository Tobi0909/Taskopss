import { apiRequest } from '../apiClient';
import { UserSummary } from '../types';
import { action, table } from '../output';

export const usersListCommand = action(async (opts: { json?: boolean }) => {
  const users = await apiRequest<UserSummary[]>('GET', '/users');
  if (opts.json) {
    console.log(JSON.stringify(users, null, 2));
    return;
  }
  table(users.map((u) => ({ email: u.email, name: u.name, role: u.role, id: u.id })));
});
