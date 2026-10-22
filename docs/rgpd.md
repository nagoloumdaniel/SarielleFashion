# Registre des traitements et procédures RGPD

Document opérationnel. Il doit être validé par la responsable du salon avant la mise en production. Les informations d'identité et de contact doivent être complétées avec des données réelles, jamais inventées.

## Responsable du traitement

Sarielle Fashion, salon de coiffure. Contact vie privée : adresse e-mail configurée dans les paramètres du salon (`contactEmail`) ou, à défaut, `ADMIN_EMAIL`. Le nom légal, l'adresse et le numéro d'immatriculation doivent être renseignés dans les mentions légales avant publication.

## Registre des traitements

| Traitement             | Données                                                                              | Finalité                                    | Base légale                             | Conservation                                                                 | Destinataires                      |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| Réservation            | nom, e-mail, téléphone, prestation, créneau, prix, réponses capillaires, commentaire | gérer le rendez-vous, rappels, annulations  | exécution du contrat                    | relation client puis obligations comptables                                  | Sarielle, Neon, Gmail SMTP, Vercel |
| Évaluation capillaire  | réponses capillaires, photos privées, message                                        | vérifier la compatibilité avant réservation | consentement                            | photos purgées après `photoRetentionDays` (90 j par défaut)                  | Sarielle, Cloudflare R2            |
| Demande personnalisée  | coordonnées, description, photos privées, date souhaitée                             | étudier une coiffure hors catalogue         | consentement                            | photos purgées après `photoRetentionDays`, demande conservée puis anonymisée | Sarielle, Cloudflare R2            |
| Messagerie             | coordonnées, contenu des échanges, notes internes                                    | répondre aux demandes                       | intérêt légitime / exécution du contrat | 12 mois après la dernière réponse, puis anonymisation                        | Sarielle                           |
| Notifications          | e-mail, contenu transactionnel, statut d'envoi                                       | informer des changements de rendez-vous     | exécution du contrat / intérêt légitime | journal technique limité, purge des photos séparée                           | Gmail SMTP, Neon                   |
| Comptes administrateur | nom, e-mail, empreinte de mot de passe                                               | sécuriser le dashboard                      | intérêt légitime                        | durée du compte                                                              | Sarielle, Vercel, Neon             |
| Journaux d'audit       | identifiant utilisateur, action, entité                                              | sécurité et traçabilité                     | intérêt légitime                        | durée de conservation de sécurité à valider                                  | Sarielle, Neon                     |
| Thème et session       | cookie de session, préférence de thème                                               | fonctionnement de l'interface               | nécessaire au service                   | session, préférence locale                                                   | navigateur                         |

Purge automatique (cron de rétention) : demandes d'avis restées sans réponse après 12 mois ; notifications internes lues après 6 mois ; e-mails définitivement en échec après 3 mois. Les avis soumis (publiés dès leur envoi, sans modération) ne sont jamais purgés automatiquement : l'admin peut les supprimer, et ils disparaissent avec la fiche d'une cliente effacée. Un avis libre ne conserve que le prénom et l'initiale affichés (aucune adresse e-mail).

Durées paramétrables : `dataRetentionMonths` (36 mois par défaut) et `photoRetentionDays` (90 jours par défaut) dans les paramètres du salon.

## Minimisation

- Aucune donnée capillaire n'est stockée sur la fiche cliente : elle vit sur le rendez-vous ou l'évaluation.
- Les photos privées ne sont jamais publiques : bucket privé, clé aléatoire, URL signée courte.
- Les notes internes ne sont jamais exposées à la cliente.
- L'export RGPD exclut les notes internes.
- Les journaux ne contiennent ni mot de passe, ni jeton, ni contenu de photo.

## Droits des personnes

### Accès et portabilité

Depuis la fiche cliente du dashboard : bouton **Exporter les données (JSON)**. L'API `/api/admin/clients/[id]/export` est réservée à l'administration et répond avec `Cache-Control: no-store`. Le fichier contient les coordonnées, rendez-vous, évaluations (sans contenu binaire), demandes et messages hors notes internes.

### Rectification

Formulaire **Coordonnées** sur la fiche cliente : nom, e-mail et téléphone. Chaque modification est auditée.

### Effacement

Bouton **Anonymiser la fiche** avec confirmation obligatoire. L'action :

- supprime les conversations et leurs messages ;
- supprime les évaluations et demandes personnalisées ;
- supprime les photos privées du stockage objet ;
- anonymise le nom, l'e-mail et le téléphone de la cliente ;
- supprime les données capillaires, commentaires, motifs d'annulation et jetons d'annulation des rendez-vous ;
- conserve les rendez-vous nécessaires aux obligations comptables, rattachés à une fiche anonyme.

Une demande d'effacement ne doit pas supprimer les factures ou justificatifs comptables encore obligatoires. En cas de doute, consulter un professionnel du droit.

### Opposition et retrait du consentement

Le consentement est recueilli sur les formulaires de photos et de demande personnalisée. Il peut être retiré par e-mail ; l'effacement des photos et de la demande suit la procédure ci-dessus.

## Cookies et traceurs

- Cookie de session strictement nécessaire, `HttpOnly`, `SameSite=Lax`, `Secure` en production.
- Préférence de thème stockée dans `localStorage`, pas de traceur publicitaire.
- Aucun outil d'analytics ou de publicité n'est installé.
- Une bannière de consentement n'est donc pas nécessaire dans l'état actuel. Toute ajout d'analytics imposera une revue.

## Sous-traitants et transferts

| Fournisseur   | Rôle                            | Localisation / garanties à vérifier             |
| ------------- | ------------------------------- | ----------------------------------------------- |
| Neon          | base PostgreSQL                 | région du projet, DPA et clauses contractuelles |
| Vercel        | hébergement et crons            | DPA Vercel, région d'exécution                  |
| Gmail SMTP    | envoi d'e-mails transactionnels | DPA Gmail SMTP, sous-traitants e-mail           |
| Cloudflare R2 | stockage privé des photos       | DPA Cloudflare, région du bucket                |

Les contrats de sous-traitance (DPA) doivent être téléchargés, archivés et datés avant la mise en production. Ce dépôt ne contient pas ces contrats signés.

## Violation de données

1. Qualifier la violation : données concernées, personnes, gravité, cause.
2. Contenir : révoquer les secrets, invalider les sessions (`AUTH_SECRET`), couper l'accès concerné.
3. Documenter : horodatage, actions, preuves, décisions.
4. Notifier la CNIL sous 72 heures si le risque est avéré, et les personnes concernées si le risque est élevé.
5. Corriger la cause et ajouter un test de non-régression.

## Points à faire valider avant production

- Identité légale complète et adresse de contact réelles dans les mentions légales et la politique de confidentialité.
- DPA des quatre sous-traitants.
- Durée de conservation des journaux d'audit.
- Procédure de réponse aux demandes et délai de traitement.
- Validation juridique de la politique de confidentialité.
