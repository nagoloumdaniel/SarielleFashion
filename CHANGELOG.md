# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).

## [Non publié]

### Ajouté

- Site public et e-mails clients en français et en allemand (`/de`), hreflang et sitemap bilingues.
- E-mails premium (gabarits client et espace professionnel).
- Prestation à domicile (frais de déplacement), délai de préavis d'annulation, photos dans le formulaire de prestation (3 maximum).
- Présentation GitHub : README complet, CONTRIBUTING, SECURITY mis à jour.

### Modifié

- E-mails : Resend retiré, envoi par SMTP Gmail (Nodemailer) uniquement.
- Migrations Prisma appliquées au build Vercel via `DIRECT_URL`, sans verrou advisory ; builds limités à `main`.
- Slug des prestations généré côté serveur, ordre des prestations automatique.
- Mots-clés `package.json` alignés sur l'Allemagne (retrait de Dakar / Sénégal).

### Corrigé

- Horaires désactivés pour les jours fermés, ligne unique Début / Fin / Enregistrer, hero mobile.
- Anti double-réservation : index unique partiel limité aux rendez-vous actifs (un créneau annulé redevient réservable).

### Interface (refonte)

- Refonte premium : accueil, catalogue, fiche coiffure (galerie, bloc de réservation sticky, coiffures similaires), contact, demandes personnalisées, dashboard.
- Page d'erreur plein écran ; boutons « Réessayer » et « Voir le catalogue » de même taille ; boutons de taille mesurée sur tout le site.

### Dépôt

- Ajout de LICENSE, SECURITY.md, modèle de PR, Dependabot ; captures E2E et archives retirées du suivi Git.

## [1.0.0] — Phase 12, lancement

Version initiale complète correspondant au périmètre MVP du cahier des charges (§19).

### Catalogue

- Catégories et coiffures administrables (CRUD complet), photos multiples avec image principale et textes alternatifs.
- Statuts brouillon / publiée / archivée ; aucune suppression d'une coiffure ayant un historique de réservations.
- Règles de compatibilité et questions capillaires configurables par prestation.

### Compatibilité capillaire

- Moteur de compatibilité pur et testé (compatible / incompatible / incertain + message configuré).
- Parcours de questions conditionnelles côté client, upload de photo d'évaluation (stockage privé).
- Décisions dashboard (accepter, refuser, demander des précisions, proposer une autre coiffure, autoriser sous conditions), avec re-vérification systématique des règles au moment de la réservation — une évaluation acceptée ne réserve jamais automatiquement un créneau.

### Réservation, disponibilités, calendrier

- Parcours public en 8 étapes, protection anti double-réservation par verrou PostgreSQL (vérifiée par test de concurrence).
- Machine à statuts complète, annulation client par lien sécurisé à durée limitée, annulation admin, reprogrammation atomique.
- Calendrier dashboard (jour/semaine/mois/liste) et gestion des disponibilités avec alerte sur les modifications impactant des rendez-vous confirmés.
- Instantanés de prix et de durée figés sur chaque réservation.

### Notifications et messagerie

- File d'e-mails (fournisseur Resend à l'époque, remplacé depuis par SMTP Gmail ; mode console en développement) idempotente, reprise sur échec, jamais bloquante pour l'enregistrement d'une réservation.
- Rappels automatiques H-24 anti-doublon, notifications dashboard avec lien direct.
- Messagerie centralisée (contact, renseignements, compatibilité, demandes personnalisées) avec notes internes invisibles côté client.

### Demandes personnalisées et fonctionnalités complémentaires

- Formulaire de demande sur mesure avec photos de référence, traitement dashboard et historique des décisions.
- Fiches clientes, paramètres du salon, tableau de bord principal, statistiques avec définitions affichées, gestion des absences.

### Sécurité et RGPD

- Authentification admin (Auth.js, bcrypt coût 12), autorisations serveur sur chaque opération sensible, rate limiting, en-têtes de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy), cookies `HttpOnly`/`Secure`/`SameSite`.
- RGPD opérationnel : politique de confidentialité, export/rectification/anonymisation, purge automatique des photos privées expirées.
- Sauvegarde et restauration PostgreSQL testées (`scripts/backup-db.mjs` / `scripts/restore-db.mjs`).

### Performance, accessibilité, SEO

- Images AVIF/WebP responsives, cache ISR des fiches prestation, Lighthouse mobile 96-98 en performance sur les pages principales.
- Aucune violation axe-core sérieuse ou critique ; métadonnées SEO, Open Graph, sitemap, robots, données structurées LocalBusiness, dashboard `noindex`.
- Thème clair/sombre avec détection système et persistance.

### Tests et recette

- 182 tests unitaires (moteurs compatibilité/disponibilités, machine à statuts, idempotence notifications, protection des conflits).
- Suite e2e Playwright (parcours visiteur et admin complets, responsive, SEO, sécurité, thème).
- 36 critères d'acceptation §17 couverts (voir `docs/acceptation.md`).

### Limites connues de cette version

- Rate limiter en mémoire (une seule instance) — Redis/Upstash recommandé avant montée en charge.
- Aucun monitoring externe branché (procédure documentée dans `docs/maintenance.md`).
- Avis clients, liste d'attente, galerie publique et promotions restent hors périmètre v1 (§19).
- DPA et identité légale définitive à compléter avant mise en ligne (voir `docs/rgpd.md`).
