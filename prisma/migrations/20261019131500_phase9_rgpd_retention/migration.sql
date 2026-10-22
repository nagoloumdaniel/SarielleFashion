-- AlterTable
ALTER TABLE "SalonSettings" ADD COLUMN     "dataRetentionMonths" INTEGER NOT NULL DEFAULT 36,
ADD COLUMN     "photoRetentionDays" INTEGER NOT NULL DEFAULT 90;

