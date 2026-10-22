# Arborescence modulaire & plan de pages — P0.5

**Méthode :** skill `site-architecture` (hiérarchie de pages, URLs, navigation) + organisation par domaine §14.2.
**Principe :** une responsabilité par dossier ; le code métier vit dans `src/modules/<domaine>` et ne dépend jamais de `src/app` (l'inverse est autorisé).

## 1. Arborescence du dépôt

```
HairStyleByPati/
├── .github/workflows/ci.yml      # lint + typecheck + tests + build
├── .husky/                       # hooks git (P0.7)
├── docs/                         # acceptation, plan, stack, architecture, git
├── prisma/
│   ├── schema.prisma             # modèle §14.3 (P1.4)
│   ├── migrations/
│   └── seed.ts                   # catégories + settings (P1.6)
├── public/                       # assets statiques (logo, OG image)
├── src/
│   ├── app/
│   │   ├── (public)/             # site vitrine — sans auth
│   │   │   ├── page.tsx                  # accueil
│   │   │   ├── coiffures/                # catalogue + [slug]
│   │   │   ├── categories/[slug]/
│   │   │   ├── reserver/                 # parcours 8 étapes
│   │   │   ├── compatibilite/            # évaluation capillaire
│   │   │   ├── demandes-personnalisees/
│   │   │   ├── contact/
│   │   │   ├── salon/  faq/  informations/  annulation/
│   │   │   └── mentions-legales/  confidentialite/
│   │   ├── (auth)/connexion/
│   │   ├── dashboard/            # protégé par middleware (P1.8)
│   │   │   ├── page.tsx                  # tableau de bord
│   │   │   ├── catalogue/  categories/  regles-capillaires/
│   │   │   ├── reservations/  calendrier/  disponibilites/
│   │   │   ├── evaluations/  demandes/  messages/
│   │   │   ├── clients/  notifications/  statistiques/
│   │   │   ├── parametres/  historique/
│   │   │   └── connexion/        # écran login interne
│   │   ├── api/
│   │   │   ├── slots/                    # créneaux disponibles
│   │   │   ├── contact/                  # POST formulaire contact
│   │   │   ├── annulation/[token]/       # annulation client
│   │   │   └── cron/reminders|purge/     # Vercel Cron
│   │   ├── sitemap.ts  robots.ts  opengraph-image.tsx
│   │   ├── layout.tsx  not-found.tsx  error.tsx
│   │   └── globals.css                   # tokens Tailwind v4 (@theme)
│   ├── modules/                  # ===== 12 domaines métier =====
│   │   ├── catalogue/            schemas.ts service.ts queries.ts
│   │   │                         actions.ts components/ *.test.ts
│   │   ├── compatibilite/        engine.ts (moteur pur) ...
│   │   ├── disponibilites/       engine.ts (moteur pur) ...
│   │   ├── reservations/         status.ts actions.ts ...
│   │   ├── clients/
│   │   ├── demandes/
│   │   ├── messagerie/
│   │   ├── notifications/        templates/ queue.ts
│   │   ├── fichiers/             s3.ts signed-url.ts
│   │   ├── auth/                 guards.ts session.ts
│   │   ├── parametres/
│   │   └── stats/                audit.ts
│   ├── components/
│   │   ├── ui/                   # shadcn/ui + Button/Input/Card... (P2.3)
│   │   ├── layout/               # header, footer, sidebar (P2.5/P2.6)
│   │   └── shared/               # états vides, squelettes, erreurs (P2.7)
│   ├── lib/
│   │   ├── db.ts  auth.ts  errors.ts  mail.ts  rate-limit.ts
│   │   └── dates.ts              # UTC + heure appareil (P1.5)
│   └── types/                    # env.d.ts, globals.ts
├── tests/e2e/                    # Playwright (P11.2)
├── .env.example
├── package.json  tsconfig.json  next.config.ts  tailwind (via PostCSS)
└── README.md  ROADMAP.md  Cahier de charge.md
```

**Règle d'or :** `modules/*` ne contient AUCUN import depuis `app/*` — testable isolément (moteurs §5/§7 en pur).

## 2. Plan de pages public (hiérarchie)

```
/ (accueil)
├── /coiffures .................. catalogue (filtres ?categorie=&q=)
│   └── /coiffures/[slug] ....... fiche détaillée
│       └── /reserver?service=…  parcours de réservation
├── /compatibilite .............. évaluation capillaire (optionnelle)
├── /demandes-personnalisees .... formulaire personnalisé
├── /contact .................... message → messagerie
├── /salon ...................... présentation
├── /faq
├── /informations ............... infos pratiques + politique d'annulation
├── /annulation/[token] ......... annulation sécurisée client
├── /mentions-legales
└── /confidentialite ............ RGPD
```

| Page                  | URL                                     | Parent    | Nav            | Priorité |
| --------------------- | --------------------------------------- | --------- | -------------- | -------- |
| Accueil               | `/`                                     | —         | Header         | Haute    |
| Catalogue             | `/coiffures`                            | Accueil   | Header         | Haute    |
| Fiche coiffure        | `/coiffures/[slug]`                     | Catalogue | —              | Haute    |
| Réserver              | `/reserver`                             | Fiche     | CTA Header     | Haute    |
| Compatibilité         | `/compatibilite`                        | Fiche     | CTA contextuel | Moyenne  |
| Demande personnalisée | `/demandes-personnalisees`              | Accueil   | Header         | Moyenne  |
| Contact               | `/contact`                              | Accueil   | Header/Footer  | Moyenne  |
| Salon / FAQ / Infos   | `/salon`, `/faq`, `/informations`       | Accueil   | Header         | Basse    |
| Légal                 | `/mentions-legales`, `/confidentialite` | —         | Footer         | Basse    |

**Règles :** 3 clics maximum vers toute page importante ; aucune page orpheline (au moins 1 lien entrant) ; CTA « Réserver » visible sur toutes les pages du header ; fil d'Ariane sur catalogue et fiche.

## 3. Navigation dashboard (§3.2)

Sidebar fixe, regroupée en 4 sections :

| Section            | Entrées                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| **Pilotage**       | Tableau de bord, Calendrier, Statistiques, Historique des actions               |
| **Offre**          | Catalogue, Catégories, Règles capillaires, Disponibilités                       |
| **Clients**        | Réservations, Évaluations par photo, Demandes personnalisées, Clients, Messages |
| **Administration** | Notifications, Paramètres du salon, Déconnexion                                 |

Responsive : sidebar devient tiroir (drawer) sur mobile/tablette ; état actif visible + `aria-current="page"`.

## 4. Convention de nommage

- Dossiers/URLs en **kebab-case FR** (`demandes-personnalisees`).
- Fichiers module : `schemas.ts` (Zod), `service.ts` (règles), `queries.ts` (lectures), `actions.ts` (mutations), `engine.ts` (moteur pur), `components/` (UI du domaine), `*.test.ts`.
- Composants React : PascalCase, exports nommés.
- Variables d'env : `SCREAMING_SNAKE_CASE`.
