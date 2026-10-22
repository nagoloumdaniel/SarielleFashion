# Critères d'acceptation — §17 du cahier des charges

**Source :** `Cahier de charge.md` §17 (« Tests et critères d'acceptation »), figé le 17/10/2026.
**Règle :** « L'application ne sera considérée comme prête que lorsque les scénarios suivants auront été vérifiés. »
**Total : 36 critères, 7 groupes. Chaque critère est couvert par au moins une tâche de la ROADMAP.md (matrice en fin de document).**

Chaque critère porte un identifiant stable utilisé dans les recettes P11.3 et les tests e2e P11.2.

---

## A. Catalogue (5)

| ID      | Critère                                                      | Couverture roadmap                |
| ------- | ------------------------------------------------------------ | --------------------------------- |
| A-CAT-1 | Patricia peut créer une nouvelle coiffure.                   | P4.3                              |
| A-CAT-2 | Elle peut ajouter plusieurs photos.                          | P4.4, P4.5                        |
| A-CAT-3 | Elle peut modifier le tarif et la durée.                     | P4.3 (instantané protégé : P6.11) |
| A-CAT-4 | Elle peut configurer les règles de compatibilité.            | P4.7, P4.8                        |
| A-CAT-5 | La nouvelle coiffure apparaît sur le site après publication. | P4.6 + P3.2, P3.3                 |

## B. Compatibilité (6)

| ID      | Critère                                                                            | Couverture roadmap                         |
| ------- | ---------------------------------------------------------------------------------- | ------------------------------------------ |
| A-COM-1 | Une coiffure incompatible avec les cheveux courts est correctement bloquée.        | P5.2, P5.9 (scénario §5.3)                 |
| A-COM-2 | Le message explicatif configuré est affiché.                                       | P5.2, P5.3 (messages par situation : P4.7) |
| A-COM-3 | Le client peut demander une évaluation par photo lorsque cette option est activée. | P5.4, P5.5                                 |
| A-COM-4 | La demande arrive dans le dashboard.                                               | P5.6                                       |
| A-COM-5 | Patricia peut accepter ou refuser la demande.                                      | P5.6                                       |
| A-COM-6 | Une décision ne crée pas de réservation sans contrôle du créneau.                  | **P5.7, P5.8** (règle d'or)                |

## C. Réservation (5)

| ID      | Critère                                                         | Couverture roadmap          |
| ------- | --------------------------------------------------------------- | --------------------------- |
| A-RES-1 | Le client peut choisir une prestation et un créneau disponible. | P6.3                        |
| A-RES-2 | Les créneaux fermés ou déjà occupés sont refusés.               | P6.1, P6.2                  |
| A-RES-3 | Deux clients ne peuvent pas obtenir le même créneau exclusif.   | **P6.2** (test concurrence) |
| A-RES-4 | Une réservation confirmée est visible dans le calendrier.       | P6.9                        |
| A-RES-5 | Le client reçoit l'e-mail correspondant au statut réel.         | P6.5 + P7.1 à P7.4          |

## D. Annulation (6)

| ID      | Critère                                                                            | Couverture roadmap                      |
| ------- | ---------------------------------------------------------------------------------- | --------------------------------------- |
| A-ANN-1 | Patricia peut annuler une réservation.                                             | P6.6                                    |
| A-ANN-2 | Le client reçoit une notification d'annulation.                                    | P6.6 + P7.3                             |
| A-ANN-3 | Le créneau est libéré.                                                             | P6.6, P6.8                              |
| A-ANN-4 | Le client peut annuler à l'aide d'un lien sécurisé dans les conditions autorisées. | P6.7 (lien signé, délais configurables) |
| A-ANN-5 | L'administratrice reçoit la notification correspondante.                           | P7.5                                    |
| A-ANN-6 | Les rendez-vous historiques restent consultables.                                  | P6.5, P8.3                              |

## E. Messagerie et notifications (5)

| ID      | Critère                                               | Couverture roadmap |
| ------- | ----------------------------------------------------- | ------------------ |
| A-MES-1 | Un message de contact est enregistré.                 | P3.6 + P7.6        |
| A-MES-2 | Patricia reçoit une notification dans le dashboard.   | P7.5, P7.6         |
| A-MES-3 | Les e-mails sont envoyés ou signalés en échec.        | P7.2, P7.8         |
| A-MES-4 | Les rappels ne sont pas envoyés en double.            | P7.4, P7.7         |
| A-MES-5 | Les notes internes ne sont pas accessibles au client. | P7.6               |

## F. Sécurité (5)

| ID      | Critère                                                             | Couverture roadmap         |
| ------- | ------------------------------------------------------------------- | -------------------------- |
| A-SEC-1 | Un visiteur non authentifié ne peut pas accéder au dashboard.       | P1.7, P1.8 + recette P9.11 |
| A-SEC-2 | Un client ne peut pas modifier la réservation d'une autre personne. | P9.1, P9.11                |
| A-SEC-3 | Une photo privée n'est pas accessible publiquement.                 | P4.4, P5.5 + P9.2          |
| A-SEC-4 | Les données envoyées au serveur sont validées.                      | P1.9 + P9.1                |
| A-SEC-5 | Les opérations sensibles sont contrôlées côté serveur.              | P1.8, P9.1                 |

## G. Interface (4)

| ID     | Critère                                                                 | Couverture roadmap        |
| ------ | ----------------------------------------------------------------------- | ------------------------- |
| A-UI-1 | Le parcours complet fonctionne sur mobile.                              | P2.5, P6.3 + P10.5, P11.2 |
| A-UI-2 | Les formulaires indiquent clairement les champs obligatoires.           | P2.7, P2.9, P10.3         |
| A-UI-3 | Les états d'attente, de succès et d'erreur sont visibles.               | P2.7, P6.3                |
| A-UI-4 | Les pages restent utilisables lorsque les images sont lentes à charger. | P10.1, P2.7               |

---

## Périmètre MVP — §19 (figé)

Inclus dans v1 : site public, catalogue administrable multi-photos, règles de compatibilité par prestation, parcours de réservation, envoi de photos pour évaluation, demandes personnalisées, dashboard admin, calendrier + disponibilités, annulations/reprogrammations, notifications e-mail + dashboard, messagerie centralisée, sécurisation des accès, informations légales/RGPD.

Hors v1 initial (§19 / §13), livrées en phase 12 à la demande du client : avis clients, liste d'attente, promotions, galerie de réalisations. Restent hors périmètre : statistiques avancées.

**Principe final (§20) :** aucune réservation confirmée sur créneau indisponible, aucune règle de compatibilité contournée, aucune notification annonçant un statut différent du statut réellement enregistré.

---

## Matrice de couverture (P0.9) — vérification 100 %

| Groupe §17                  | Nb critères | Couverts  | Phase(s) de recette |
| --------------------------- | ----------- | --------- | ------------------- |
| Catalogue                   | 5           | 5/5       | P4.10, P11.3        |
| Compatibilité               | 6           | 6/6       | P5.9, P11.1, P11.3  |
| Réservation                 | 5           | 5/5       | P6.12, P11.1, P11.3 |
| Annulation                  | 6           | 6/6       | P6.12, P11.3        |
| Messagerie et notifications | 5           | 5/5       | P7.9, P11.1, P11.3  |
| Sécurité                    | 5           | 5/5       | P9.11, P11.3        |
| Interface                   | 4           | 4/4       | P10.5, P11.2, P11.3 |
| **Total**                   | **36**      | **36/36** | —                   |

**Couverture : 100 %.** Aucun critère orphelin (chaque ID possède ≥ 1 tâche roadmap), aucune tâche de recette sans critère associé.
