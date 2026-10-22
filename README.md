# Hairstyle by Patricia

**Coiffure sur rendez-vous à Dakar (Sénégal)** : départ et retwist de locs, nattes collées, vanilles, pour hommes et femmes. Site vitrine et catalogue de prestations, diagnostic de compatibilité capillaire, réservation en ligne (paiement sur place), messagerie et back-office d'administration.

🌐 **Site** : <https://hairstylebypati.vercel.app>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)

## Fonctionnalités

- **Landing** : hero plein écran, portrait en cercle animé (forme fluide en boucle), accès direct au catalogue.
- **Catalogue** de prestations (cartes immersives, photos, prix en FCFA, durée) et fiches détaillées.
- **Compatibilité capillaire** configurable avant réservation.
- **Réservation en ligne** en plusieurs étapes, créneaux protégés, liste d'attente, annulation en ligne.
- **Demandes personnalisées** avec photos de référence, galerie, FAQ, avis approuvés.
- **Back-office** : prestations, disponibilités, réservations, clients, messagerie, avis.
- Thème clair / sombre, responsive, accessibilité WCAG 2.2 AA, SEO technique (métadonnées, Open Graph, sitemap, JSON-LD).

## Démarrage rapide

```bash
npm install
cp .env.example .env.local   # renseigner les variables (noms uniquement dans le dépôt)
npx prisma migrate dev
npm run dev                  # http://localhost:3000
```

Tests : `npm test` (Vitest) · `npx playwright test` (E2E).

## Statut

Phases 0 à 12 livrées (tests, recette, revue sécurité, performance, accessibilité, SEO). Dernière évolution : refonte UI premium (accueil, catalogue, fiche coiffure, contact, demandes personnalisées, dashboard). Voir [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md) et les consignes design [DESIGN-RULES.md](DESIGN-RULES.md).

Avec `EMAIL_MODE="console"` dans `.env.local`, aucun e-mail réel n'est envoyé : les envois sont simulés et tracés. Les routes cron sont protégées par `CRON_SECRET` et définies dans `vercel.json`.

> Attention : en local, `.env.local` peut pointer vers la même base Neon que la production. Utiliser une branche Neon dédiée pour développer.

## Stack (figée — voir [docs/stack.md](docs/stack.md))

| Couche          | Choix                                                      |
| --------------- | ---------------------------------------------------------- |
| Framework       | Next.js 15 (App Router) + React 19 + TypeScript strict     |
| UI              | **Tailwind CSS v4** + composants personnalisés (shadcn/ui) |
| Base de données | PostgreSQL (Neon) + Prisma                                 |
| E-mails         | Resend                                                     |
| Fichiers        | Cloudflare R2 (API S3)                                     |
| Auth            | Auth.js (NextAuth) credentials + bcryptjs (coût 12)        |
| Hébergement     | Vercel                                                     |

## Documentation

| Document                                       | Contenu                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [Cahier de charge.md](<Cahier de charge.md>)   | Spécification client v1.0 (20 sections)                      |
| [CHANGELOG.md](CHANGELOG.md)                   | Historique des versions                                      |
| [ROADMAP.md](ROADMAP.md)                       | 13 phases, 122 mini-tâches                                   |
| [docs/acceptation.md](docs/acceptation.md)     | Critères d'acceptation §17 + couverture                      |
| [docs/plan-detaille.md](docs/plan-detaille.md) | Décomposition par module (§14.2)                             |
| [docs/stack.md](docs/stack.md)                 | Choix techniques et justification                            |
| [docs/architecture.md](docs/architecture.md)   | Arborescence par domaine + plan de pages                     |
| [docs/security.md](docs/security.md)           | Revue sécurité, risques, sauvegarde                          |
| [docs/rgpd.md](docs/rgpd.md)                   | Registre, droits et procédures RGPD                          |
| [docs/performance.md](docs/performance.md)     | Scores Lighthouse, axe, SEO et responsive                    |
| [docs/git.md](docs/git.md)                     | Branches, conventions de commit, hooks                       |
| [docs/guide-admin.md](docs/guide-admin.md)     | Guide d'utilisation du dashboard (Patricia)                  |
| [docs/maintenance.md](docs/maintenance.md)     | Environnements, déploiement, monitoring, plan de maintenance |
| [.env.example](.env.example)                   | Variables d'environnement documentées                        |

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm run ci         # CI locale : typecheck + format + lint + tests + build
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run format     # Prettier
npm run clean      # supprime le cache .next
npm run db:seed    # catégories de base + compte admin
npm run db:seed:demo  # catalogue de démonstration (développement uniquement)
npx playwright test tests/e2e/dashboard.spec.ts --project=desktop  # back-office (E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD requis)
npx playwright test tests/e2e/compatibilite.spec.ts --project=desktop  # compatibilité, photos privées et décisions
npx playwright test tests/e2e/reservations.spec.ts --project=desktop --workers=1  # réservation, annulation, calendrier
npx playwright test tests/e2e/security.spec.ts --project=desktop --workers=1  # sécurité, en-têtes, RGPD, purge
node scripts/backup-db.mjs   # sauvegarde PostgreSQL dans backups/ (ignoré par Git)
```

`npm run db:seed:demo` ajoute 12 prestations d'exemple publiées pour vérifier le site public. Ne jamais l'exécuter sur la base de production : le catalogue réel est saisi par Patricia depuis le dashboard (Phase 4).

Les hooks `pre-commit` (lint-staged + `tsc --noEmit`) et `pre-push` (`npm run ci`) sont installés automatiquement par `npm install` (script `prepare` → husky). CI/CD : locale via `npm run ci`, déploiement Vercel au push sur `main`.

### Cache `.next` : erreurs `Cannot find module './500.js'`

`next dev` et `next build` partagent le dossier `.next`. Lancer un build
(ou un `git push`, car le hook `pre-push` exécute `npm run ci`) pendant que
le serveur de développement tourne corrompt ce cache.

Procédure :

```bash
# 1. arrêter le serveur de développement (Ctrl+C)
npm run clean   # 2. supprimer le cache .next
npm run dev     # 3. relancer
```

Règle : lancer `npm run ci` / `npm run build` / `git push` serveur de
développement arrêté.

## Licence

Code propriétaire, tous droits réservés (voir [LICENSE](LICENSE)). Signalement de vulnérabilité : [SECURITY.md](SECURITY.md).

## Règles du projet

- Aucun secret réel dans le dépôt : seul `.env.example` est versionné.
- Validation serveur systématique (Zod) sur toutes les entrées.
- Règles de compatibilité vérifiées côté serveur uniquement.
- Instantanés de prix/durée sur chaque réservation.
- Dates stockées en UTC, affichées à l'heure de l'appareil connecté.
- Conventional Commits sur toutes les branches.
