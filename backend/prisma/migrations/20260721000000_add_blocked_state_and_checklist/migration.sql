-- CreateEnum
CREATE TYPE "BlockedState" AS ENUM ('NONE', 'BLOCKED', 'WAITING', 'ON_HOLD', 'NEEDS_REVIEW');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'BLOCKED_STATE_CHANGED';
ALTER TYPE "ActivityAction" ADD VALUE 'CHECKLIST_ITEM_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'CHECKLIST_ITEM_TOGGLED';
ALTER TYPE "ActivityAction" ADD VALUE 'CHECKLIST_ITEM_REMOVED';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "blocked_state" "BlockedState" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "blocked_reason" TEXT;

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_items_task_id_idx" ON "checklist_items"("task_id");

-- CreateIndex
CREATE INDEX "tasks_blocked_state_idx" ON "tasks"("blocked_state");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
