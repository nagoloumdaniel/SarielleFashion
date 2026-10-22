-- Délai d'annulation : passage des heures aux minutes (valeur existante convertie, défaut 30 min).
ALTER TABLE "SalonSettings" RENAME COLUMN "minCancelNoticeHours" TO "minCancelNoticeMinutes";
UPDATE "SalonSettings" SET "minCancelNoticeMinutes" = "minCancelNoticeMinutes" * 60;
ALTER TABLE "SalonSettings" ALTER COLUMN "minCancelNoticeMinutes" SET DEFAULT 30;

-- Marque : « Sarielle Fashion » (ancien défaut hérité du projet jumeau).
ALTER TABLE "SalonSettings" ALTER COLUMN "name" SET DEFAULT 'Sarielle Fashion';
UPDATE "SalonSettings" SET "name" = 'Sarielle Fashion' WHERE "name" = 'Hairstyle by Patricia';
