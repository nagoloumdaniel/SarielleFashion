# Stack technique — décision P0.4

**Statut :** figée le 17/10/2026, validée par le client.
**Source :** contraintes du cahier des charges §14.1 (« Le choix final doit privilégier la fiabilité, la facilité de maintenance et le coût raisonnable »).

## Choix retenus

| Couche            | Choix                                                                                             | Version cible | Pourquoi                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Next.js** (App Router, Server Actions, Route Handlers)                                          | 15.x          | Rendu serveur pour le SEO du catalogue, Server Components = moins de JS client, même runtime pour front et API (§14.1 « API serveur Next.js »)                                                |
| UI library        | **React**                                                                                         | 19.x          | Imposé par Next.js 15                                                                                                                                                                         |
| Langage           | **TypeScript** mode `strict`                                                                      | 5.x           | Modèle de données riche (§14.3) : les types catchent les erreurs de statut/entité avant les tests                                                                                             |
| Styles            | **Tailwind CSS**                                                                                  | v4            | Imposé §14.1. v4 = configuration CSS-first (`@theme`), tokens de couleur du §2.2 natifs, zéro config JS                                                                                       |
| Composants        | **shadcn/ui** (Radix UI + Tailwind) + composants métier maison                                    | latest        | §14.1 « composants personnalisés » : le code des composants nous appartient, copiable, modifiable, pas de dépendance à une lib propriétaire                                                   |
| Icônes            | lucide-react                                                                                      | latest        | Cohérent avec shadcn/ui                                                                                                                                                                       |
| Toasts            | sonner                                                                                            | latest        | Toasts de statut de réservation, accessibles (rôle `status`)                                                                                                                                  |
| ORM               | **Prisma**                                                                                        | latest        | Schéma §14.3 déclaratif, migrations versionnées, requêtes typées et paramétrées (anti injection SQL, §15)                                                                                     |
| Base de données   | **PostgreSQL** sur **Neon**                                                                       | —             | §14.1 impose PostgreSQL. Neon : serverless, branches de dev isolées, sauvegardes quotidiennes (§15.4), gratuit jusqu'à un seuil                                                               |
| E-mails           | **Gmail SMTP** + `@react-email/components`                                                        | latest        | §14.1 liste Gmail SMTP/Brevo. Gmail SMTP : API simple, SDK officiel, taux de délivrabilité, templates React typés                                                                             |
| Fichiers          | **Cloudflare R2** (API S3) via `@aws-sdk/client-s3`                                               | latest        | §14.1 « stockage objet compatible S3 ». R2 : zéro frais de sortie (egress), URLs signées pour photos privées (§15.2)                                                                          |
| Authentification  | **Auth.js (NextAuth) v5** mode credentials + **Argon2id**                                         | v5            | §14.1 « solution éprouvée compatible avec le framework ». Sessions JWT httpOnly/secure/sameSite (§15.1)                                                                                       |
| Validation        | **Zod**                                                                                           | latest        | Validation serveur de TOUTES les entrées (§17 Sécurité), schémas partagés client/serveur                                                                                                      |
| Dates             | API `Intl`, stockage **UTC**, heure locale de **l'appareil connecté** (aucun fuseau configurable) | —             | Stockage UTC, affichage et saisie à l'heure locale détectée via Intl                                                                                                                          |
| Tâches planifiées | **Vercel Cron** + route handler idempotente                                                       | —             | §14.1 « service de tâches différées » : rappels §10.5, purge photos §15.3, libération créneaux temporaires                                                                                    |
| Hébergement       | **Vercel**                                                                                        | —             | Compatible Next.js + Neon, preview par branche, variables d'env séparées dev/prod (P12.1), CI intégré                                                                                         |
| Monitoring        | **Sentry** (SDK Next.js)                                                                          | latest        | §14.1 « suivi des erreurs ». Grain gratuit suffisant pour un salon                                                                                                                            |
| Tests             | **Vitest** (unit/métier) + **Playwright** (e2e)                                                   | latest        | Moteurs §5/§7 testés en TDD ; e2e = scénarios §17 (P11.2)                                                                                                                                     |
| Lint / format     | **ESLint** (config Next + import order) + **Prettier**                                            | latest        | P0.7 : lint-staged + `tsc --noEmit` en pre-commit                                                                                                                                             |
| Hooks git         | **husky** + **lint-staged**                                                                       | v9 / v15      | P0.7                                                                                                                                                                                          |
| CI/CD             | **CI locale** `npm run ci` (hook `pre-push`) → typecheck, format, lint, tests, build              | —             | GitHub Actions désactivé sur le dépôt (message « reach out to GitHub Support ») ; workflow `.github/workflows/ci.yml` conservé et réactivable. CD = Vercel (build automatique au push `main`) |

## Alternatives rejetées

| Option                                | Pourquoi pas                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Drizzle (§14.1 « Prisma ou Drizzle ») | Prisma retenu : migrations + introspection + écosystème plus mature pour le schéma relationnel riche §14.3                     |
| Supabase                              | Ajoute une couche BaaS alors que Neon = PostgreSQL pur, conforme au « maintenable, sans dépendance à un service propriétaire » |
| Brevo                                 | Gmail SMTP : templates React, SDK plus propre. Brevo reste un repli (abstraction fournisseur prévue P7.1)                      |
| AWS S3                                | Frais de sortie egress + config IAM lourde pour un projet de cette taille ; R2 compatible S3                                   |
| MongoDB                               | §14.1 impose PostgreSQL                                                                                                        |
| Credentials maison sans framework     | Auth.js = sessions, CSRF, rotation de clé audités par la communauté                                                            |
| Base de données sans ORM              | Instantanés, restrictions, suppressions logiques (§14.4) : schéma Prisma explicite = moins d'erreurs                           |

## Règles techniques associées (§14.4 — rappel implémentatif)

1. Instantanés de prix/durée figés sur `Appointment`.
2. Stockage UTC + heure locale de l'appareil connecté.
3. Anti double-réservation : transaction + contrainte DB.
4. Notifications idempotentes (clé d'unicité par événement).
5. AuditLog sur les actions importantes.
6. Règles de compatibilité = 100 % côté serveur.
7. Fichiers hors base de données, accès signé/restrictif.
8. Sauvegardes + restauration testées (P9.8).

## Coût estimé (phase gratuite tant que possible)

| Service       | Offre gratuite                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Neon          | ~0.5 GB PostgreSQL                                                                                          |
| Vercel        | hobby — **retenu** : application non commercialisée (décision du 17/10/2026), conforme aux conditions Hobby |
| Gmail SMTP    | 3 000 e-mails/mois, 100/jour                                                                                |
| Cloudflare R2 | 10 GB stockage + 10 M lectures/mois                                                                         |
| Sentry        | 5 000 erreurs/mois                                                                                          |

> **Décision (17/10/2026) :** application **non commerciale** (réservation sans paiement en ligne, « Paiement sur place »). Le plan **Hobby Vercel est donc retenu** et conforme aux conditions d'utilisation. Si le projet devenait payant/monétisé, migration vers Pro (~20 $/mois) à réévaluer.
