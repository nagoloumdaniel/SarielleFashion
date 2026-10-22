# Git, branches et conventions — P0.7

## Branches

| Branche           | Rôle                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `main`            | état stable, toujours vert ; merge final de chaque phase              |
| `phase/<n>-<nom>` | une branche par phase (`phase/0-fondations`, `phase/1-fondations`, …) |
| `fix/<sujet>`     | correctif ponctuel hors phase                                         |

Workflow : travailler sur `phase/*` → commits atomiques → vérification → merge dans `main` → **push `main`** (règle projet) → suppression de la branche.
PR = phase (revue de code P11.4).

## Conventional Commits

```
<type>(<scope>) : <imperatif, ≤ 72 car.>

corps optionnel : le POURQUOI, wrap 72 car., puces `-`
```

Types : `feat` `fix` `refactor` `perf` `docs` `test` `chore` `build` `ci` `style` `revert`.

Scopes projet : `catalogue` `compatibilite` `disponibilites` `reservations` `clients` `demandes` `messagerie` `notifications` `fichiers` `auth` `parametres` `stats` `ui` `db` `ci` `env` `stack` `plan` `architecture` `acceptance` `git`.

Exemples :

```
feat(reservations): add slot exclusivity transaction
docs(stack): fix technical stack decisions
ci: add lint typecheck and build workflow
```

Pas d'emoji, pas d'attribution IA, pas de « now/currently » dans le corps.

## Hooks pre-commit (installés par `npm install`)

1. `lint-staged` → Prettier sur les fichiers stagés.
2. `tsc --noEmit` → typecheck strict complet.

Le commit est rejeté si l'un échoue. Contournement d'urgence uniquement : `git commit --no-verify` (à justifier).

## CI/CD locale (décision du 17/10/2026)

GitHub Actions étant désactivé sur le dépôt (« reach out to GitHub Support »), la chaîne CI tourne **en local** :

```bash
npm run ci     # typecheck, format:check, lint, test, build (étapes absentes = ignorées)
```

- Script : `scripts/ci.mjs` — fail fast, récapitulatif, code retour 0/1.
- Déclenchement automatique sur **chaque `git push`** via le hook `.husky/pre-push`.
- Les étapes s'activent seules au fil des phases : `lint` (Phase 1), `test` (Vitest, Phase 11), `build` (scaffold Next.js).
- Workflow GitHub Actions conservé dans `.github/workflows/ci.yml` : réactivable sans rien changer.
- **CD :** Vercel build automatique au push sur `main` (projet non commercial, plan Hobby retenu).

## Règles de push

- Toujours pusher `main` après une tâche/phase vérifiée.
- Jamais de secret dans un commit (`.env` ignoré, seul `.env.example` est versionné).
- Ne pas forcer (`--force`) sur `main`.
- Le hook `pre-push` exécute `npm run ci` : jamais de push avec une chaîne rouge.

## Vérification obligatoire avant chaque commit (skill `verification-before-completion`)

```bash
npm run typecheck     # doit sortir sans erreur
npm run format:check  # formatage propre
git status --short    # rien d'oublié, rien d'indésiré
```

Preuve = sortie affichée, jamais « ça devrait passer ».
