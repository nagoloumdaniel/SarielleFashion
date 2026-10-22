-- CreateEnum
CREATE TYPE "ConversationSource" AS ENUM ('CONTACT', 'APPOINTMENT', 'COMPATIBILITY', 'CUSTOM');

-- AlterEnum
BEGIN;
CREATE TYPE "ConversationStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_RESPONSE', 'TREATED', 'ARCHIVED');
ALTER TABLE "public"."Conversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "status" TYPE "ConversationStatus_new" USING ("status"::text::"ConversationStatus_new");
ALTER TYPE "ConversationStatus" RENAME TO "ConversationStatus_old";
ALTER TYPE "ConversationStatus_new" RENAME TO "ConversationStatus";
DROP TYPE "public"."ConversationStatus_old";
ALTER TABLE "Conversation" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" "ConversationSource" NOT NULL DEFAULT 'CONTACT',
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "link" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Conversation_status_lastMessageAt_idx" ON "Conversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Notification_channel_readAt_idx" ON "Notification"("channel", "readAt");

