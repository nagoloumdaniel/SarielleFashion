-- Coiffure à domicile : réglages du salon et instantané sur chaque rendez-vous.
ALTER TABLE "SalonSettings" ADD COLUMN "homeServiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "travelFeeCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment" ADD COLUMN "homeService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "travelFeeCents" INTEGER,
ADD COLUMN "homeAddress" TEXT;
