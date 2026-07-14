import { apiRequest } from '../apiClient';
import { Tag } from '../types';
import { action, table } from '../output';

export const tagsListCommand = action(async (opts: { json?: boolean }) => {
  const tags = await apiRequest<Tag[]>('GET', '/tags');
  if (opts.json) {
    console.log(JSON.stringify(tags, null, 2));
    return;
  }
  table(tags.map((t) => ({ name: t.name, color: t.color, id: t.id })));
});
