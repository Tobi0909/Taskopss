export const COMMENT_EVENTS = {
  CREATED: 'comment.created',
  MENTIONED: 'comment.mentioned',
} as const;

export interface CommentCreatedEvent {
  commentId: string;
  taskId: string;
  authorId: string;
  mentionedUserIds: string[];
}

export interface CommentMentionedEvent {
  commentId: string;
  taskId: string;
  authorId: string;
  mentionedUserIds: string[];
}
