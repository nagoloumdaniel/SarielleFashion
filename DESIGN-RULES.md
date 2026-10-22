# DESIGN-RULES — consignes design permanentes (HairStyleByPati)

> Claude : relire CE fichier à CHAQUE message avant toute modification d'UI. Toute nouvelle consigne design de l'utilisateur s'ajoute ici (section « Consignes par interface »), jamais seulement dans la conversation.

## Typographie (impératif)

- Titres : **Playfair Display** (400–900, normal + italique) via `font-heading`.
- Texte : **Lato** (100, 300, 400, 700, 900, normal + italique) via `font-sans`.
- Aucune autre police. Manrope supprimée. Chargement uniquement par `next/font` dans `src/app/layout.tsx`.

## Couleurs (impératif — aucune autre couleur de marque)

| Rôle                   | Light   | Dark    |
| ---------------------- | ------- | ------- |
| Fond (`page`)          | #FFFCF0 | #17150B |
| Surface (`card`)       | #FFFFFF | #23200F |
| Texte (`fg`)           | #28230C | #FFF8D8 |
| Primaire (`accent`)    | #8A6400 | #FFD84D |
| Accent (`accent-soft`) | #FFF1B8 | #41350E |

- Texte sur Primaire : `text-accent-fg` (blanc en light, #17150B en dark). Jamais de hex en dur : utiliser les tokens de `src/app/globals.css`.
- Nuances : échelle `primary-50…900`. Dégradé : `.bg-gradient-primary`, `.bg-gradient-soft`, `.text-gradient-primary`.
- Sur panneaux toujours sombres (footer, sidebar) : `text-bright` (#FFD84D), pas `text-accent`.
- États alert/success restent fonctionnels (hors marque).

## Effets

- Verre : `.glass` / `.glass-strong` (blur + bordure translucide). Navbar : `.nav-floating` flottante (pilule, web + mobile), contenu décalé par un espaceur.
- Respecter `prefers-reduced-motion`, focus visible, contraste WCAG AA, états loading/erreur/vide, responsive.

## Titres (consigne utilisateur)

- Tous les titres h1/h2 publics : **grands, en MAJUSCULES**, effet « text motion design » : Playfair Display 900 mêlé à Lato italique léger en dégradé de couleur (derniers mots = accent).
- Utiliser le composant `src/components/ui/Title.tsx` (`size="display"` pour titre de page, animé à l'entrée ; `size="section"` par défaut). Sur fond foncé/ocre : `className="title-on-dark"`. Dashboard : titres inchangés.
- Animation respecte `prefers-reduced-motion`.

## Cartes (consigne utilisateur)

- Toutes les cartes prestation = `PrestationCard` (photo plein cadre, voile + flou bas, badge catégorie, nom + prix, durée, bouton Réserver). Modèle : capture « Highland huts ».
- Carte entièrement cliquable vers la fiche (`.stretched-link` sur le titre) ; adapte voile/ombre au thème clair/sombre.
- Rangées de cartes = `CardCarousel` (défilement horizontal snap + flèches en verre). Plusieurs photos : points + fondu au survol.

## Titres : polices

- Effet mix uniquement avec Playfair Display (mots forts) + Lato (mots accent italique). Aucune autre police.

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
- Global : navbar flottante verre. Page 404 : `src/app/not-found.tsx` (dégradé + verre).
- Contenu : Patricia reçoit **sur rendez-vous à Dakar** par défaut ; pas de salon. Exception : option payante « Coiffure à domicile » (activable dans Dashboard > Paramètres, frais de déplacement à la charge de la cliente). Elle n'est mentionnée que comme **option** (« possible en option, frais de déplacement en supplément »), jamais comme règle générale ni « Patricia se déplace chez vous » ; textes publics dynamiques affichés seulement si activée. Aucune page/lien/texte « salon » ; page `/salon` supprimée.
- Marges : toutes les pages publiques utilisent `.page-main` (+ `page-main-narrow` / `page-main-medium` pour contenus étroits) : mêmes marges latérales et verticales partout.
- Cartes prestation : toute la carte (photo comprise) mène à la fiche ; survol = changement de photo + points. Pas de carrousel horizontal : grille, 2 lignes max (6 par page), pagination sans « précédent » en page 1 ni « suivant » en dernière page.
- FAQ : questions sur 2 colonnes (md+) ; bloc « Une autre question » centré.
- Champs : menu déroulant `Select`, calendrier `DateField`, heure `TimeField`, `DateTimeField` personnalisés (jamais de select/date natifs) ; icône dans chaque champ (`Input` en ajoute automatiquement selon type/nom).
- Navbar : icônes réseaux sociaux (`SocialLinks`, react-icons) ; icônes via lucide-react, jamais d'emoji.
- Landing `/` : hero plein écran sur fond `bg-hero` + dégradés (`.landing-hero`), SANS fond blanc ni carte. Gauche : titre (Title, aligné à gauche, grand), sous-titre « Départ et retwist de locs, nattes collées, vanilles. », boutons Réserver/Catalogue (→ `/coiffures`). Droite : photo `public/landing/landing.jpeg` dans un cercle qui se déforme en continu (`.landing-blob`, 12 s, fluide, désactivé si reduced-motion). AUCUNE petite carte/UI autour. Photo jamais étirée (carré natif). Section « À propos » sans image.
- Horaires : Lundi – Dimanche, 5h – 22h (partout). Landing : mêmes polices que le reste du site (Playfair Display + Lato), aucune exception.
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
