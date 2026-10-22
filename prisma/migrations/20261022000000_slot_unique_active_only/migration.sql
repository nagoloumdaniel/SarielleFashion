-- Un créneau annulé doit pouvoir être réservé à nouveau : l'unicité (prestation, début)
-- ne s'applique plus qu'aux rendez-vous qui occupent réellement le créneau.
DROP INDEX "Appointment_serviceId_startsAt_key";

CREATE UNIQUE INDEX "Appointment_serviceId_startsAt_active_key"
  ON "Appointment"("serviceId", "startsAt")
  WHERE "status" NOT IN ('CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN');

CREATE INDEX "Appointment_serviceId_startsAt_idx" ON "Appointment"("serviceId", "startsAt");
