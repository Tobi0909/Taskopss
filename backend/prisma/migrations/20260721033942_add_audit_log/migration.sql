-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('BOARD_CREATED', 'BOARD_DELETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_DELETED', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'API_TOKEN_CREATED', 'API_TOKEN_REVOKED', 'BOARD_MEMBER_ADDED', 'BOARD_MEMBER_ROLE_CHANGED', 'BOARD_MEMBER_REMOVED');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
