# Sécurité et fiabilité (phase 9)

Document de référence pour l'exploitation et la revue de sécurité. Aucun secret réel n'est présent dans ce fichier.

## Périmètre de la revue

- Application Next.js 15 / React 19 / Prisma 6, dashboard protégé par Auth.js.
- Routes publiques : catalogue, contact, compatibilité, réservation, annulation par lien, demandes personnalisées.
- Routes dashboard et API admin, crons protégés.
- Stockage privé Cloudflare R2, e-mails Gmail SMTP, base Neon PostgreSQL.
- Revue statique du code, vérification des en-têtes en runtime, `npm audit`, et tests Playwright de sécurité.

## Faiblesses corrigées pendant la phase 9

| Sévérité | Sujet                                         | Correction                                                                                                                                                                |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Haute    | Connexion sans limitation de tentatives       | Limite par IP (20 tentatives) et par couple IP/e-mail (10 tentatives) dans `authorize` (`src/modules/auth/auth.ts`). Message d'erreur inchangé pour éviter l'énumération. |
| Moyenne  | Cookies de session implicites                 | Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production et nom `__Secure-` explicites (`src/modules/auth/auth.config.ts`).                                              |
| Moyenne  | Absence d'en-têtes navigateur                 | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, HSTS et CSP en production (`next.config.ts`).                            |
| Moyenne  | API d'export admin accessible hors middleware | Middleware `/api/admin/:path*` avec 401, plus contrôle `auth()` dans la route.                                                                                            |
| Moyenne  | Pas de procédure d'effacement RGPD            | Export JSON, rectification et anonymisation avec suppression des contenus privés (`src/modules/clients/rgpd.ts`).                                                         |
| Basse    | Photos privées conservées indéfiniment        | Purge quotidienne configurable via `/api/cron/retention` et `photoRetentionDays`.                                                                                         |
| Basse    | Liens d'annulation expirés encore stockés     | Suppression du jeton expiré lors de la purge de rétention.                                                                                                                |
| Basse    | Pas de sonde de santé                         | `/api/health` sans donnée personnelle, réponse 503 si la base est indisponible.                                                                                           |

## Mesures déjà en place et vérifiées

- Autorisations serveur : `requireAdmin` sur chaque action dashboard, middleware sur `/dashboard` et `/api/admin`, routes cron protégées par `CRON_SECRET` avec comparaison à temps constant.
- Validation Zod de toutes les entrées publiques et dashboard ; limites de longueur et de type.
- Prisma paramétré, aucune concaténation SQL.
- React échappe le contenu utilisateur ; les e-mails échappent les valeurs injectées.
- Upload : taille, MIME déclaré et signature binaire vérifiés, clés aléatoires, bucket privé, URLs signées de 15 minutes.
- Rate limiting sur contact, compatibilité, réservation, annulation et demandes personnalisées.
- Aucune donnée sensible dans les journaux ; les adresses e-mail du fournisseur console sont masquées et les erreurs Gmail SMTP sont tronquées.
- Journal d'audit pour les opérations sensibles.

## Risques résiduels assumés

- **Rate limiter en mémoire** : il protège une instance, pas un déploiement multi-régions. À remplacer par Upstash/Redis avant montée en charge.
- **CSP avec `unsafe-inline`** : nécessaire aux scripts inline de Next.js et au script de thème. Une CSP à nonce pourra être ajoutée lors de la phase 10.
- **Dépendances** : `npm audit --omit=dev` signalait 5 avis (4 hauts, 1 modéré) dans la chaîne de build Next/PostCSS et la CLI Prisma (`deepmerge-ts`). Aucun correctif non cassant disponible ; les versions majeures Next 16 / Prisma 7 sont à planifier en phase 12. Le lockfile est versionné.
- **Hachage** : bcryptjs avec coût 12. La documentation initiale mentionnait Argon2 ; les empreintes existantes restent compatibles bcrypt. Une migration vers Argon2 ou scrypt peut être planifiée sans casser les comptes.
- **MFA absente** : compte administrateur unique protégé par mot de passe fort et limitation des tentatives. MFA à évaluer avant mise en production.
- **Monitoring externe** : `/api/health` et les échecs visibles dans le dashboard existent, mais aucun service d'alerte externe n'est branché.
- **CSP/HSTS actifs uniquement en production** : le mode développement conserve le HMR.

## Secrets et rotation

Variables sensibles : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_ADMIN_PASSWORD`, `EMAIL_FROM`, `CRON_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`.

Procédure de rotation :

1. Générer le nouveau secret chez le fournisseur.
2. Mettre à jour les variables Vercel et le `.env.local` local, jamais dans Git.
3. Redéployer, vérifier connexion, e-mails et stockage.
4. Révoquer l'ancien secret chez le fournisseur.
5. En cas de fuite présumée : révoquer immédiatement, changer `AUTH_SECRET` (invalide les sessions), examiner les journaux, ne jamais recopier la valeur dans un ticket.

`AUTH_SECRET` tourné invalide toutes les sessions administratives. `CRON_SECRET` tourné exige la mise à jour de Vercel Cron ou du planificateur externe.

## Sauvegarde et restauration

Scripts :

```bash
node scripts/backup-db.mjs
RESTORE_DATABASE_URL="postgresql://.../base_de_restauration" node scripts/restore-db.mjs backups/fichier.dump --confirm
```

Le script de sauvegarde utilise `pg_dump` local puis l'image Docker `postgres:18` si la version locale est plus ancienne que le serveur. Le script de restauration refuse une cible identique à `DATABASE_URL` et exige `--confirm`.

Test réel effectué le 19/10/2026 :

- sauvegarde custom créée dans `backups/` (dossier ignoré par Git) ;
- création d'une base temporaire sur Neon ;
- restauration via Docker `postgres:18` ;
- vérification : 20 tables publiques et 7 migrations terminées restaurées ;
- base temporaire supprimée après vérification.

À mettre en place avant production : sauvegarde automatique planifiée (Neon PITR ou job externe) et test de restauration périodique documenté. Les fichiers `backups/` ne doivent jamais être poussés.

## Déploiement et en-têtes

Vérifier après déploiement :

```bash
curl -sI https://votre-domaine/ | Select-String "x-frame-options|content-security-policy|strict-transport-security"
curl -s https://votre-domaine/api/health
```

Les crons Vercel sont déclarés dans `vercel.json` : notifications, rappels et purge de rétention. `CRON_SECRET` doit être configuré dans Vercel.

## Vérification en production

Le build de production a été démarré localement sur un port dédié et contrôlé :

- en-têtes présents : nosniff, DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP et COOP ;
- CSP servie en production, sans erreur console sur l'accueil et la page de connexion ;
- `/api/health` a répondu 200 avec `database: ok`.

## Vérifications automatisées

- `npm run ci` : typecheck, format, lint, tests Vitest, build.
- `tests/e2e/security.spec.ts` : redirection dashboard, API admin 401, en-têtes, cookie, export RGPD, XSS échappé, cron de purge protégé.
- `docs/rgpd.md` : registre, bases légales, durées et procédures.

## CSP à nonce (dashboard et connexion)

- Les pages privées dynamiques (`/dashboard/**`, `/connexion`) reçoivent une CSP stricte posée par `src/middleware.ts` : `script-src 'self' 'nonce-…' 'strict-dynamic'` plus l'empreinte sha256 des deux scripts inline de thème (`src/lib/inline-scripts.ts`). Plus de `'unsafe-inline'` pour les scripts.
- Les pages publiques statiques gardent `script-src 'self' 'unsafe-inline'` (`next.config.ts`) : un nonce les rendrait dynamiques et ferait perdre le cache statique / ISR. Elles n'exécutent que du contenu serveur maîtrisé.
- La CSP n'est active qu'en production (le mode dev exige `unsafe-eval`). Toute modification d'un script inline doit passer par `src/lib/inline-scripts.ts` (l'empreinte est recalculée automatiquement).
