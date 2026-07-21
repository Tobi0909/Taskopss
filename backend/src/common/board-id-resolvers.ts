import { PrismaService } from '../prisma/prisma.service';

export type BoardIdResolver = (req: any, prisma: PrismaService) => Promise<string | null>;

/** The route param itself is the board id (e.g. /boards/:id, /boards/:id/columns). */
export const fromBoardParam = (paramName = 'id'): BoardIdResolver => async (req) => {
  return req.params[paramName] ?? null;
};

/** The board id is passed in the request body (e.g. POST /tasks { boardId }). */
export const fromBody = (field = 'boardId'): BoardIdResolver => async (req) => {
  return req.body?.[field] ?? null;
};

/** The route param is a Task id; resolve its boardId. */
export const fromTaskParam = (paramName = 'id'): BoardIdResolver => async (req, prisma) => {
  const taskId = req.params[paramName];
  if (!taskId) return null;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { boardId: true } });
  return task?.boardId ?? null;
};

/** The route param is a BoardColumn id; resolve its boardId. */
export const fromBoardColumnParam = (paramName = 'id'): BoardIdResolver => async (req, prisma) => {
  const columnId = req.params[paramName];
  if (!columnId) return null;
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });
  return column?.boardId ?? null;
};

/** The route param is a Comment id; resolve boardId via its parent task. */
export const fromCommentParam = (paramName = 'id'): BoardIdResolver => async (req, prisma) => {
  const commentId = req.params[paramName];
  if (!commentId) return null;
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { task: { select: { boardId: true } } },
  });
  return comment?.task?.boardId ?? null;
};

/** The route param is an Attachment id; resolve boardId via its parent task. */
export const fromAttachmentParam = (paramName = 'id'): BoardIdResolver => async (req, prisma) => {
  const attachmentId = req.params[paramName];
  if (!attachmentId) return null;
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { task: { select: { boardId: true } } },
  });
  return attachment?.task?.boardId ?? null;
};

/** The route param is a ChecklistItem id; resolve boardId via its parent task. */
export const fromChecklistItemParam = (paramName = 'id'): BoardIdResolver => async (req, prisma) => {
  const itemId = req.params[paramName];
  if (!itemId) return null;
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    select: { task: { select: { boardId: true } } },
  });
  return item?.task?.boardId ?? null;
};
