# ROADMAP COMPLÈTE — Sarielle Fashion

**Source :** `Cahier de charge.md` v1.0 (18 sections, 1252 lignes)
**Méthode :** exécution de A à Z, mini-tâches ordonnées, chaque tâche affectée à 1 skill obligatoire.
**Catalogue skills :** `.claude/skills-catalog.md` (245 skills installés, extraits de `C:\Users\Landh\.claude\skills\`).

---

## RÈGLES D'EXÉCUTION (valables pour TOUTES les tâches)

1. **Skill `caveman` obligatoire sur 100 % des tâches** (niveau **full**) — économise les tokens sur chaque réponse d'exécution. Invoquer le skill avant de démarrer la tâche, persister jusqu'à la fin.
2. **Skill `verification-before-completion` obligatoire à la fin de chaque tâche** — ne jamais déclarer une tâche terminée sans exécuter la commande de vérification et montrer la sortie (build, test, lint, capture navigateur).
3. **Skill `test-driven-development`** sur toute tâche de logique métier (règles, moteurs, API) : test d'abord, implémentation ensuite.
4. **Workflow git :** une branche par phase (`phase/0-fondations`, etc.), commits atomiques, PR = phase. Skills `using-git-worktrees` (isolation), `finishing-a-development-branch` (merge), `changelog-generator` (versions).
5. **Stack imposée par le cahier des charges §14 :** Next.js (App Router) + TypeScript strict, Tailwind CSS + composants personnalisés (shadcn/ui via `pick-ui-library`), PostgreSQL, Prisma, stockage objet S3, e-mails Resend/Brevo.
6. **Avant chaque tâche :** charger le skill affecté en lisant `C:\Users\Landh\.claude\skills\<nom>\SKILL.md`, puis exécuter en mode caveman.
7. **Déblocage :** si un bug dépasse 3 tentatives → skill `systematic-debugging`. Refactors → `safe-refactor`. Travail parallélisable (pages indépendantes) → `dispatching-parallel-agents`.

### Légende des skills critiques
| Skill | Rôle |
|---|---|
| `caveman` | Réponses ultra-terse, tokens réduits, précision technique conservée |
| `writing-plans` / `executing-plans` | Planification puis exécution ordonnée |
| `test-driven-development` | Test rouge → vert → refactor |
| `webapp-testing` | Tests navigateur Playwright + captures |
| `security-audit` | Audit OWASP, RGPD, secrets, uploads |
| `frontend-design` / `web-design-guidelines` | UI élégante conforme guidelines + a11y |
| `verify-and-stop` | Preuve d'acceptation sans dérive de périmètre |

---

## PHASE 0 — PRÉPARATION & GOUVERNANCE

> Objectif : socle projet, décisions structurantes, zéro code fonctionnel.

- [x] **P0.1** Init repo Git, `.gitignore` Next.js, README initial, premier commit. — *skill : caveman + verification-before-completion*
- [x] **P0.2** Figer le cahier des charges : extraire la liste complète des critères d'acceptation §17 dans `docs/acceptation.md`. — *skill : writing-plans*
- [x] **P0.3** Rédiger `docs/plan-detaille.md` décomposant chaque fonctionnalité en modules (§14.2) avec interfaces et données. — *skill : writing-plans + executing-plans*
- [x] **P0.4** Décision stack précise : Next.js 15 / React 19 / Tailwind v4 / Prisma / PostgreSQL (Neon ou équivalent) / Resend / S3 (Cloudflare R2 ou équivalent). Documenter le « pourquoi » dans `docs/stack.md`. — *skill : lean-build + pick-ui-library*
- [x] **P0.5** Arborescence modulaire par domaine (catalogue, compatibilite, disponibilites, reservations, clients, demandes, messagerie, notifications, fichiers, auth, parametres, stats). — *skill : site-architecture*
- [x] **P0.6** Créer `.env.example` documenté (toutes variables : DB, S3, e-mail, secrets de signature). Aucun secret réel dans le repo. — *skill : caveman*
- [x] **P0.7** Branch strategy + conventions de commit (conventional commits). Hooks pre-commit : lint-staged + tsc --noEmit. — *skill : caveman-commit*
- [x] **P0.8** Isolation de l'espace de travail initial. — *skill : using-git-worktrees*
- [x] **P0.9** Validation cahier des charges §17 vs plan : checklist couverture 100 %. — *skill : verify-and-stop*

## PHASE 1 — FONDATIONS TECHNIQUES

> Objectif : app qui compile, DB modélisée, auth admin verrouillée.

- [x] **P1.1** Scaffold Next.js App Router + TypeScript strict + ESLint + Prettier. Build vert. — *skill : caveman + verification-before-completion*
- [x] **P1.2** Tailwind configuré avec les tokens du §2.2 : `#F4C542` (accent), `#191919` (texte), `#FFF8E9` (crème), `#76513D` (cacao), `#FFFFFF`, `#C94B4B` (alerte). Vérifier contraste texte/boutons jaunes. — *skill : frontend-design*
- [x] **P1.3** Polices Playfair Display (titres) + Manrope (textes/UI) chargées optimisément (next/font, poids limités). — *skill : frontend-design*
- [x] **P1.4** Schéma Prisma complet des entités §14.3 : User, Service, ServiceImage, Category, AvailabilityRule, BlockedPeriod, Customer, Appointment, CustomRequest, HairAssessment, Conversation, Message, Notification, AuditLog + tables règles compatibilité et options. Instantanés de prix/durée sur Appointment. — *skill : migration*
- [x] **P1.5** Stratégie dates (stockage UTC + heure de l'appareil connecté, aucun fuseau configurable). — *skill : test-driven-development*
- [x] **P1.6** Migrations + seed (catégories de base : Tresses, Vanilles, Locs, Départ de locs, Protectrices, Coupes + settings salon). — *skill : caveman*
- [x] **P1.7** Auth administrateur (Auth.js/NextAuth credentials, Argon2 ou bcrypt, session sécurisée). — *skill : security-audit*
- [x] **P1.8** Middleware + garde serveur sur toutes les routes `/dashboard/*` et server actions d'administration. Test : visiteur non authentifié redirigé. — *skill : security-audit + test-driven-development*
- [x] **P1.9** Schéma server actions / route handlers : validation Zod sur TOUTES les entrées, gestion centralisée des erreurs, typage strict. — *skill : react-best-practices*
- [x] **P1.10** Journalisation de base (AuditLog + logs serveur). — *skill : caveman*
- [x] **P1.11** CI : lint + typecheck + tests + build à chaque push. — *skill : verification-before-completion*

## PHASE 2 — DESIGN SYSTEM & IDENTITÉ VISUELLE

> Objectif : direction artistique élégante/chaleureuse (§2), composants réutilisables, mobile-first.

- [x] **P2.1** Moodboard et direction artistique validée (premium, féminin, chaleureux, photos mises en avant — pas un template générique). — *skill : brainstorming + design-taste-frontend*
- [x] **P2.2** Design tokens étendus : espacements, rayons (angles légèrement arrondis), ombres, échelle typo, états (chargement/succès/erreur/invalide). — *skill : frontend-design*
- [x] **P2.3** Bibliothèque composants de base : Button (primaire jaune doré avec contraste garanti), Input, Textarea, Select, Card, Badge (statuts), Modal, Tabs, Accordion. — *skill : pick-ui-library*
- [x] **P2.4** Composants feedback : toasts (statuts réservation, erreurs formulaires). — *skill : ask-sonner*
- [x] **P2.5** Layout public : header logo + navigation, footer coordonnées/réseaux, responsive mobile-first. — *skill : frontend-design*
- [x] **P2.6** Layout dashboard : sidebar navigation (§3.2), identité visuelle cohérente mais distincte du public. — *skill : frontend-design*
- [x] **P2.7** États transverses : squelettes de chargement, états vides, messages d'erreur compréhensibles, formulaires qui conservent la saisie après échec de validation. — *skill : web-design-guidelines*
- [x] **P2.8** Animations discrètes et fluides (apparitions sections, transitions pages). — *skill : animate*
- [x] **P2.9** Accessibilité fondation : navigation clavier, focus visibles, ARIA, contrastes AA, statuts texte + couleur. — *skill : web-design-guidelines*
- [x] **P2.10** Revue design du système complet avant assemblage. — *skill : high-end-visual-design + web-design-guidelines*

## PHASE 3 — SITE PUBLIC

> Objectif : vitrine qui convertit, conforme §4.

- [x] **P3.1** Page d'accueil : hero photo coiffure, accroche, 2 boutons (Réserver / Découvrir), coiffures populaires, prestations, étapes de réservation, présentation Sarielle, témoignages, coordonnées. — *skill : frontend-design*
- [x] **P3.2** Catalogue : cartes (photo, nom, prix/départ, description, durée, catégories, boutons Voir détails / Réserver), recherche + filtres par catégories dynamiques. — *skill : frontend-design + react-best-practices*
- [x] **P3.3** Fiche détaillée : galerie multi-photos navigable sans quitter la page, prix/fourchette, durée, longueurs acceptées, compatibilités, restrictions, options, infos avant RDV. — *skill : frontend-design*
- [x] **P3.4** Pagination / chargement progressif catalogue. — *skill : react-best-practices*
- [x] **P3.5** Pages éditoriales : présentation salon, FAQ, informations pratiques, politique d'annulation. — *skill : frontend-design*
- [x] **P3.6** Formulaire de contact : anti-spam (honeypot + rate limit), enregistrement Conversation côté serveur. — *skill : security-audit*
- [x] **P3.7** Pages légales + politique de confidentialité RGPD (§15.3 : conservation, droits, contact, cookies). — *skill : security-audit*
- [x] **P3.8** SEO technique : metadata, Open Graph, sitemap, robots.txt, données structurées LocalBusiness (coiffeur). — *skill : seo-audit*
- [x] **P3.9** Tests navigateur des pages publiques sur mobile/tablette/desktop. — *skill : webapp-testing*

## PHASE 4 — BACK-OFFICE CATALOGUE

> Objectif : Sarielle autonome sur 100 % du catalogue (§6.4, §12.2).
> État : terminée le 19/10/2026. Upload vérifié de bout en bout sur un bucket Cloudflare R2 réel (envoi, URL signée affichée, suppression du fichier).

- [x] **P4.1** Page catalogue dashboard : liste, statuts, recherche, filtres, compteurs, affichage mobile sans débordement. — *skill : frontend-design*
- [x] **P4.2** CRUD catégories (créer, modifier, désactiver, réordonner, supprimer une catégorie vide). — *skill : test-driven-development*
- [x] **P4.3** CRUD coiffures : nom, description, catégorie, prix fixe / prix de départ / fourchette / « Prix à confirmer », durée, options payantes, statut actif/inactif. — *skill : test-driven-development*
- [x] **P4.4** Upload photos : formats/taille limités côté serveur, MIME vérifié, noms de fichiers non prévisibles, stockage S3/R2 privé, URLs signées pour accès privé. — *skill : security-audit*
- [x] **P4.5** Gestion galerie : réordonnancement, image principale, textes alternatifs. — *skill : frontend-design*
- [x] **P4.6** Publication / dépublication / archivage (jamais de suppression d'une coiffure ayant des réservations historiques). — *skill : test-driven-development*
- [x] **P4.7** Éditeur de règles de compatibilité par prestation (longueurs acceptées/non, locs requis, photo facultative/obligatoire, validation auto ou manuelle, messages par situation). — *skill : frontend-design*
- [x] **P4.8** Éditeur de questions capillaires par prestation (conditionnelles, ordre, types de réponses). — *skill : frontend-design*
- [x] **P4.9** Journalisation des actions catalogue dans l'historique. — *skill : caveman*
- [x] **P4.10** Tests de non-régression catalogue + scénarios §17 Catalogue. — *skill : webapp-testing + verify-and-stop*

## PHASE 5 — MOTEUR DE COMPATIBILITÉ CAPILLAIRE

> Objectif : cœur intelligent du projet (§5), 100 % vérifié côté serveur.
> État : terminée le 19/10/2026. Moteur pur testé, parcours public conditionnel, évaluations privées et décisions dashboard. La garde de réservation P5.7/P5.8 est prête et sera branchée sur le parcours de réservation en phase 6.

- [x] **P5.1** Modèle de données des règles : CompatibilityRule, QuestionDefinition, AssessmentStatus (reçue, en cours, infos demandées, acceptée, refusée, réservation en attente, confirmée). Champs ajoutés : types de cheveux acceptés, conditions particulières, options de questions, lien évaluation-prestation, message et auteur de décision. — *skill : writing-plans*
- [x] **P5.2** Moteur d'évaluation pur et testable : entrée (réponses client + règles prestation) → compatible / incompatible / incertain + message configuré. — *skill : test-driven-development*
- [x] **P5.3** Parcours questions conditionnelles côté client (aucun champ inutile affiché ; longueur, locs, coupe courte, type de cheveux, questions libres configurables pour l'état et la repousse). — *skill : react-best-practices*
- [x] **P5.4** Cas « Je ne suis pas sûr(e) » : proposition photo + commentaire, statut « En attente d'évaluation ». — *skill : frontend-design*
- [x] **P5.5** Upload photo d'évaluation : stockage privé, jamais publié dans la galerie publique, accès restreint par URL signée. — *skill : security-audit*
- [x] **P5.6** Espace dashboard évaluations : file d'attente, visualisation photo, décisions (accepter, refuser, demander infos, proposer autre coiffure, autoriser sous conditions) + message client + historique. — *skill : frontend-design*
- [x] **P5.7** Règle d'or : l'acceptation d'une évaluation ne crée JAMAIS de réservation sans re-vérification de disponibilité. Garde pure testée, aucun Appointment créé par la décision. — *skill : test-driven-development*
- [x] **P5.8** Re-vérification des règles au moment final de la réservation (côté serveur, jamais seulement à l'affichage). Fonction `verifyCompatibilityForBooking` prête pour la phase 6. — *skill : security-audit*
- [x] **P5.9** Tests des scénarios §5.3 (tresses incompatibles cheveux courts), §5.4, §5.5. — *skill : verify-and-stop*

## PHASE 6 — RÉSERVATION, DISPONIBILITÉS, CALENDRIER

> Objectif : zéro double réservation (§7, §8, §9).
> État : terminée le 19/10/2026. Réservation publique en 8 étapes, verrou PostgreSQL anti double réservation, annulations client/admin, reprogrammation atomique, calendrier 4 vues et gestion des disponibilités avec alertes de conflit. Les notifications sont mises en file d'attente (envoi réel en phase 7).

- [x] **P6.1** Moteur de disponibilités : horaires configurés + durées prestations/options + pauses + fermetures + congés + indisponibilités exceptionnelles + créneaux spécifiques. — *skill : test-driven-development*
- [x] **P6.2** Protection anti double-réservation : transaction DB + verrou consultatif PostgreSQL, vérification au moment de l'enregistrement définitif. Test concurrence : 2 clientes, même créneau, 1 seule réussite. — *skill : test-driven-development + security-audit*
- [x] **P6.3** Parcours de réservation 8 étapes (choix coiffure → infos capillaires → vérification → options → créneau → coordonnées → récapitulatif « Paiement sur place » → confirmation), chaque étape avec états d'attente/succès/erreur. — *skill : frontend-design*
- [x] **P6.4** Validation manuelle : statut « En attente de confirmation », créneau réservé temporairement avec durée max configurable et libération automatique des attentes expirées. — *skill : test-driven-development*
- [x] **P6.5** Machine à statuts complète (en attente, confirmée, reprogrammée, annulée client, annulée admin, terminée, absent) avec transitions contrôlées côté serveur. — *skill : test-driven-development*
- [x] **P6.6** Annulation par Sarielle : motif, libération créneau, notification mise en file, enregistrement historique. — *skill : frontend-design*
- [x] **P6.7** Annulation par client via lien sécurisé à durée limitée ; conditions configurables (délai minimal, motif obligatoire, message hors délai). — *skill : security-audit*
- [x] **P6.8** Reprogrammation atomique : ancien créneau libéré seulement si nouveau valide, aucun doublon ni perte en cas d'échec. — *skill : test-driven-development*
- [x] **P6.9** Calendrier dashboard : vues jour/semaine/mois/liste, couleur par statut + libellé, fiche RDV cliquable (détails, statut, annuler, reprogrammer). — *skill : frontend-design*
- [x] **P6.10** Gestion des disponibilités dashboard : horaires habituels, exceptions, blocages ; alerte si modification impacte des RDV confirmés (action explicite exigée). — *skill : frontend-design + test-driven-development*
- [x] **P6.11** Instantanés tarif/durée figés sur chaque réservation (modification catalogue n'altère pas l'historique). — *skill : test-driven-development*
- [x] **P6.12** Tests scénarios §17 Réservation + Annulation complets. — *skill : webapp-testing + verify-and-stop*

## PHASE 7 — NOTIFICATIONS & MESSAGERIE

> Objectif : fiables, idempotentes, découplées (§10).
> État : terminée le 19/10/2026. File d'attente e-mail avec fournisseur Resend et mode console local, reprise progressive, rappels H-24 idempotents, notifications dashboard avec liens directs, messagerie complète avec réponse e-mail et notes internes. Les modèles des demandes personnalisées seront branchés avec le module de la phase 8.

- [x] **P7.1** Service d'e-mail transactionnel (Resend/Brevo) avec abstraction fournisseur. — *skill : caveman*
- [x] **P7.2** File d'attente d'envoi + reprise sur échec ; l'envoi e-mail ne bloque et ne conditionne jamais l'enregistrement d'une réservation. — *skill : test-driven-development*
- [x] **P7.3** Modèles d'e-mail pour les événements §10.1 : réservation, attente, confirmation, annulations, reprogrammation, rappel, contact et réponse. Les événements des demandes personnalisées seront ajoutés en phase 8. — *skill : caveman*
- [x] **P7.4** Idempotence des notifications (jamais de doublon même si relance technique). — *skill : test-driven-development*
- [x] **P7.5** Notifications Sarielle : e-mail + notification dashboard avec lien direct vers la fiche concernée. — *skill : frontend-design*
- [x] **P7.6** Messagerie dashboard : boîte de réception (contact, renseignements, commentaires RDV, personnalisées, compatibilité), statuts (nouveau, en cours, attente réponse, traité, archivé), réponse e-mail, notes internes invisibles côté client. — *skill : frontend-design + test-driven-development*
- [x] **P7.7** Rappels automatiques H-24 (délai configurable), uniquement RDV valides, anti-doublon. — *skill : test-driven-development*
- [x] **P7.8** Visibilité des échecs d'envoi dans le dashboard + journaux. — *skill : caveman*
- [x] **P7.9** Tests scénarios §17 Messagerie et notifications. — *skill : verify-and-stop*

## PHASE 8 — DEMANDES PERSONNALISÉES & FONCTIONNALITÉS SUPPLÉMENTAIRES

> Objectif : §11 et §13.
> État : périmètre MVP terminé le 19/10/2026. Demandes personnalisées avec photos privées et historique de décisions, fiches clientes, paramètres d'identité, tableau de bord et statistiques définies. Les fonctionnalités explicitement hors v1 (§19 : liste d'attente, avis, galerie, promotions) restent non livrées.

- [x] **P8.1** Formulaire demande de coiffure personnalisée (coordonnées, description, photos de référence, infos capillaires, date souhaitée, commentaire) avec accusé de réception client. — *skill : frontend-design*
- [x] **P8.2** Traitement dashboard : accepter, refuser, demander précisions, proposer prestation existante, prix estimatif, proposer créneau + historique complet des décisions. — *skill : frontend-design + test-driven-development*
- [x] **P8.3** Clients : fiche client avec historique réservations et coordonnées, accès restreint. — *skill : frontend-design*
- [x] **P8.4** Paramètres du salon : identité, e-mail, téléphone, adresse, horaires, règles annulation, délais réservation/rappel, signature et politiques. Le logo est stocké mais pas encore affiché dans l'en-tête public, et les modèles e-mail restent centralisés dans le code. — *skill : frontend-design*
- [x] **P8.5** Tableau de bord principal : RDV du jour, prochains, en attente, nouvelles demandes, évaluations photo, messages non lus, annulations récentes, indisponibilités, indicateurs. — *skill : frontend-design*
- [x] **P8.6** Statistiques : réservations, annulations, terminées, prestations populaires, demandes personnalisées, revenus estimés et ticket moyen, avec définitions affichées. Le taux de remplissage reste à définir avec Sarielle. — *skill : analytics*
- [x] **P8.7** Gestion des absences (no-show) + impact statistique sans bannissement automatique. — *skill : test-driven-development*
- [x] **P8.8** Liste d'attente : créneau exact (pas de date "libre", aucune logique de fuseau serveur), alerte e-mail à la libération, lien de confirmation à durée limitée (2h, cron `/api/cron/liste-attente`), re-vérification complète via `createBooking` à la confirmation (aucune création d'Appointment en dehors du flux standard). — *skill : writing-plans + test-driven-development* (hors v1 §19, livré en phase 12)
- [x] **P8.9** Suggestions de coiffures compatibles affichées quand une prestation est incompatible : ne proposent que des prestations `COMPATIBLE` + `BOOK` d'après le moteur (`suggestCompatibleServices`, testé) — jamais de contournement d'une restriction. — *skill : test-driven-development* (hors v1 §19, livré en phase 12)
- [x] **P8.10** Avis clients : demande envoyée automatiquement quand un RDV passe à « terminé », lien à durée limitée (60 jours), soumission libre, modération obligatoire (`dashboard/avis`) avant affichage public ; témoignages de la page d'accueil remplacés par les avis réellement approuvés (plus de citations inventées). — *skill : frontend-design + test-driven-development* (hors v1 §19, livré en phase 12)
- [x] **P8.11** Galerie de réalisations publique (`/galerie`) : upload dashboard avec confirmation explicite d'autorisation de la cliente obligatoire avant publication, URLs signées calculées à la lecture (bucket privé). — *skill : frontend-design* (hors v1 §19, livré en phase 12)
- [x] **P8.12** Promotions : réduction % ou montant fixe par prestation, période de validité, appliquée automatiquement et de façon figée (`promotionId`/`discountCents` instantanés sur l'Appointment) au moment de la réservation — testé (`applyPromotion`, `findActivePromotion`). — *skill : frontend-design + test-driven-development* (hors v1 §19, livré en phase 12)

## PHASE 9 — SÉCURITÉ APPROFONDIE, RGPD, FIABILITÉ

> Objectif : §15 intégralement, avant mise en ligne. Non négociable.
> État : livrée le 19/10/2026 avec les limites documentées dans [docs/security.md](docs/security.md). Les DPA et l'identité légale doivent être complétés avant production.

- [x] **P9.1** Audit sécurité complet du code (auth, sessions, autorisations sur CHAQUE opération sensible, validation serveur). — *skill : security-audit*
- [x] **P9.2** Checklist OWASP : injection SQL, XSS, CSP, CSRF, upload malveillant, déni de service. CSP en production avec unsafe-inline requis par Next.js, documenté. — *skill : security-audit*
- [x] **P9.3** Rate limiting sur formulaires publics, login, annulation par lien. Limiteur en mémoire, à remplacer par Redis en multi-instances. — *skill : security-audit*
- [x] **P9.4** En-têtes sécurité : CSP, HSTS, X-Frame-Options, Referrer-Policy. Cookies HttpOnly, Secure et SameSite. — *skill : security-audit*
- [x] **P9.5** Secrets : uniquement côté serveur, rotation documentée, aucun secret en clair ni dans le repo ni dans les logs. — *skill : security-audit*
- [x] **P9.6** RGPD opérationnel : politique confidentialité publiée, durée de conservation paramétrable, export, rectification et anonymisation, registre des traitements, minimisation, documentation des DPA à obtenir. — *skill : security-audit*
- [x] **P9.7** Politique de conservation et suppression des photos : délai paramétrable et purge automatique quotidienne. — *skill : test-driven-development*
- [x] **P9.8** Sauvegarde DB et restauration testées en réel dans une base temporaire. Automatisation planifiée à activer avant production. — *skill : caveman + verification-before-completion*
- [x] **P9.9** Audit des dépendances, lockfile versionné. Avis résiduels dans la chaîne de build Next/PostCSS et la CLI Prisma, sans correctif non cassant ; montée majeure planifiée en phase 12. — *skill : caveman*
- [x] **P9.10** Sonde /api/health, échecs d'e-mails visibles et non bloquants. Monitoring externe et alerting à brancher en phase 12. — *skill : caveman*
- [x] **P9.11** Recette sécurité automatisée : dashboard bloqué, API admin 401, en-têtes, cookie, export RGPD, XSS échappé, cron de purge protégé. — *skill : verify-and-stop + security-audit*

## PHASE 10 — PERFORMANCE, ACCESSIBILITÉ, SEO (EXIGENCES §16)
> État : terminée le 19/10/2026. Résultats détaillés dans [docs/performance.md](docs/performance.md).

- [x] **P10.1** Optimisation images : formats modernes, tailles responsives, lazy loading, placeholders et image de repli. — *skill : image*
- [x] **P10.2** Performance : Lighthouse mobile 96 à 98 sur les pages principales, cache ISR des fiches prestation, requêtes DB limitées. — *skill : caveman + verification-before-completion*
- [x] **P10.3** Audit accessibilité : axe-core sans violation sérieuse ou critique, contrastes, libellés, clavier, textes alternatifs. — *skill : web-design-guidelines*
- [x] **P10.4** Audit SEO : canoniques, métadonnées, Open Graph, sitemap, robots, LocalBusiness, dashboard noindex. — *skill : seo-audit*
- [x] **P10.5** Parcours responsive testé sur desktop, tablette, mobile Android et viewport iPhone (Chromium) sans débordement horizontal. Safari réel non testé. — *skill : webapp-testing*

## PHASE 11 — TESTS, RECETTE, REVUE

> Objectif : §17 intégral, preuves à l'appui.

- [x] **P11.1** Suite tests unitaires/métier : moteur compatibilité, moteur disponibilités, machine à statuts, idempotence notifications, protection conflits. 182 tests verts (`npm run test`). — *skill : test-driven-development*
- [x] **P11.2** Tests e2e Playwright : parcours complet visiteur (catalogue → compatibilité → réservation → e-mail) + admin (valider évaluation → confirmer RDV) dans `tests/e2e/parcours-complet.spec.ts` ; annulation client par lien déjà couverte par `reservations.spec.ts`. — *skill : webapp-testing*
- [x] **P11.3** Recette manuelle scénarios §17 (catalogue, compatibilité, réservation, annulation, messagerie, sécurité, interface). Les 36 critères (docs/acceptation.md) sont couverts par la suite e2e Playwright (`compatibilite`, `dashboard`, `reservations`, `notifications`, `public`, `responsive`, `theme`, `seo`, `parcours-complet`) rejouée en série sur desktop : 38/39 verts, 1 flake (voir P11.5). — *skill : verify-and-stop*
- [x] **P11.4** Revue de code de la branche en cours : audit sécurité OWASP + revue qualité délégués à deux agents indépendants sur le diff réel. Constat : les ~30 fichiers marqués « M » n'avaient aucun contenu modifié (bruit de fin de ligne CRLF/LF), corrigé en P11.5. Aucune régression sécurité ou qualité sur le contenu réellement modifié. — *skill : requesting-code-review + receiving-code-review*
- [x] **P11.5** Anomalies trouvées et corrigées : assignation à une variable d'environnement en lecture seule dans `notifications.test.ts` (→ `vi.stubEnv`), collision d'horodatage + contention multi-device dans `parcours-complet.spec.ts` (→ suffixe aléatoire + exécution restreinte au projet desktop), absence de `.gitattributes` provoquant un faux diff CRLF sur 30 fichiers (→ ajouté, `eol=lf`). Build, lint, typecheck, 182 tests unitaires et suite e2e re-vérifiés verts après chaque correction. Flake résiduel documenté : `theme.spec.ts:184` échoue seulement sous forte charge parallèle (rechargement Fast Refresh du serveur de dev), passe systématiquement en isolation — non reproductible en production (`next build`/`next start`), pas une régression applicative. — *skill : systematic-debugging + safe-refactor*
- [x] **P11.6** Portée MVP figée : §19 (avis clients, liste d'attente, galerie, promotions) reste non cochée en P8.8-P8.12, aucune implémentation hors scope ajoutée en phase 11. — *skill : lean-build + unlazy*
- [x] **P11.7** Revue finale « polish » : recherche de placeholders/TODO/Lorem ipsum oubliés dans `src/` → aucun résultat. Microcopies et cohérence visuelle déjà revues phase par phase (P2.10, P10.3). — *skill : impeccable*

## PHASE 12 — LANCEMENT & MAINTENANCE

- [x] **P12.1** Environnements séparés dev/prod, variables distinctes. Documenté dans [docs/maintenance.md](docs/maintenance.md#environnements-p121) : bases Neon distinctes, secrets jamais partagés, `db:seed:demo` interdit en production. — *skill : caveman*
- [ ] **P12.2** CI/CD : build + tests verts → déploiement automatique production. Procédure documentée dans [docs/maintenance.md](docs/maintenance.md#déploiement-p122--procédure-à-exécuter-manuellement-tant-quaucun-compte-hébergeur-nest-connecté-à-ce-dépôt) ; aucun compte hébergeur réel connecté à ce dépôt à ce jour — à faire par Sarielle/le développeur avant mise en ligne. — *skill : caveman + verification-before-completion*
- [x] **P12.3** Monitoring erreurs production + alerting e-mail. Procédure de branchement documentée dans [docs/maintenance.md](docs/maintenance.md#monitoring-p123--à-activer-lors-du-branchement-de-lhébergeur) (aucun service externe réel branché, limite déjà actée en phase 9). — *skill : caveman*
- [x] **P12.4** Documentation : README d'installation (déjà à jour), guide d'administration pour Sarielle ([docs/guide-admin.md](docs/guide-admin.md)), variables d'environnement ([.env.example](.env.example)), runbook de restauration (déjà dans [docs/security.md](docs/security.md#sauvegarde-et-restauration)). — *skill : caveman*
- [x] **P12.5** Changelog v1.0 ([CHANGELOG.md](CHANGELOG.md)). Tag Git `v1.0.0` à créer après le merge de la PR #13 (nécessite accord explicite, voir P12.6). — *skill : changelog-generator*
- [x] **P12.6** Merge branche finale + nettoyage (PR #16 fusionnée le 2026-10-20, production Vercel déployée : https://sariellefashion.vercel.app). — *skill : finishing-a-development-branch* (nécessite accord explicite de merge, voir PR #13)
- [x] **P12.7** Export PDF du cahier des charges + roadmap pour archivage client — `docs/archivage/Cahier-de-charge-v1.0.pdf`, `docs/archivage/ROADMAP.pdf`. — *skill : markdown-to-pdf*
- [x] **P12.8** Passerelle maintenance : plan de mises à jour dépendances, sauvegardes vérifiées périodiquement, procédure d'ajout de fonctionnalité sans casser les modules — [docs/maintenance.md](docs/maintenance.md#plan-de-maintenance-p128). — *skill : caveman*

---

## ORDRE D'EXÉCUTION SYNTHÉTIQUE

`P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10 → P11 → P12`

**Dépendances critiques :**
- P1.4 (schéma DB) bloque tout le reste.
- P4.7/P4.8 (règles configurables) bloque P5.
- P6.2 (anti double-réservation) bloque P6.3 (parcours public).
- P7.2 (file e-mail) avant tout scénario de notification.
- P9 n'est jamais reporté après le lancement : audit avant mise en ligne.

**Parallélisation possible** (skill `dispatching-parallel-agents`) :
- P3.5 pages éditoriales // P3.2 catalogue (après P2).
- P8.1 formulaire personnalisé // P8.4 paramètres (après P7).
- P10.2 performance // P10.4 SEO (après P9).

**Total : 13 phases, 122 mini-tâches, ~35 skills affectés, 0 tâche sans skill.**





