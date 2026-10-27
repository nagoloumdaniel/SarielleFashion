# DESIGN-RULES — consignes design permanentes (Sarielle Fashion)

> Claude : relire CE fichier à CHAQUE message avant toute modification d'UI. Toute nouvelle consigne design de l'utilisateur s'ajoute ici (section « Consignes par interface »), jamais seulement dans la conversation.

## Typographie (impératif)

- Titres : **Manrope** (400–800) via `font-heading`.
- Texte : **Inter** (300–700, normal + italique) via `font-sans`.
- Aucune autre police. Chargement uniquement par `next/font` dans `src/app/layout.tsx`.

## Couleurs (impératif — aucune autre couleur de marque) : rouge, énergie, confiance, caractère

| Rôle                   | Light   | Dark    |
| ---------------------- | ------- | ------- |
| Fond (`page`)          | #FFF8F7 | #151011 |
| Surface (`card`)       | #FFFFFF | #211719 |
| Texte (`fg`)           | #271719 | #FFF4F2 |
| Primaire (`accent`)    | #C62828 | #FF6B6B |
| Accent (`accent-soft`) | #FDE6E4 | #452225 |

- Texte sur Primaire : `text-accent-fg` (blanc en light, #151011 en dark). Jamais de hex en dur : utiliser les tokens de `src/app/globals.css`.
- Nuances : échelle `primary-50…900`. Dégradé : `.bg-gradient-primary`, `.bg-gradient-soft`, `.text-gradient-primary`.
- Sur panneaux toujours sombres (footer, sidebar) : `text-bright` (#FF6B6B), pas `text-accent`.
- États alert/success restent fonctionnels (hors marque).

## Effets

- Verre : `.glass` / `.glass-strong` (blur + bordure translucide). Navbar : `.nav-floating` = barre pleine largeur fixe (web + mobile), contenu décalé par un espaceur.
- Respecter `prefers-reduced-motion`, focus visible, contraste WCAG AA, états loading/erreur/vide, responsive.

## Titres

- Titres h1/h2 publics : grands, casse normale, Manrope 800, derniers mots en rouge accent (`Title`, `size="display"` pour titre de page, animé à l'entrée). Dashboard : titres inchangés. Animation respecte `prefers-reduced-motion`.

## Cartes (consigne utilisateur)

- Toutes les cartes prestation = `PrestationCard` (photo plein cadre, voile + flou bas, badge catégorie, nom + prix, durée, bouton Réserver). Modèle : capture « Highland huts ».
- Carte entièrement cliquable vers la fiche (`.stretched-link` sur le titre) ; adapte voile/ombre au thème clair/sombre.
- Rangées de cartes = `CardCarousel` (défilement horizontal snap + flèches en verre). Plusieurs photos : points + fondu au survol.

## Page 404

- Plein écran (`fixed inset-0`), sans scroll, sans carte englobante (`src/app/not-found.tsx`). Même fond (dégradé) derrière la navbar que derrière le 404.

## Consignes par interface

- composants reutilisables
- text motion design
- utiliser les meme type de composants, meme style et allignement et espacements
- etats de chargement et rate limiting sur les boutons d'actions
- icones partout ou c'est necessaire
- animation des etats de chargements
- evite les hovers scale sur les cards et boutons
- Global : barre de navigation pleine largeur en verre avec bordure basse (plus de pilule flottante). Page 404 : `src/app/not-found.tsx` (dégradé + verre).
- Contenu : Sarielle reçoit **sur rendez-vous à Clausthal-Zellerfeld** par défaut ; pas de salon. Exception : option payante « Coiffure à domicile » (activable dans Dashboard > Paramètres, frais de déplacement à la charge de la cliente). Elle n'est mentionnée que comme **option** (« possible en option, frais de déplacement en supplément »), jamais comme règle générale ni « Sarielle se déplace chez vous » ; textes publics dynamiques affichés seulement si activée. Aucune page/lien/texte « salon » ; page `/salon` supprimée.
- Marges : toutes les pages publiques utilisent `.page-main` (+ `page-main-narrow` / `page-main-medium` pour contenus étroits) : mêmes marges latérales et verticales partout.
- Cartes prestation : toute la carte (photo comprise) mène à la fiche ; survol = changement de photo + points. Pas de carrousel horizontal : grille, 2 lignes max (6 par page), pagination sans « précédent » en page 1 ni « suivant » en dernière page.
- FAQ : questions sur 2 colonnes (md+) ; bloc « Une autre question » centré.
- Champs : menu déroulant `Select`, calendrier `DateField`, heure `TimeField`, `DateTimeField` personnalisés (jamais de select/date natifs) ; icône dans chaque champ (`Input` en ajoute automatiquement selon type/nom).
- Navbar : icônes réseaux sociaux (`SocialLinks`, react-icons) ; icônes via lucide-react, jamais d'emoji.
- Landing `/` : AUCUNE image, sauf la section « Mes réalisations » (6 dernières photos de la galerie, absente s'il n'y en a pas ; demande de la cliente). Hero typographique clair (`.landing-hero`) : pastille lieu, titre display « Ton prochain look. Un style qui te ressemble. », sous-titre, boutons Réserver/Catalogue ; à droite index numéroté des 4 savoir-faire (`.landing-index`). Puis bandeau de chiffres clés, savoir-faire (cartes texte), plus réservées, étapes, à propos, bloc déplacement sombre, demande personnalisée, contact. Tutoiement partout.
- Horaires : Lundi – Dimanche, 5h – 22h (partout). Landing : mêmes polices que le reste du site (Manrope + Inter), aucune exception.
- Boutons « Réserver » (navbar, landing, contact, infos) → `/coiffures`. `/reserver` sans `?service=` redirige vers le catalogue (plus de liste de noms) ; `/reserver?service=slug` reste le parcours de réservation.
- Dashboard admin : SANS navbar publique ni footer (masqués sous `/dashboard`). Sidebar avec icônes lucide, « Voir le site » et bascule de thème ; chaque titre de page dashboard a son icône.
- Dashboard : plein écran (pas de `max-w` global ni de marges autour), sidebar collée à gauche pleine hauteur (`lg:h-dvh`, sticky), contenu qui remplit toute la largeur restante ; responsive (mobile : barre de navigation horizontale en haut, contenu pleine largeur).
- Dashboard mobile = app mobile : barre d’'app en haut (titre, voir le site, thème) + barre d’onglets fixe en bas (icône + libellé, défilement horizontal, safe-area), contenu avec marge basse.
- Dashboard : navbar (DashboardTopbar) avec Messages, Notifications (badges), Voir le site, thème, Déconnexion ; la sidebar ne garde que les pages de gestion.
- **Refonte dashboard (consignes utilisateur)** :
  - Thème unique : le dashboard est toujours en thème clair (`DashboardThemeLock`), plus de bascule clair/sombre. Aucune couleur en dur.
  - Sidebar : pas de texte « Administration ». Mobile : barre d’onglets fixe (4 entrées + « Menu » qui ouvre toutes les pages en grille d’icônes).
  - Marges mobiles réduites au minimum (`px-3`), cartes `p-4`.
  - Cartes entièrement cliquables (`CardLink`) : jamais de bouton « Voir plus » / « Détails » sur une carte.
  - Tailles uniformes : `Button`/`ButtonLink`/champs/`Select` = h-9 (sm), h-10 (md, défaut), h-11 (lg). Pas de classes de bouton ad hoc : utiliser `Button`, `ButtonLink` (`src/components/ui/Button.tsx`).
  - Mobile : boutons en icône seule (`iconOnly="mobile"` + `icon`), libellé en `sr-only` + `title`. Libellé visible dès `sm`.
  - Icône dans chaque champ (`Input`, `Select icon`, `Textarea`).
  - Popups : `Modal` (portail, fond flouté, bouton ✕, Échap, clic extérieur, focus piégé, page non scrollable derrière). Pas de `window.confirm` : utiliser `useConfirm()` (`src/components/ui/Confirm.tsx`).
  - En-tête de page : `PageHeader` (icône + titre + description + actions).
- **Avis et galerie (consignes cliente)** :
  - Avis publiés immédiatement, sans modération ; l'admin les supprime (`useConfirm`). Étoiles 1-5 (`StarRatingInput`, `Stars`), commentaire facultatif, 3 photos max, badge « Client vérifié » pour les avis par lien e-mail. Moyenne + nombre d'avis sur `PrestationCard` et la fiche (masqués sans avis, jamais de note inventée). Tutoiement.
  - Galerie : `/galerie` (grille + `Lightbox` accessible clavier), pas de zoom au survol. Dashboard : ajout direct, légende/prestation facultatives, plus de consentement.
- **Langues (français par défaut, allemand sous `/de`)** : le site public est bilingue ; le dashboard reste en français. Sélecteur de langue `LanguageSwitcher` (`src/components/layout/LanguageSwitcher.tsx`) : segment « FR | DE » en pilule (liens réels `<a hreflang>`, `aria-current` sur la langue active, `aria-label` avec le nom de la langue, cible tactile h-8 min), placé dans la navbar (masqué sous `sm`, repris en bas du menu mobile) ET dans le pied de page (variante `tone="dark"`). Il conserve la page courante et ses paramètres. Jamais de redirection automatique selon la langue du navigateur : seulement l'encart discret et fermable `LanguageSuggestion` (rédigé dans la langue proposée). Tous les liens internes passent par `Link` de `@/i18n/link`, aucun texte en dur : dictionnaires `src/i18n/messages/{fr,de}`. Allemand : tutoiement (« du/dein »). Contenus saisis par l'admin non traduits.
