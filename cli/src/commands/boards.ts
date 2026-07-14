import { apiRequest } from '../apiClient';
import { resolveBoard } from '../resolve';
import { Board, BoardWithColumns } from '../types';
import { action, table } from '../output';

export const boardsListCommand = action(async (opts: { json?: boolean }) => {
  const boards = await apiRequest<Board[]>('GET', '/boards');
  if (opts.json) {
    console.log(JSON.stringify(boards, null, 2));
    return;
  }
  table(boards.map((b) => ({ keyPrefix: b.keyPrefix, name: b.name, id: b.id })));
});

export const boardsShowCommand = action(async (boardRef: string, opts: { json?: boolean }) => {
  const board = await resolveBoard(boardRef);
  const full = await apiRequest<BoardWithColumns>('GET', `/boards/${board.id}`);
  if (opts.json) {
    console.log(JSON.stringify(full, null, 2));
    return;
  }
  console.log(`${full.name} (${full.keyPrefix}) — id: ${full.id}`);
  table(
    full.columns
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        name: c.name,
        doneColumn: c.isDoneColumn ? 'yes' : '',
        id: c.id,
      })),
  );
});
