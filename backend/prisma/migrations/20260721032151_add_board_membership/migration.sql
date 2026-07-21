-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "board_members" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_members_board_id_idx" ON "board_members"("board_id");

-- CreateIndex
CREATE INDEX "board_members_user_id_idx" ON "board_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_members_board_id_user_id_key" ON "board_members"("board_id", "user_id");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve existing implicit access. Every board's creator becomes OWNER,
-- and every other existing user becomes MEMBER on every existing board, so nobody
-- who could previously see a board loses access once membership is enforced.
INSERT INTO "board_members" ("id", "board_id", "user_id", "role", "created_at")
SELECT gen_random_uuid(), b."id", b."created_by_id", 'OWNER', CURRENT_TIMESTAMP
FROM "boards" b
WHERE b."created_by_id" IS NOT NULL
ON CONFLICT ("board_id", "user_id") DO NOTHING;

INSERT INTO "board_members" ("id", "board_id", "user_id", "role", "created_at")
SELECT gen_random_uuid(), b."id", u."id", 'MEMBER', CURRENT_TIMESTAMP
FROM "boards" b
CROSS JOIN "users" u
ON CONFLICT ("board_id", "user_id") DO NOTHING;
