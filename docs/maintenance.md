# Environnements, déploiement et maintenance (phase 12)

## Environnements (P12.1)

Deux environnements distincts, variables jamais partagées :

| Environnement | Base de données                     | `.env` utilisé                       | Déploiement                                   |
| ------------- | ----------------------------------- | ------------------------------------ | --------------------------------------------- |
| Développement | Branche Neon dev ou instance locale | `.env.local` (jamais commité)        | `npm run dev` en local                        |
| Production    | Branche Neon prod dédiée            | Variables d'environnement Production | Build Next.js sur l'hébergeur (voir plus bas) |

Règles :

- Jamais la même base de données entre dev et prod — `npm run db:seed:demo` ne doit **jamais** être exécuté sur la base de production (voir README).
- Tous les secrets de production sont saisis une seule fois dans la configuration de l'hébergeur, jamais dans un fichier versionné.
- `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` de production diffèrent de ceux utilisés en développement.
- `.env.example` (racine du repo) reste la seule référence versionnée des variables nécessaires, voir aussi `types/env.d.ts` qui force `tsc` à échouer si une variable lue n'est pas déclarée.

## Déploiement (P12.2 — procédure, à exécuter manuellement tant qu'aucun compte hébergeur n'est connecté à ce dépôt)

Stack validée pour Vercel (voir `docs/stack.md`) :

1. Créer un projet sur l'hébergeur choisi et le relier à ce dépôt Git (build command `npm run build`, install command `npm ci`).
2. Renseigner toutes les variables listées dans `.env.example` dans la configuration "Production" de l'hébergeur (jamais dans un fichier du repo).
3. Vérifier que `vercel.json` (crons `/api/cron/notifications`, `/api/cron/reminders`, `/api/cron/retention`, `/api/cron/liste-attente`) est pris en charge par l'hébergeur choisi. **Vercel Hobby : 1 exécution/jour max par cron** — `vercel.json` est donc réglé en quotidien ; pour la fréquence réelle (notifications 10 min, liste d'attente 15 min, rappels 1 h) appeler les mêmes routes depuis un planificateur externe (Upstash QStash, cron-job.org) ou passer en plan Pro — sinon reproduire ces trois tâches planifiées côté hébergeur ou via un service externe (ex. cron-job.org) en appelant les mêmes routes avec l'en-tête `Authorization: Bearer ${CRON_SECRET}`.
4. Premier déploiement : exécuter `npm run db:deploy` (migrations Prisma) puis `npm run db:seed` (catégories de base + compte admin) sur la base de production, **jamais** `db:seed:demo`.
5. Déploiements suivants : chaque push sur `main` doit déclencher automatiquement build + déploiement si l'intégration Git de l'hébergeur est activée — c'est la méthode recommandée plutôt qu'un pipeline CI/CD séparé pour le déploiement lui-même.
6. Après chaque déploiement : vérifier `/api/health`, tester une connexion admin, et contrôler qu'aucun en-tête de sécurité (CSP/HSTS) n'est régressé (voir `docs/security.md`).

CI (`.github/workflows/ci.yml`) reste la porte de qualité avant tout déploiement : typecheck, format, lint, tests unitaires et build doivent être verts sur chaque push/PR — elle ne déploie pas elle-même.

## Monitoring (P12.3 — à activer lors du branchement de l'hébergeur)

Aucun service externe n'est branché à ce jour (limite documentée dans `docs/security.md`). Procédure recommandée au moment du lancement :

1. Activer le monitoring natif de l'hébergeur (logs de fonctions, erreurs runtime) sur le projet de production.
2. Brancher `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` (déjà déclarés dans `types/env.d.ts`, optionnels) à un projet Sentry si un suivi d'erreurs plus fin est souhaité.
3. Configurer une alerte e-mail sur `/api/health` renvoyant un statut différent de 200 (ex. UptimeRobot, Better Uptime, ou la surveillance native de l'hébergeur).
4. Vérifier manuellement une fois par semaine en phase de lancement : dashboard "échecs d'envoi" (notifications), journaux serveur, `/api/health`.

## Documentation (P12.4)

| Besoin                             | Référence                                                  |
| ---------------------------------- | ---------------------------------------------------------- |
| Installation et commandes          | [README.md](../README.md)                                  |
| Guide d'utilisation pour Sarielle  | [docs/guide-admin.md](guide-admin.md)                      |
| Variables d'environnement          | [.env.example](../.env.example)                            |
| Runbook de sauvegarde/restauration | [docs/security.md](security.md#sauvegarde-et-restauration) |

## Plan de maintenance (P12.8)

- **Dépendances** : revoir `npm audit` et les mises à jour mineures chaque mois ; planifier les montées majeures (Next 16, Prisma 7 — avis déjà identifiés en phase 9, voir `docs/security.md`) hors période de forte activité du salon, avec recette complète (`npm run ci` + suite e2e) avant mise en production.
- **Sauvegardes** : vérifier mensuellement qu'une sauvegarde récente existe et qu'une restauration test réussit sur une base temporaire (`scripts/backup-db.mjs` / `scripts/restore-db.mjs`), jusqu'à l'activation d'une sauvegarde automatique planifiée (Neon PITR ou job externe).
- **Secrets** : rotation immédiate en cas de doute de fuite (procédure dans `docs/security.md`), revue annuelle sinon.
- **Ajout de fonctionnalité sans casser les modules existants** :
  1. Partir d'une branche `feat/<slug>` depuis `main` à jour.
  2. Ne jamais modifier un module existant sans ses tests ; ajouter les tests manquants avant toute modification si le module en est dépourvu.
  3. Respecter les frontières de domaine de `docs/architecture.md` (catalogue, compatibilité, disponibilités, réservations, etc.) — une nouvelle fonctionnalité qui traverse plusieurs domaines passe par les fonctions publiques de chaque module, jamais par un accès direct à la base d'un autre domaine.
  4. `npm run ci` + suite e2e concernée doivent rester verts avant toute PR.
  5. Mettre à jour `ROADMAP.md` et le document pertinent (`docs/acceptation.md` si la fonctionnalité touche un critère §17) dans la même PR.

## E-mails (Resend)

- L'expéditeur par défaut `onboarding@resend.dev` est un bac à sable : Resend ne livre qu'à l'adresse du propriétaire du compte. Les e-mails vers Sarielle et vers les clientes échouent (statut FAILED, visible dans Dashboard > Notifications) tant qu'un domaine n'est pas vérifié sur resend.com/domains.
- Mise en production des e-mails : vérifier un domaine, définir `EMAIL_FROM` avec une adresse de ce domaine, puis relancer les envois échoués depuis le dashboard.

### Gmail SMTP (sans domaine)

1. Compte Google de Sarielle : activer la validation en deux étapes, puis créer un « mot de passe d'application ».
2. Variables Vercel (Production) : `EMAIL_MODE=smtp`, `SMTP_USER=<adresse Gmail>`, `SMTP_PASSWORD=<mot de passe d'application>`. Redéployer.
3. Limite Gmail : environ 500 e-mails par jour. Les messages partent de l'adresse Gmail ; les réponses y arrivent.
4. Relancer les envois échoués depuis Dashboard > Notifications.
