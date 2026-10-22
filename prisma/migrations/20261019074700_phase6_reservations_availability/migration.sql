-- Phase 6 : statuts complets, holds, annulation et réglages de réservation.
-- La table Appointment était vide au moment de la migration : le remplacement
-- de l'enum perd uniquement la valeur CANCELLED, jamais utilisée.

BEGIN;
CREATE TYPE "AppointmentStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN', 'COMPLETED', 'NO_SHOW');
ALTER TABLE "public"."Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus_new" USING ("status"::text::"AppointmentStatus_new");
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "public"."AppointmentStatus_old";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

ALTER TABLE "Appointment" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledFrom" TIMESTAMP(3);

ALTER TABLE "SalonSettings" ADD COLUMN     "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancelReasonRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "minLeadTimeMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15;

CREATE INDEX "Appointment_status_startsAt_idx" ON "Appointment"("status", "startsAt");
CREATE INDEX "BlockedPeriod_startsAt_endsAt_idx" ON "BlockedPeriod"("startsAt", "endsAt");
