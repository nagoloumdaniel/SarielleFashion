# Guide d'administration — Sarielle Fashion

Guide pratique pour utiliser le tableau de bord, sans connaissances techniques. Pour toute question technique (panne, modification de code), contacter le développeur.

## Se connecter

Aller sur `/connexion`, saisir l'e-mail et le mot de passe administrateur. En cas d'oubli du mot de passe, le développeur doit le réinitialiser directement en base (aucune récupération automatique par e-mail en v1).

## Tableau de bord (page d'accueil du dashboard)

Vue d'ensemble : rendez-vous du jour, prochains rendez-vous, demandes en attente, nouvelles demandes personnalisées, évaluations photo à traiter, messages non lus, annulations récentes.

## Catalogue des coiffures

1. **Catégories** (Coiffure femme, Coiffure homme, Coiffure enfant, Make-up, Pose de lace, Cils, Événements) : créer, modifier, réordonner. Une catégorie ne peut être supprimée que si elle est vide.
2. **Coiffures** : créer une fiche (nom, description, catégorie, prix ou fourchette de prix, durée, options payantes). Statuts :
   - **Brouillon** : non visible sur le site public.
   - **Publiée** : visible et réservable.
   - **Archivée** : masquée mais conservée (jamais supprimée si elle a un historique de réservations).
3. **Photos** : ajouter plusieurs photos par coiffure, choisir la photo principale, réordonner, renseigner un texte alternatif (accessibilité).
4. **Règles de compatibilité** : pour chaque coiffure, définir les longueurs de cheveux acceptées, si les locs sont requises ou incompatibles, si une photo est obligatoire/facultative/absente, et les messages affichés au client selon le cas (compatible, incompatible, incertain).
5. **Questions capillaires** : configurer les questions posées au client avant réservation (longueur, état des locs, etc.), avec ordre et conditions d'affichage.

## Évaluations photo

File d'attente des demandes "Je ne suis pas sûr(e)" envoyées par les clientes avec une photo. Pour chacune : visualiser la photo, puis choisir une décision — accepter, refuser, demander des informations complémentaires, proposer une autre coiffure, ou autoriser sous conditions — et rédiger le message transmis à la cliente. **Accepter une évaluation ne réserve jamais automatiquement un créneau** : la cliente doit ensuite choisir elle-même un horaire disponible.

## Calendrier et disponibilités

- **Calendrier** : vues jour / semaine / mois / liste. Chaque rendez-vous est coloré selon son statut (en attente, confirmé, reprogrammé, annulé, terminé, absent). Cliquer sur un rendez-vous pour voir le détail, l'annuler ou le reprogrammer.
- **Disponibilités** : définir les horaires habituels (ex. lundi-samedi 9h-18h), ajouter des congés ou blocages ponctuels. Si une modification impacte des rendez-vous déjà confirmés, une alerte apparaît et demande une confirmation explicite avant d'appliquer le changement.

## Réservations

Liste de toutes les réservations avec recherche et filtres par statut. Actions possibles : confirmer, annuler (avec motif), reprogrammer, marquer une cliente absente. Le prix et la durée affichés sur une réservation existante restent figés même si le prix du catalogue change ensuite.

## Demandes personnalisées

Demandes de coiffures sur mesure (hors catalogue standard). Pour chacune : accepter, refuser, demander des précisions, proposer une prestation existante avec un prix estimatif, ou proposer un créneau. L'historique des décisions reste visible.

## Messagerie

Boîte de réception centralisée : messages de contact, demandes de renseignements, commentaires liés à un rendez-vous, demandes personnalisées, demandes de compatibilité. Statuts : nouveau, en cours, en attente de réponse, traité, archivé. Possibilité de répondre directement par e-mail et d'ajouter des notes internes **invisibles pour la cliente**.

## Clients

Fiche par cliente : coordonnées et historique complet de ses réservations.

## Statistiques

Nombre de réservations, annulations, rendez-vous terminés, prestations les plus demandées, demandes personnalisées, revenu estimé et ticket moyen. Chaque indicateur affiche sa définition au survol.

## Paramètres du salon

Identité du salon, e-mail de contact, adresse, horaires affichés publiquement, règles d'annulation (délai minimal en minutes, 30 par défaut ; motif obligatoire), coiffure à domicile (frais de déplacement fixes, annoncés « à partir de X € »), délai de réservation et de rappel automatique. Le paiement se fait toujours sur place (espèces ou virement).

## Notifications

La cliente reçoit un e-mail à chaque étape importante (réservation, confirmation, annulation, reprogrammation, rappel 24h avant). Sarielle reçoit une notification dans le dashboard (avec lien direct) et par e-mail pour les nouvelles réservations, demandes et messages. Un envoi en échec reste visible dans le dashboard — il ne bloque jamais l'enregistrement de la réservation elle-même.

## Hors version 1 (pas encore disponibles)

Liste d'attente sur créneau complet, avis clients, galerie de réalisations publique, promotions. Ces fonctionnalités pourront être ajoutées dans une version ultérieure.
