import { apiRequest } from './apiClient';
import { Board, BoardColumn, BoardWithColumns, Tag, UserSummary } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function resolveBoard(value: string): Promise<Board> {
  if (isUuid(value)) {
    return apiRequest<BoardWithColumns>('GET', `/boards/${value}`);
  }
  const boards = await apiRequest<Board[]>('GET', '/boards');
  const match = boards.find(
    (b) => b.keyPrefix.toLowerCase() === value.toLowerCase() || b.name.toLowerCase() === value.toLowerCase(),
  );
  if (!match) {
    throw new Error(`Không tìm thấy board khớp "${value}" (thử theo keyPrefix hoặc tên chính xác)`);
  }
  return match;
}

export async function resolveColumn(boardId: string, value: string): Promise<BoardColumn> {
  if (isUuid(value)) {
    const board = await apiRequest<BoardWithColumns>('GET', `/boards/${boardId}`);
    const column = board.columns.find((c) => c.id === value);
    if (!column) throw new Error(`Không tìm thấy cột với id "${value}" trong board này`);
    return column;
  }
  const board = await apiRequest<BoardWithColumns>('GET', `/boards/${boardId}`);
  const match = board.columns.find((c) => c.name.toLowerCase() === value.toLowerCase());
  if (!match) {
    const names = board.columns.map((c) => c.name).join(', ');
    throw new Error(`Không tìm thấy cột tên "${value}" trong board này. Các cột hiện có: ${names}`);
  }
  return match;
}

export async function resolveUser(value: string): Promise<UserSummary> {
  const users = await apiRequest<UserSummary[]>('GET', '/users');
  if (isUuid(value)) {
    const match = users.find((u) => u.id === value);
    if (!match) throw new Error(`Không tìm thấy user với id "${value}"`);
    return match;
  }
  const match = users.find((u) => u.email.toLowerCase() === value.toLowerCase());
  if (!match) throw new Error(`Không tìm thấy user với email "${value}"`);
  return match;
}

export async function resolveTags(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];
  const tags = await apiRequest<Tag[]>('GET', '/tags');
  return values.map((value) => {
    if (isUuid(value)) return value;
    const match = tags.find((t) => t.name.toLowerCase() === value.toLowerCase());
    if (!match) {
      const names = tags.map((t) => t.name).join(', ');
      throw new Error(`Không tìm thấy tag tên "${value}". Các tag hiện có: ${names}`);
    }
    return match.id;
  });
}
