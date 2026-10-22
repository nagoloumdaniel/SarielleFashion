-- Données : numérote les options existantes par prestation (ordre alphabétique historique).
UPDATE "ServiceOption" o
SET "order" = r.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "serviceId" ORDER BY name, id) - 1 AS rn
  FROM "ServiceOption"
) r
WHERE o.id = r.id AND o."order" = 0;
