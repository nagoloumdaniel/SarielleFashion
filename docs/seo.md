# SEO - Sarielle Fashion (site public indexable, fr + de)

## En place

| Sujet                | Mise en oeuvre                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata             | `title` / `description` uniques par page ET par langue (`generateMetadata` + `pageMetadata`, `src/i18n/metadata.ts`), OG et Twitter complets                                                                                                                                                                                        |
| Canonical / hreflang | `canonical` auto-référent + `hreflang` fr, de, x-default (= français) sur toutes les pages publiques                                                                                                                                                                                                                                |
| Sitemap              | `/sitemap.xml` : chaque page en fr et de avec alternates, prestations publiées (date réelle de mise à jour), galerie                                                                                                                                                                                                                |
| robots.txt           | Disallow : `/dashboard/`, `/api/`, `/connexion`, `/annulation/`, `/avis/`, `/liste-attente/` (+ variantes `/de/`) ; ces pages sont aussi en `noindex`                                                                                                                                                                               |
| JSON-LD              | `HealthAndBeautyBusiness` (horaires lundi-dimanche 5h-22h, sameAs TikTok, inLanguage), `BreadcrumbList` (composant `Breadcrumb` + fiche prestation), `FAQPage` (/faq), `Service` + `Offer`/`AggregateOffer` en EUR par prestation (omis si prix « sur demande »), `AggregateRating`/`Review` UNIQUEMENT avec de vrais avis affichés |
| Images sociales      | `/opengraph-image` (fr) et `/de/opengraph-image` (de), référencées explicitement ; `/twitter-image`                                                                                                                                                                                                                                 |
| Icônes / manifest    | `favicon.ico`, `icon.svg`, `apple-icon.png`, `public/icons/icon-192                                                                                                                                                                                                                                                                 | 512.png`, `public/site.webmanifest`, `theme-color` clair/sombre (balise mise à jour par le script de thème) |
| Sécurité             | En-têtes existants (CSP, HSTS en prod, X-Frame-Options...) inchangés                                                                                                                                                                                                                                                                |
| Structure            | Un seul `h1` par page, liens internes (navbar, pied de page, fil d'Ariane, cartes), `alt` sur les images, 404 propre en `noindex`                                                                                                                                                                                                   |
| Performance          | Polices `next/font` (swap), `next/image` pour les photos, accueil sans image (LCP texte), pas de décalage de mise en page ajouté par le sélecteur de langue ni la suggestion (positionnée en fixe)                                                                                                                                  |

Tests : `tests/e2e/seo-i18n.spec.ts` (fr et de : canonical, hreflang, h1, titres uniques, JSON-LD, robots, sitemap, noindex, manifest), `tests/e2e/seo.spec.ts`, tests unitaires `src/lib/seo-jsonld.test.ts`.

## Règles de contenu

- Jamais d'avis, de prix ou d'adresse inventés. Adresse = ville seule (Clausthal-Zellerfeld) tant que Sarielle n'a pas fourni de rue.
- Contenus saisis par l'admin (descriptions de prestations) : non traduits ; une description en français sur `/de/...` reste en français.
- Aucun classement n'est garanti.

## Reste à faire (hors code)

1. **Nom de domaine définitif** : renseigner `NEXT_PUBLIC_APP_URL` sur Vercel (canonical, sitemap, hreflang et JSON-LD en dépendent), puis redirection 301 de l'ancien domaine `*.vercel.app`.
2. **Google Search Console** : ajouter la propriété (domaine), vérifier la propriété (DNS TXT), soumettre `/sitemap.xml`, contrôler la couverture et l'onglet « International » (hreflang).
3. **Bing Webmaster Tools** (importable depuis Search Console).
4. **Fiche Google Business Profile** (prestataire à domicile / sur rendez-vous) ; adresse précise seulement si Sarielle accepte de la publier.
5. **Mesure terrain des Core Web Vitals** (p75 : LCP <= 2,5 s, INP <= 200 ms, CLS <= 0,1) après mise en ligne : rapport CrUX / Search Console ; les mesures de labo (Lighthouse) ne remplacent pas le terrain.
6. Avis réels : les données structurées de notes apparaîtront d'elles-mêmes dès les premiers avis publiés.
7. Traduction éventuelle des descriptions de prestations saisies par l'admin (aujourd'hui non traduites).
