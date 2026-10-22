/*
  Warnings:

  - You are about to drop the column `consentConfirmed` on the `GalleryPhoto` table. All the data in the column will be lost.
  - You are about to drop the column `moderatedAt` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `moderatedById` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Review` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_moderatedById_fkey";

-- DropIndex
DROP INDEX "Review_serviceId_status_idx";

-- DropIndex
DROP INDEX "Review_status_createdAt_idx";

-- AlterTable
ALTER TABLE "GalleryPhoto" DROP COLUMN "consentConfirmed",
ALTER COLUMN "published" SET DEFAULT true;

-- AlterTable (1/2) : nouvelles colonnes et colonnes devenues facultatives
ALTER TABLE "Review"
ADD COLUMN     "authorName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "appointmentId" DROP NOT NULL,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "token" DROP NOT NULL,
ALTER COLUMN "tokenExpiresAt" DROP NOT NULL;

-- Migration de données : fin de la modération.
-- Avis rejetés par l'admin : supprimés (ils ne doivent jamais devenir publics).
DELETE FROM "Review" WHERE "status" = 'REJECTED';
-- Avis soumis (en attente) et approuvés : publiés (submittedAt déjà renseigné).
UPDATE "Review" SET "submittedAt" = COALESCE("submittedAt", "moderatedAt", "updatedAt")
WHERE "status" IN ('SUBMITTED', 'APPROVED');
-- Avis existants : tous issus d'un lien par jeton => client vérifié ; nom repris de la fiche cliente.
UPDATE "Review" r
SET "verified" = true,
    "authorName" = COALESCE((SELECT c."name" FROM "Customer" c WHERE c."id" = r."customerId"), '')
WHERE r."submittedAt" IS NOT NULL;

-- AlterTable (2/2) : retrait des champs de modération
ALTER TABLE "Review" DROP COLUMN "moderatedAt",
DROP COLUMN "moderatedById",
DROP COLUMN "status";

-- Note de 1 à 5 (ou vide tant que la demande d'avis n'a pas reçu de réponse)
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" IS NULL OR ("rating" BETWEEN 1 AND 5));

-- AlterTable
ALTER TABLE "SalonSettings" ALTER COLUMN "name" SET DEFAULT 'Sarielle Fashion';

-- DropEnum
DROP TYPE "ReviewStatus";

-- CreateTable
CREATE TABLE "ReviewPhoto" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewPhoto_reviewId_order_idx" ON "ReviewPhoto"("reviewId", "order");

-- CreateIndex
CREATE INDEX "Review_submittedAt_idx" ON "Review"("submittedAt");

-- CreateIndex
CREATE INDEX "Review_serviceId_submittedAt_idx" ON "Review"("serviceId", "submittedAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewPhoto" ADD CONSTRAINT "ReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
