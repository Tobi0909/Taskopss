import { apiRequest } from '../apiClient';
import { resolveBoard, resolveColumn, resolveUser, resolveTags } from '../resolve';
import { Task } from '../types';
import { action, table } from '../output';

function splitTags(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function taskRow(t: Task): Record<string, string> {
  return {
    key: t.key,
    title: t.title,
    priority: t.priority,
    column: t.column.name,
    assignee: t.assignee?.name ?? '',
    due: t.dueDate ? t.dueDate.slice(0, 10) : '',
    id: t.id,
  };
}

interface ListOpts {
  board?: string;
  assignee?: string;
  priority?: string;
  tag?: string;
  q?: string;
  overdue?: boolean;
  json?: boolean;
}

export const tasksListCommand = action(async (opts: ListOpts) => {
  const boardId = opts.board ? (await resolveBoard(opts.board)).id : undefined;
  const assigneeId = opts.assignee ? (await resolveUser(opts.assignee)).id : undefined;
  const tagId = opts.tag ? (await resolveTags([opts.tag]))[0] : undefined;

  const tasks = await apiRequest<Task[]>('GET', '/tasks', {
    query: {
      boardId,
      assigneeId,
      priority: opts.priority,
      tagId,
      q: opts.q,
      overdue: opts.overdue ? 'true' : undefined,
    },
  });

  if (opts.json) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }
  table(tasks.map(taskRow));
});

export const tasksGetCommand = action(async (id: string, opts: { json?: boolean }) => {
  const task = await apiRequest<Task>('GET', `/tasks/${id}`);
  if (opts.json) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }
  console.log(`${task.key} — ${task.title}`);
  console.log(`  id:        ${task.id}`);
  console.log(`  priority:  ${task.priority}`);
  console.log(`  column:    ${task.column.name}`);
  console.log(`  assignee:  ${task.assignee?.name ?? '(chưa gán)'}`);
  console.log(`  due date:  ${task.dueDate ?? '(không có)'}`);
  console.log(`  tags:      ${task.tags.map((t) => t.name).join(', ') || '(không có)'}`);
  if (task.description) {
    console.log(`  description:\n${task.description}`);
  }
});

interface CreateOpts {
  board: string;
  column: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
  due?: string;
  tags?: string;
}

export const tasksCreateCommand = action(async (opts: CreateOpts) => {
  const board = await resolveBoard(opts.board);
  const column = await resolveColumn(board.id, opts.column);
  const assigneeId = opts.assignee ? (await resolveUser(opts.assignee)).id : undefined;
  const tagIds = await resolveTags(splitTags(opts.tags));

  const task = await apiRequest<Task>('POST', '/tasks', {
    body: {
      boardId: board.id,
      columnId: column.id,
      title: opts.title,
      description: opts.description,
      priority: opts.priority,
      assigneeId,
      dueDate: opts.due,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    },
  });
  console.log(`Đã tạo task ${task.key}: ${task.title} (id: ${task.id})`);
});

interface UpdateOpts {
  title?: string;
  description?: string;
  priority?: string;
  assignee?: string;
  due?: string;
}

export const tasksUpdateCommand = action(async (id: string, opts: UpdateOpts) => {
  const assigneeId =
    opts.assignee === undefined ? undefined : opts.assignee === 'none' ? null : (await resolveUser(opts.assignee)).id;
  const dueDate = opts.due === undefined ? undefined : opts.due === 'none' ? null : opts.due;

  const task = await apiRequest<Task>('PATCH', `/tasks/${id}`, {
    body: {
      title: opts.title,
      description: opts.description,
      priority: opts.priority,
      assigneeId,
      dueDate,
    },
  });
  console.log(`Đã cập nhật task ${task.key}: ${task.title}`);
});

export const tasksMoveCommand = action(async (id: string, opts: { column: string; after?: string }) => {
  const task = await apiRequest<Task>('GET', `/tasks/${id}`);
  const column = await resolveColumn(task.boardId, opts.column);
  await apiRequest('PATCH', `/tasks/${id}/move`, {
    body: { columnId: column.id, afterTaskId: opts.after },
  });
  console.log(`Đã chuyển task ${task.key} sang cột "${column.name}".`);
});

export const tasksSetTagsCommand = action(async (id: string, opts: { tags?: string }) => {
  const tagIds = await resolveTags(splitTags(opts.tags));
  await apiRequest('PUT', `/tasks/${id}/tags`, { body: { tagIds } });
  console.log(`Đã cập nhật tag cho task ${id}.`);
});

export const tasksDeleteCommand = action(async (id: string) => {
  await apiRequest('DELETE', `/tasks/${id}`);
  console.log(`Đã xoá task ${id}.`);
});
