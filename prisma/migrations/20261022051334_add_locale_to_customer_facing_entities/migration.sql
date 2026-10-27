-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr';
