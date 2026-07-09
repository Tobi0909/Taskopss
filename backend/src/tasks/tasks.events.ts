export const TASK_EVENTS = {
  CREATED: 'task.created',
  ASSIGNED: 'task.assigned',
  STATUS_CHANGED: 'task.status_changed',
  CHANGED: 'task.changed',
} as const;

export interface TaskChangedEvent {
  taskId: string;
  boardId: string;
}

export interface TaskCreatedEvent {
  taskId: string;
  actorId: string | null;
}

export interface TaskAssignedEvent {
  taskId: string;
  assigneeId: string;
  actorId: string | null;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  actorId: string | null;
}
