export type Role = 'ADMIN' | 'MEMBER';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  keyPrefix: string;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isDoneColumn: boolean;
}

export interface BoardWithColumns extends Board {
  columns: BoardColumn[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Task {
  id: string;
  key: string;
  boardId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  column: { id: string; name: string; isDoneColumn: boolean };
  assignee: TaskAssignee | null;
  createdBy: { id: string; name: string } | null;
  tags: Tag[];
  commentCount: number;
  attachmentCount: number;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string | null;
  body: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarColor: string } | null;
}

export interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: { id: string; name: string; avatarColor: string } | null;
  createdAt: string;
  downloadUrl: string;
}

export interface ActivityLogEntry {
  id: string;
  taskId: string;
  actorId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; avatarColor: string } | null;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: 'ASSIGNED' | 'MENTIONED' | 'DUE_SOON' | 'STATUS_CHANGED';
  taskId: string | null;
  commentId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  overdueCount: number;
  byPriority: Record<Priority, number>;
  workloadByAssignee: Array<{ id: string; name: string; avatarColor: string; openTaskCount: number }>;
  weeklyCompletionTrend: Array<{ weekStart: string; completedCount: number }>;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
}
