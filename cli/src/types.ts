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

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  key: string;
  boardId: string;
  title: string;
  description: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  column: { id: string; name: string; isDoneColumn: boolean };
  assignee: { id: string; name: string; avatarColor: string } | null;
  createdBy: { id: string; name: string } | null;
  tags: Tag[];
  commentCount: number;
  attachmentCount: number;
}
