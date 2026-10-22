# Infos à fournir pour finaliser Sarielle Fashion

Ce qui est déjà fait ou décidé par la cliente : logo et icônes, palette rouge, Manrope + Inter, landing sans image, e-mail de contact et d'admin (`sarielletalla@gmail.com`), euro (aucune taxe affichée), fuseau `Europe/Berlin`, marque et nom légal « Sarielle Fashion », aucun téléphone du salon affiché, TikTok (`@sarielle6`), horaires Lundi - Dimanche 5h - 22h, mentions légales simples (e-mail, Clausthal-Zellerfeld, Allemagne, hébergement), paiement toujours sur place (espèces ou virement), délai d'annulation de 30 minutes, déplacement à la charge du client avec montant fixe annoncé « à partir de X € », module de compatibilité capillaire conservé, textes de la page d'accueil (5 ans, ≈ 30 clientes/mois, 4 savoir-faire, femmes/hommes/enfants/événements, tutoiement).

## 1. Identité et contact

- Adresse complète à Clausthal-Zellerfeld (rue, n°, code postal) : lieu de réception des clientes (aujourd'hui : « Clausthal-Zellerfeld, Allemagne »).
- Autres réseaux sociaux éventuels (Instagram, Facebook…) : seul TikTok est affiché.

## 2. Données personnelles

- DSGVO : hébergeurs réellement utilisés, durée de conservation souhaitée.
- Faut-il une version allemande du site en plus du français ? (clientèle locale)

## 3. Prestations et tarifs

- Liste des prestations par catégorie (coiffure femme / homme / enfant, make-up, pose de lace, cils, événements) : nom, description, prix en euros, durée.
- Options payantes éventuelles (soins, longueurs, accessoires).
- Montant des frais de déplacement (fixe), à saisir dans Dashboard > Paramètres si l'option « à domicile » est activée.

## 4. Contenus

- Photos : portrait, réalisations (coiffures, make-up, lace, cils) avec autorisation des personnes.
- Confirmation des chiffres affichés : « 5 ans », « ≈ 30 clientes et clients par mois ».
- Avis clients réels (jamais inventés).

## 5. Clés et services techniques (valeurs jamais commitées)

- Base de données PostgreSQL neuve (ex. Neon) : `DATABASE_URL`, `DIRECT_URL`.
- Stockage photos (ex. Cloudflare R2) : `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- E-mails : Gmail SMTP (`EMAIL_MODE=smtp`, `SMTP_USER`, mot de passe d'application Google) ou Gmail SMTP (domaine vérifié).
- `AUTH_SECRET` et `CRON_SECRET` : à générer pour ce projet (distincts de ceux de HairStyleByPati).
- Mot de passe admin initial : variable `AUTH_ADMIN_PASSWORD` (jamais dans le dépôt) ; e-mail admin : `sarielletalla@gmail.com`.
- Nom de domaine et projet Vercel (`NEXT_PUBLIC_APP_URL`).
