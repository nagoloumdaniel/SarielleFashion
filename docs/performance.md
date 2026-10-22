# Performance, accessibilité et SEO (phase 10)

Mesures effectuées le 19/10/2026 sur le build de production local (`next build` puis `next start`), Lighthouse 13.5.0 en émulation mobile, avec axe-core pour l'accessibilité et Playwright pour le responsive.

## Scores Lighthouse mobile

| Page                                | Performance | Accessibilité | Bonnes pratiques | SEO | LCP   |
| ----------------------------------- | ----------- | ------------- | ---------------- | --- | ----- |
| Accueil `/`                         | 96          | 100           | 100              | 100 | 2,7 s |
| Catalogue `/coiffures`              | 97          | 100           | 100              | 100 | 2,5 s |
| Prestation `/coiffures/tresses-box` | 97          | 100           | 100              | 100 | 2,5 s |
| Réservation `/reserver`             | 97          | 100           | 100              | 100 | 2,3 s |
| Demandes `/demandes-personnalisees` | 97          | 100           | 100              | 100 | 2,3 s |
| Contact `/contact`                  | 97          | 100           | 100              | 100 | 2,3 s |

Objectif P10.2 (Lighthouse mobile ≥ 90 sur les pages principales) atteint avec une marge de 6 points minimum.

## Optimisations appliquées

- Images locales et distantes en AVIF/WebP, tailles responsives, chargement différé et priorités limitées au hero.
- Placeholders flous pour éviter les sauts visuels pendant le chargement.
- Hero avec `priority`, images secondaires en `lazy`, dimensions explicites pour stabiliser le CLS.
- Polices auto-hébergées via `next/font`, échange contrôlé.
- Pages statiques et cache ISR de 300 secondes sur les fiches prestation, avec revalidation depuis le catalogue.
- Métadonnées bloquantes dans `<head>` pour les crawlers (`htmlLimitedBots`) afin d'éviter les balises SEO dans le body des pages dynamiques.
- Favicon et icône de marque servis localement, ce qui supprime la requête 404 observée par Lighthouse.
- Aucun JavaScript tiers, aucun outil d'analytics.

Points connus mais non bloquants dans les rapports Lighthouse : JavaScript historique résiduel de Next.js, CSS de rendu bloquant et cache `no-store` sur les pages dynamiques, qui empêche le back/forward cache.

## Accessibilité

- Audit axe-core sur l'accueil, le catalogue, la réservation, le contact, les demandes, la FAQ et trois pages dashboard : aucune violation sérieuse ou critique.
- Scores Lighthouse accessibilité 100 sur les pages publiques mesurées.
- Lien d'évitement clavier, navigation active, labels formulaires, contrastes corrigés (succès sur fond doux, boutons accent en mode sombre), image décoratives masquées.
- Thème clair/sombre avec préférence persistante et bascule clavier.
- Tests Playwright responsive sur desktop, tablette, mobile Android et viewport iPhone (Chromium). Safari réel non testé.

## SEO

- Titres et descriptions uniques, canoniques absolues, Open Graph et Twitter Card.
- Image Open Graph générée par Next (`/opengraph-image`), JSON-LD LocalBusiness sur l'accueil.
- `robots.txt` bloque dashboard, API, connexion et liens d'annulation ; dashboard en `noindex`.
- Sitemap avec pages statiques et prestations publiées, dont `/demandes-personnalisees`.
- Métadonnées dans le `<head>` même pour les pages dynamiques.
- Scores SEO Lighthouse 100 sur les pages mesurées.

## Responsive et tests

- Playwright projects : Desktop Chrome, iPad Pro 11, Pixel 7, plus une vérification iPhone 13 en contexte Chromium.
- Parcours public et dashboard vérifiés : aucun débordement horizontal, titres visibles, images chargées, lien d'évitement focusable.
- 22 parcours responsive/SEO sur les trois projects de la configuration.

## Commandes de reproduction

```bash
npm run build
npm start -- -p 3001
npx lighthouse http://localhost:3001/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo
npx playwright test tests/e2e/responsive.spec.ts tests/e2e/seo.spec.ts --workers=1
```

Lighthouse nécessite un Chrome disponible. Le chemin Chromium de Playwright peut être fourni via `CHROME_PATH`.

## Limites

- Les scores ont été mesurés en local avec un réseau simulé Lighthouse, pas sur le domaine de production. À recontrôler après déploiement Vercel.
- Lighthouse signale encore du JavaScript historique et du CSS bloquant, sans impact sur l'objectif de score.
- L'émulation iPhone utilise Chromium et non WebKit/Safari réel.
