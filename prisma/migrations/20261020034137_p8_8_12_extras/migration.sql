-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PromotionKind" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "discountCents" INTEGER,
ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "promotionName" TEXT;

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "desiredStartsAt" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifyToken" TEXT,
    "notifyTokenExpiresAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "confirmedAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "serviceId" TEXT,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PromotionKind" NOT NULL,
    "value" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionService" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "PromotionService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_notifyToken_key" ON "WaitlistEntry"("notifyToken");

-- CreateIndex
CREATE INDEX "WaitlistEntry_serviceId_desiredStartsAt_status_idx" ON "WaitlistEntry"("serviceId", "desiredStartsAt", "status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_notifyTokenExpiresAt_idx" ON "WaitlistEntry"("status", "notifyTokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_token_key" ON "Review"("token");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_serviceId_status_idx" ON "Review"("serviceId", "status");

-- CreateIndex
CREATE INDEX "GalleryPhoto_published_order_idx" ON "GalleryPhoto"("published", "order");

-- CreateIndex
CREATE INDEX "Promotion_active_startsAt_endsAt_idx" ON "Promotion"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionService_serviceId_idx" ON "PromotionService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionService_promotionId_serviceId_key" ON "PromotionService"("promotionId", "serviceId");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionService" ADD CONSTRAINT "PromotionService_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionService" ADD CONSTRAINT "PromotionService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
