/*
  Warnings:

  - Added the required column `serviceId` to the `HairAssessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CompatibilityRule" ADD COLUMN     "acceptedHairTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "conditionsNote" TEXT;

-- AlterTable
ALTER TABLE "HairAssessment" ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decisionMessage" TEXT,
ADD COLUMN     "serviceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuestionDefinition" ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "HairAssessment_status_createdAt_idx" ON "HairAssessment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HairAssessment_serviceId_idx" ON "HairAssessment"("serviceId");

-- CreateIndex
CREATE INDEX "HairAssessment_customerId_idx" ON "HairAssessment"("customerId");

-- AddForeignKey
ALTER TABLE "HairAssessment" ADD CONSTRAINT "HairAssessment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HairAssessment" ADD CONSTRAINT "HairAssessment_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
