-- CreateEnum
CREATE TYPE "CustomRequestDecisionAction" AS ENUM ('IN_REVIEW', 'INFO_REQUESTED', 'QUOTED', 'ACCEPTED', 'REFUSED', 'CLOSED');

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "desiredDate" TIMESTAMP(3),
ADD COLUMN     "hairInfo" JSONB,
ADD COLUMN     "proposedServiceId" TEXT,
ADD COLUMN     "proposedSlot" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalonSettings" ADD COLUMN     "bookingPolicy" TEXT,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "emailSignature" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "CustomRequestDecision" (
    "id" TEXT NOT NULL,
    "customRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "CustomRequestDecisionAction" NOT NULL,
    "message" TEXT,
    "priceCents" INTEGER,
    "proposedServiceName" TEXT,
    "proposedSlot" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRequestDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomRequestDecision_customRequestId_createdAt_idx" ON "CustomRequestDecision"("customRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomRequest_status_createdAt_idx" ON "CustomRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_proposedServiceId_fkey" FOREIGN KEY ("proposedServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestDecision" ADD CONSTRAINT "CustomRequestDecision_customRequestId_fkey" FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequestDecision" ADD CONSTRAINT "CustomRequestDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

