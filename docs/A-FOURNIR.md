# Infos à fournir pour finaliser Sarielle Fashion

Ce qui est déjà fait : logo et icônes, palette rouge, Manrope + Inter, landing sans image, e-mail de contact et d'admin (`sarielletalla@gmail.com`), euro, fuseau `Europe/Berlin`, textes de la page d'accueil (5 ans, ≈ 30 clientes/mois, 4 savoir-faire, femmes/hommes/enfants/événements, déplacement à la charge du client, tutoiement).

## 1. Identité et contact

- Nom exact de la marque (aujourd'hui : « Sarielle Fashion ») et nom légal de la responsable.
- Adresse complète à Clausthal-Zellerfeld (rue, n°, code postal) : lieu de réception des clientes.
- Téléphone / WhatsApp (format +49 …).
- Comptes de réseaux sociaux (Instagram, TikTok, Facebook…) : aucun n'est affiché tant qu'ils ne sont pas fournis.
- Horaires d'ouverture et jours de repos (aucun horaire n'est affiché aujourd'hui, par honnêteté).

## 2. Obligations légales (Allemagne)

- Impressum (§ 5 DDG) : nom, adresse, e-mail, statut (Einzelunternehmen / Gewerbe), Steuernummer ou USt-IdNr.
- TVA : petite entreprise (§ 19 UStG, « keine Umsatzsteuer ») ou assujettie ? Sert aux mentions de prix.
- Données personnelles (DSGVO) : hébergeurs réellement utilisés, durée de conservation souhaitée.
- Faut-il une version allemande du site en plus du français ? (clientèle locale)

## 3. Prestations et tarifs

- Liste des prestations par catégorie (coiffure femme / homme / enfant, make-up, pose de lace, cils, événements) : nom, description, prix en euros, durée.
- Options payantes éventuelles (soins, longueurs, accessoires).
- Frais de déplacement : montant fixe ou selon la distance, rayon maximum.
- Moyens de paiement acceptés (espèces, PayPal, virement…) et acompte éventuel.
- Délai d'annulation gratuite (24 h par défaut).
- Module « compatibilité capillaire » (questions sur la longueur / les locs) : le garder, l'adapter ou le retirer ?

## 4. Contenus

- Photos : portrait, réalisations (coiffures, make-up, lace, cils) avec autorisation des personnes.
- Confirmation des chiffres affichés : « 5 ans », « ≈ 30 clientes et clients par mois ».
- Avis clients réels (jamais inventés).

## 5. Clés et services techniques (valeurs jamais commitées)

- Base de données PostgreSQL neuve (ex. Neon) : `DATABASE_URL`, `DIRECT_URL`.
- Stockage photos (ex. Cloudflare R2) : `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- E-mails : Gmail SMTP (`EMAIL_MODE=smtp`, `SMTP_USER`, mot de passe d'application Google) ou Resend (domaine vérifié).
- `AUTH_SECRET` et `CRON_SECRET` : à générer pour ce projet (distincts de ceux de HairStyleByPati).
- Mot de passe admin initial : variable `AUTH_ADMIN_PASSWORD` (jamais dans le dépôt) ; e-mail admin : `sarielletalla@gmail.com`.
- Nom de domaine et projet Vercel (`NEXT_PUBLIC_APP_URL`).
