# Plan détaillé par module — §14.2

**Source :** cahier des charges §14.2 (organisation logique), §14.3 (modèle de données), §14.4 (règles techniques).
**Méthode :** skill `writing-plans` — chaque module a une responsabilité unique, des données nommées, des interfaces nommées et des critères de test liés.
**Lien roadmap :** chaque module référence ses tâches ROADMAP.md.

## Conventions transverses (valables pour TOUS les modules)

- **Validation :** tout entrée serveur validée par un schéma Zod (`<module>/schemas.ts`), erreurs remontées via helper `AppError` central.
- **Accès :** toute server action d'administration vérifie la session + rôle `ADMIN` (garde `requireAdmin()`).
- **API :** Server Actions par défaut, Route Handlers uniquement pour webhooks/cron/fichiers signés.
- **Données :** suppressions logiques (`deletedAt`) sur entités à historique ; jamais de `DELETE` physique sur `Appointment`.
- **Audit :** `AuditLog` sur toute mutation sensible (qui, quoi, entité, quand, métadonnées minimales).
- **Erreurs :** jamais d'erreur interne exposée au client ; message utilisateur FR compréhensible.

---

## 1. Module `catalogue` — coiffures, catégories, photos, options

**Responsabilité :** CRUD complet du catalogue, publication, galerie, options payantes.

**Données :** `Category`, `Service`, `ServiceImage`, `ServiceOption`.

**Interfaces :**

- Public : `GET /coiffures` (catalogue + filtres), `GET /coiffures/[slug]` (fiche), `GET /categories/[slug]`.
- Dashboard : `/dashboard/catalogue` (liste, recherche, statuts), `/dashboard/catalogue/nouvelle`, `/dashboard/catalogue/[id]` (éditeur : infos, prix, durée, photos, options), `/dashboard/catalogue/categories`.
- Actions : `createService`, `updateService`, `publishService`, `archiveService`, `reorderServiceImages`, `upsertCategory`.
- Stockage : `fichiers/uploadServiceImage` (P4.4, URLs signées privées).

**Règles métier :**

- 4 modes de prix (fixe, de départ, fourchette, « Prix à confirmer ») — §4.4.
- Jamais de suppression physique d'une coiffure avec historique de réservations → archivage (P4.6).
- Publication = statut `PUBLISHED` ; brouillon invisible côté public.

**Tests / critères :** A-CAT-1 à A-CAT-5.
**Roadmap :** P4.1–P4.10, P3.2, P3.3, P3.4.

---

## 2. Module `compatibilite` — règles capillaires, questions, évaluations

**Responsabilité :** décider `compatible / incompatible / incertain` côté serveur, gérer l'évaluation par photo.

**Données :** `CompatibilityRule`, `QuestionDefinition`, `HairAssessment` (statuts : reçue, en cours, infos demandées, acceptée, refusée, réservation en attente, confirmée).

**Interfaces :**

- Moteur pur : `evaluateCompatibility({ service, answers }) → { verdict, message, missingInfo? }` — fonction pure, zéro I/O (P5.2).
- Public : `POST /compatibilite/evaluer` (server action), parcours questions conditionnelles (P5.3), état « Je ne suis pas sûr(e) » → upload photo (P5.4, P5.5).
- Dashboard : `/dashboard/evaluations` (file d'attente, photo, décisions : accepter / refuser / demander infos / proposer autre coiffure / autoriser sous conditions), historique.
- Actions : `submitAssessment`, `decideAssessment`, `requestMoreInfo`.

**Règles métier (critiques) :**

- Règles lues depuis la DB, **jamais** de décision front-only (§14.4).
- **Règle d'or :** `decideAssessment(accept)` ne crée JAMAIS d'`Appointment` : elle ouvre l'accès au réservation avec re-vérification à l'enregistrement (P5.7, P5.8).
- Photos d'évaluation : stockage privé, jamais dans la galerie publique, purge au délai configuré (P9.7).

**Tests / critères :** A-COM-1 à A-COM-6, scénarios §5.3/§5.4/§5.5 (P5.9).
**Roadmap :** P5.1–P5.9, P4.7, P4.8.

---

## 3. Module `disponibilites` — horaires, blocages, calcul de créneaux

**Responsabilité :** produire la liste des créneaux réellement réservables à une date donnée.

**Données :** `AvailabilityRule` (jour de la semaine / date, début, fin, type, statut), `BlockedPeriod` (début, fin, motif, auteur), créneaux spécifiques.

**Interfaces :**

- Moteur pur : `computeSlots({ service, date, rules, blocks, appointments }) → Slot[]` — testable sans DB (P6.1).
- Public : `GET /api/slots?serviceId=&date=` (réutilisé par le formulaire, P6.3).
- Dashboard : `/dashboard/disponibilites` (horaires habituels, exceptions, blocages), alerte « la modification impacte N RDV confirmés » (P6.10).

**Règles métier :**

- Entrées : horaires + durées prestation/options + pauses + fermetures + congés + exceptions.
- Heure locale de l'appareil connecté, conversion UTC à l'enregistrement (P1.5).
- Toute modification impactant des RDV confirmés exige confirmation explicite (P6.10).

**Tests / critères :** A-RES-2 ; P11.1.
**Roadmap :** P6.1, P6.10, P1.5.

---

## 4. Module `reservations` — machine à statuts, anti-conflit, annulation

**Responsabilité :** créer, confirmer, annuler, reprogrammer un rendez-vous sans jamais doubler un créneau.

**Données :** `Appointment` (client, prestation, début/fin, statut, **instantanés prix/durée**, options, infos capillaires, commentaires), transitions de statuts.

**Interfaces :**

- Public : parcours 8 étapes `GET /reserver` + `POST /reserver/etape/[n]` (P6.3), confirmation page + e-mail.
- Lien client signé : `GET /annulation/[token]` (P6.7).
- Dashboard : `/dashboard/calendrier` (jour/semaine/mois/liste, fiche RDV), `/dashboard/reservations/[id]`.
- Actions : `createAppointment`, `confirmAppointment`, `cancelAppointmentByAdmin`, `cancelAppointmentByLink`, `rescheduleAppointment`, `markNoShow`.

**Règles métier (critiques) :**

- Machine à statuts : `EN_ATTENTE_CONFIRMATION, CONFIRMEE, REPROGRAMMEE, ANNULEE_CLIENT, ANNULEE_ADMIN, TERMINEE, ABSENTE` — transitions contrôlées serveur (P6.5).
- **Anti double-réservation :** transaction Postgres + contrainte d'exclusivité sur (début, fin) pour statuts occupant ; test concurrence 2 clients (P6.2).
- Reprogrammation atomique : ancien créneau libéré seulement si nouveau valide (P6.8).
- Validation manuelle : créneau tenu `HOLD_SLOT_MINUTES`, libération auto à l'expiration (P6.4).
- Instantanés figés : modification du catalogue n'altère pas l'historique (P6.11, §14.4).
- Annulation client : token signé, TTL, délai minimal `MIN_CANCEL_NOTICE_HOURS`, motif obligatoire hors délai (P6.7).

**Tests / critères :** A-RES-1 à A-RES-5, A-ANN-1 à A-ANN-6 (P6.12, P11.1, P11.2).
**Roadmap :** P6.2 à P6.12, P8.7.

---

## 5. Module `clients` — fiches, historique, RGPD

**Responsabilité :** vue client unique, historique de réservations, gestion des droits (accès restreint).

**Données :** `Customer` (nom, e-mail, téléphone), relations `Appointment`, `Conversation`, `HairAssessment`, `CustomRequest`.

**Interfaces :**

- Dashboard : `/dashboard/clients` (liste), `/dashboard/clients/[id]` (fiche + historique + coordonnées) (P8.3).
- Public : fiche minimale auto-créée à la réservation (upsert par e-mail), espace client lié au lien de suivi d'e-mail.
- Actions : `upsertCustomerFromBooking`, `exportCustomerData` (RGPD §15.3), `deleteCustomerData`.

**Règles métier :**

- Minimisation des données (§15.3) : pas d'information capillaire stockée sur `Customer` (elle vit sur `Appointment`/`HairAssessment`).
- Accès restreint : un client ne voit que ses propres données (A-SEC-2).

**Tests / critères :** A-ANN-6, A-SEC-2.
**Roadmap :** P8.3, P9.6.

---

## 6. Module `demandes` — coiffures personnalisées

**Responsabilité :** recevoir et traiter une demande hors catalogue, avec historique de décisions.

**Données :** `CustomRequest` (demandeur/coordonnées, description, photos de référence, statut, réponse, prix estimatif, dates de suivi).

**Interfaces :**

- Public : `GET/POST /demandes-personnalisees` (formulaire, accusé de réception client) (P8.1).
- Dashboard : `/dashboard/demandes` (file), décisions : accepter, refuser, demander précisions, proposer prestation existante, prix estimatif, proposer créneau + historique complet (P8.2).

**Règles métier :** photos de référence via module `fichiers` (stockage privé) ; une demande acceptée propose un créneau mais ne réserve pas (même règle d'or que l'évaluation).

**Tests / critères :** couvert §11 (P8.1, P8.2).
**Roadmap :** P8.1, P8.2.

---

## 7. Module `messagerie` — boîte de réception du dashboard

**Responsabilité :** centraliser contacts, questions, commentaires RDV, demandes, compatibilité.

**Données :** `Conversation` (client, sujet, statut : nouveau, en cours, attente réponse, traité, archivé), `Message` (auteur, contenu, type, lu, **note interne**).

**Interfaces :**

- Public : `POST /contact` (anti-spam honeypot + rate limit, P3.6).
- Dashboard : `/dashboard/messages` (boîte), `/dashboard/messages/[id]`, réponse e-mail directe, notes internes.
- Actions : `createConversation`, `replyToConversation`, `setConversationStatus`, `addInternalNote`.

**Règles métier :** `isInternal=true` ⇒ jamais sérialisé vers un client (A-MES-5, test dédié).
**Tests / critères :** A-MES-1, A-MES-5.
**Roadmap :** P3.6, P7.6.

---

## 8. Module `notifications` — e-mails et notifications dashboard

**Responsabilité :** notifier sans doublon, sans bloquer, avec traçabilité des échecs.

**Données :** `Notification` (destinataire, événement, modèle, canal e-mail/dashboard, statut d'envoi, dates, **clé d'idempotence unique**).

**Interfaces :**

- Service : `notify({ event, payload, channel })` — appelé par les autres modules, jamais par le front.
- Dashboard : cloche + `/dashboard/notifications` (lien direct vers la fiche concernée).
- Cron : `POST /api/cron/reminders` (Vercel Cron, rappel H-24 configurable), idempotent.

**Règles métier (critiques) :**

- **Jamais de blocage :** envoi e-mail asynchrone (file), ne conditionne pas l'enregistrement d'une réservation (P7.2).
- Idempotence par clé `(event, entityId, recipient)` → zéro doublon (A-MES-4).
- Échecs visibles dans le dashboard + journaux (A-MES-3), reprise automatique.
- Un e-mail ne peut annoncer qu'un statut lu en base au moment de l'envoi (§20).

**Tests / critères :** A-MES-2, A-MES-3, A-MES-4, A-RES-5, A-ANN-2, A-ANN-5.
**Roadmap :** P7.1 à P7.9.

---

## 9. Module `fichiers` — stockage objet et URLs signées

**Responsabilité :** téléversement validé, stockage S3/R2, accès contrôlé, purge.

**Données :** métadonnées liées aux entités (`ServiceImage`, `HairAssessment`, `CustomRequest`) ; contenu uniquement dans R2.

**Interfaces :** `uploadFile({ scope, file })`, `getSignedUrl(key)`, `deleteFile(key)`, `purgeExpired(scope)` (cron).

**Règles métier (critiques) :** MIME + taille vérifiés **serveur**, noms non prévisibles (UUID), séparation photos publiques (catalogue) / privées (évaluation, demandes), URLs signées TTL court (§15.2).

**Tests / critères :** A-CAT-2, A-SEC-3.
**Roadmap :** P4.4, P5.5, P9.2, P9.7.

---

## 10. Module `auth` — sessions, rôles, gardes

**Responsabilité :** authentifier Sarielle, protéger tout le dashboard.

**Données :** `User` (nom, e-mail, mot de passe Argon2, rôle, créé le).

**Interfaces :** `POST /connexion`, `POST /deconnexion`, `requireAdmin()` (server actions), `middleware.ts` sur `/dashboard/*` et `/api/admin/*`.

**Règles métier :** redirection des visiteurs non authentifiés (A-SEC-1), cookies httpOnly/secure/sameSite, rate limiting login, aucun secret côté client (§15.1).

**Tests / critères :** A-SEC-1, A-SEC-4, A-SEC-5.
**Roadmap :** P1.7, P1.8, P9.1, P9.3, P9.4, P9.11.

---

## 11. Module `parametres` — réglages du salon

**Responsabilité :** configuration sans code (§20 « nouvelles prestations sans modification du code métier »).

**Données :** `Setting` (clé/valeur typée : identité, logo, contact, horaires, délais annulation/rappel, règles de validation manuelle, modèles d'e-mail, confidentialité, fuseau).

**Interfaces :** `/dashboard/parametres` (sections), `updateSettings(schema)` avec validation Zod.

**Règles métier :** valeurs lues par les moteurs (`disponibilites`, `reservations`, `notifications`) ; tout changement journalisé (AuditLog).

**Roadmap :** P8.4.

---

## 12. Module `stats` — indicateurs et journalisation

**Responsabilité :** mesurer l'activité + piste d'audit.

**Données :** `AuditLog` (utilisateur, action, entité, date, métadonnées minimales) ; agrégats sur `Appointment`, `CustomRequest`, `Conversation`.

**Interfaces :** `/dashboard` (tableau de bord P8.5), `/dashboard/statistiques` (P8.6), lecture seule.

**Règles métier :** définitions documentées (« taux de remplissage » = créneaux occupés / créneaux ouverts) ; no-show sans bannissement automatique (P8.7).

**Roadmap :** P1.10, P8.5, P8.6, P8.7.

---

## Dépendances entre modules

```
fichiers ----------> catalogue, compatibilite, demandes
catalogue ---------> compatibilite, reservations
disponibilites ----> reservations
compatibilite -----> reservations   (regle d'or : jamais l'inverse)
reservations ------> notifications, clients, stats
clients -----------> messagerie, reservations
parametres --------> disponibilites, reservations, notifications
auth --------------> tout le dashboard
```

**Bloquages critiques (ROADMAP) :** P1.4 (schéma DB) avant tout le reste ; P4.7/P4.8 avant P5 ; P6.2 avant P6.3 ; P7.2 avant tout scénario de notification.

## Ordre d'implémentation recommandé

1. `auth` + `parametres` + `fichiers` (socle) — Phase 1
2. `catalogue` — Phases 2-4
3. `compatibilite` — Phase 5
4. `disponibilites` puis `reservations` — Phase 6
5. `notifications` puis `messagerie` — Phase 7
6. `demandes`, `clients`, `stats` — Phase 8
7. Sécurité globale, performance, recette — Phases 9-11
