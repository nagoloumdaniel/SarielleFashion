# CAHIER DES CHARGES COMPLET
# Sarielle Fashion

**Version :** 1.0  
**Type de projet :** Application web de présentation, gestion de coiffures et réservation de rendez-vous  
**Entreprise :** Sarielle Fashion  
**Utilisateurs principaux :** Clients et administratrice du salon  
**Langue initiale :** Français, avec possibilité d'ajouter l'anglais ultérieurement  
**Paiement :** Sur place, après la réalisation de la prestation  
**Plateforme cible :** Site web responsive, compatible mobile, tablette et ordinateur

---

## 1. Présentation générale du projet

### 1.1. Contexte

Sarielle Fashion est une entreprise spécialisée dans la coiffure. Elle souhaite disposer de son propre site web professionnel permettant aux visiteurs de découvrir les prestations proposées, de consulter les modèles de coiffures, de vérifier leur compatibilité avec leurs cheveux et de réserver un rendez-vous en ligne.

L'application doit également offrir à la propriétaire un espace d'administration complet lui permettant de gérer les coiffures, les photos, les tarifs, les disponibilités, les rendez-vous, les demandes de renseignements et les messages des clients.

L'objectif est de centraliser l'ensemble de l'activité du salon sur une seule plateforme.

### 1.2. Objectifs principaux

- Présenter les prestations de manière professionnelle et attractive.
- Permettre aux clients de réserver un rendez-vous en quelques étapes.
- Vérifier la compatibilité entre une coiffure et les caractéristiques capillaires du client.
- Permettre l'envoi de photos pour les cas nécessitant une vérification manuelle.
- Donner à l'administratrice un contrôle total sur les prestations et leurs caractéristiques.
- Envoyer automatiquement des notifications par e-mail et dans le dashboard.
- Gérer les disponibilités, les annulations et les rendez-vous depuis un calendrier.
- Éviter les doubles réservations et les demandes incompatibles avec les prestations proposées.
- Faciliter l'évolution du catalogue sans intervention technique.

### 1.3. Principes fondamentaux

1. L'administratrice décide des coiffures proposées, de leurs prix et de leurs règles de compatibilité.
2. Les règles capillaires ne doivent pas être codées en dur dans l'application : elles doivent être configurables depuis le dashboard.
3. Les clients ne paient pas en ligne.
4. Toute nouvelle réservation, annulation ou modification importante doit être communiquée aux personnes concernées.
5. Les clients doivent pouvoir demander une coiffure qui n'existe pas encore dans le catalogue.
6. Une photo peut être utilisée pour demander un avis sur la faisabilité d'une coiffure.
7. Une réservation ne devient définitive que lorsque les conditions de disponibilité et, si nécessaire, de validation manuelle sont remplies.

---

## 2. Identité visuelle et direction artistique

### 2.1. Positionnement visuel

L'identité de Sarielle Fashion doit évoquer la beauté, la féminité, la confiance, le soin et le professionnalisme.

Le design doit être moderne, élégant et chaleureux, avec une présentation visuelle forte des coiffures. Le site ne doit pas ressembler à un simple formulaire de réservation ni à un template générique.

### 2.2. Palette de couleurs

| Rôle | Couleur | Code |
|---|---|---|
| Couleur d'accentuation principale | Jaune doré | `#F4C542` |
| Couleur principale du texte | Noir profond | `#191919` |
| Couleur secondaire | Crème chaud | `#FFF8E9` |
| Couleur tertiaire | Brun cacao | `#76513D` |
| Fond secondaire | Blanc cassé | `#FFFFFF` |
| Confirmation | Vert doux | `#27845B` |
| Alerte | Rouge sobre | `#C94B4B` |

Le jaune doré doit être utilisé pour les boutons principaux, les éléments actifs, les détails de marque et certains éléments de mise en évidence.

Le noir profond structure l'interface. Le crème apporte de la douceur et le brun cacao rappelle l'univers de la beauté et des cheveux.

Les combinaisons de couleurs doivent conserver un contraste suffisant pour la lisibilité, notamment pour les boutons jaunes contenant du texte.

### 2.3. Typographie

**Titres : Playfair Display**

Utilisée pour les titres éditoriaux, les accroches et certaines mises en valeur du nom de la marque. Elle apporte une dimension élégante et premium.

**Textes et interface : Manrope**

Utilisée pour les paragraphes, les boutons, les formulaires, le catalogue et le dashboard. Elle offre une excellente lisibilité sur les écrans de toutes tailles.

Les polices doivent être chargées de manière optimisée, avec des variantes limitées aux graisses nécessaires.

### 2.4. Principes UI/UX

- Design mobile-first.
- Navigation simple et cohérente.
- Photos de coiffures mises en valeur.
- Cartes élégantes avec angles légèrement arrondis.
- Espacements généreux et hiérarchie visuelle claire.
- Animations discrètes et fluides.
- Boutons et champs accessibles au clavier.
- États visuels explicites : chargement, succès, erreur, indisponibilité et validation en attente.
- Dashboard professionnel, distinct du site public, mais reprenant la même identité.
- Aucun défilement horizontal involontaire.
- Les formulaires doivent conserver les informations saisies lorsqu'une validation échoue.

---

## 3. Architecture fonctionnelle générale

L'application comprend deux espaces principaux.

### 3.1. Site public

Accessible sans compte pour découvrir les prestations :

- Page d'accueil.
- Catalogue des coiffures.
- Fiches détaillées des coiffures.
- Présentation du salon.
- Formulaire de réservation.
- Demande de coiffure personnalisée.
- Formulaire de contact.
- FAQ.
- Informations pratiques et politique d'annulation.
- Pages légales et politique de confidentialité.

### 3.2. Dashboard administrateur

Accessible uniquement après authentification :

- Tableau de bord.
- Gestion du catalogue.
- Gestion des catégories.
- Gestion des règles capillaires.
- Gestion des réservations.
- Calendrier.
- Gestion des disponibilités.
- Gestion des messages.
- Demandes de coiffures personnalisées.
- Demandes de validation par photo.
- Gestion des clients.
- Paramètres du salon.
- Notifications.
- Statistiques.
- Historique des actions.

L'architecture doit permettre l'ajout ultérieur d'autres fonctionnalités sans devoir reconstruire les modules existants.

---

## 4. Fonctionnalités du site public

### 4.1. Page d'accueil

La page d'accueil doit présenter immédiatement l'identité de Sarielle Fashion.

Elle comprend :

- Un en-tête avec le logo et la navigation.
- Une grande section visuelle avec une photo de coiffure représentative.
- Une accroche présentant l'activité du salon.
- Un bouton « Réserver un rendez-vous ».
- Un bouton « Découvrir les coiffures ».
- Une sélection des coiffures populaires.
- Une présentation des prestations principales.
- Une section expliquant comment prendre rendez-vous.
- Une section de présentation de Sarielle.
- Des témoignages clients, si cette fonctionnalité est activée.
- Les coordonnées et informations pratiques.
- Un pied de page avec les liens légaux et les réseaux sociaux.

Les photos, textes, liens sociaux et contenus principaux doivent pouvoir être modifiés depuis le dashboard, lorsque cela est pertinent.

### 4.2. Catalogue de coiffures

Le catalogue doit être entièrement administrable.

Chaque coiffure est présentée sous forme de carte contenant :

- Une photo de couverture.
- Le nom de la coiffure.
- Le prix ou le prix de départ.
- Une courte description.
- La durée estimée, si elle est renseignée.
- Les catégories auxquelles elle appartient.
- Un bouton « Voir les détails ».
- Un bouton « Réserver ».

Le catalogue doit proposer une recherche et des filtres.

Filtres possibles :

- Tresses.
- Vanilles.
- Coiffures avec locs.
- Départ de locs.
- Coiffures protectrices.
- Coupes.
- Autres catégories définies par l'administratrice.

Les catégories ne doivent pas être limitées à une liste immuable : l'administratrice doit pouvoir en créer, modifier et désactiver.

### 4.3. Fiche détaillée d'une coiffure

Chaque coiffure dispose de sa propre fiche.

Elle présente :

- Le nom.
- Une galerie de plusieurs photos.
- Une image principale.
- Une description détaillée.
- Le prix ou la fourchette de prix.
- La durée estimée.
- Les longueurs de cheveux acceptées.
- Les types de cheveux ou situations capillaires compatibles.
- Les exigences concernant les locs.
- Les restrictions éventuelles.
- Les options disponibles.
- Les informations utiles avant le rendez-vous.
- Un bouton de réservation.

La galerie doit permettre de parcourir plusieurs photos sans quitter la page.

L'administratrice peut définir l'ordre des photos, l'image de couverture et les descriptions alternatives pour l'accessibilité.

### 4.4. Gestion des prix

Une coiffure peut avoir :

- Un prix fixe.
- Un prix de départ.
- Une fourchette de prix.
- Des options payantes définies par l'administratrice.
- Une mention « Prix à confirmer », si une évaluation manuelle est nécessaire.

Les prix doivent être affichés clairement avant la confirmation du rendez-vous, sauf lorsqu'une évaluation préalable est indispensable.

Si le tarif dépend de la longueur, de l'épaisseur ou d'une option, ces critères peuvent être configurés par prestation.

Le paiement reste intégralement effectué sur place. Aucun module de paiement en ligne ne doit être intégré dans la première version.

---

## 5. Système intelligent de compatibilité capillaire

Cette fonctionnalité constitue l'un des éléments centraux du projet.

### 5.1. Informations demandées au client

Lorsqu'un client sélectionne une coiffure, l'application lui pose les questions nécessaires à l'évaluation de sa compatibilité.

Champs possibles :

- Longueur des cheveux : courts, mi-longs, longs ou très longs.
- Présence de locs : oui, non ou incertain.
- État des locs, si pertinent.
- Type de cheveux, si nécessaire pour la prestation.
- État ou longueur de la repousse, si nécessaire.
- Présence d'une coupe très courte ou d'une zone rasée.
- Informations complémentaires.
- Photo des cheveux, facultative ou obligatoire selon les règles de la prestation.

Les questions doivent être conditionnelles : le client ne doit pas remplir des champs inutiles pour la coiffure sélectionnée.

### 5.2. Règles configurables par coiffure

Depuis le dashboard, l'administratrice peut définir :

- Les longueurs acceptées.
- Les longueurs non acceptées.
- Si la prestation nécessite des locs.
- Si la prestation est incompatible avec des locs.
- Les types de cheveux ou situations compatibles.
- Les options autorisées.
- Les conditions particulières.
- Si une photo est facultative, obligatoire ou demandée uniquement en cas de doute.
- Si la réservation peut être confirmée automatiquement ou doit être validée manuellement.
- Le message affiché pour chaque situation.

Ces paramètres doivent être stockés dans la base de données.

### 5.3. Exemple : coiffure incompatible avec les cheveux courts

Supposons que Sarielle configure une coiffure tressée comme incompatible avec les cheveux courts.

Le système applique la logique suivante :

1. Le client sélectionne la coiffure.
2. Il indique que ses cheveux sont courts.
3. Le système vérifie les règles de cette coiffure.
4. Si la coiffure est déclarée impossible avec des cheveux courts, la réservation normale est bloquée.
5. Un message explique la restriction.
6. Le client peut envoyer une photo pour demander une évaluation, si cette possibilité est autorisée pour la prestation.

Message proposé :

« Cette coiffure nécessite une longueur de cheveux suffisante pour permettre sa réalisation. D'après votre réponse, elle pourrait ne pas être adaptée. Vous pouvez envoyer une photo de vos cheveux afin que Sarielle vérifie si la prestation est réalisable. »

Le système ne doit pas affirmer que toutes les coiffures sont impossibles avec des cheveux courts. Chaque restriction dépend de la configuration de la prestation.

### 5.4. Gestion des cas incertains

Si le client ne sait pas déterminer sa longueur de cheveux ou s'il possède des locs, il peut sélectionner « Je ne suis pas sûr(e) ».

L'application lui propose alors :

- D'envoyer une photo.
- D'ajouter un commentaire.
- De transmettre sa demande à Sarielle.

La demande reçoit le statut « En attente d'évaluation ».

L'administratrice peut :

- Accepter la compatibilité.
- Refuser la prestation pour ce client.
- Demander des informations supplémentaires.
- Proposer une autre coiffure.
- Autoriser une réservation sous conditions.

La décision et le message associé sont conservés dans l'historique.

### 5.5. Séparation entre validation et réservation

Une demande d'évaluation ne doit pas être confondue avec une réservation confirmée.

Le système doit distinguer au minimum :

- Demande d'évaluation reçue.
- Évaluation en cours.
- Informations complémentaires demandées.
- Compatibilité acceptée.
- Compatibilité refusée.
- Réservation en attente.
- Réservation confirmée.

L'acceptation d'une photo ne doit pas réserver automatiquement un créneau sans vérification de sa disponibilité.

---

## 6. Gestion des locs et prestations particulières

Le catalogue doit notamment prendre en charge les prestations suivantes, tout en permettant d'en ajouter d'autres.

### 6.1. Départ de locs

Cette prestation peut comporter différentes variantes :

- Départ de locs au peigne simple.
- Départ de locs avec coiffure protectrice.
- Départ de locs sans coiffure protectrice.

Chaque variante peut disposer de son propre tarif, de sa durée, de ses photos et de ses règles de compatibilité.

L'administratrice peut préciser si une longueur minimale est nécessaire, quelles options sont proposées et quelles informations doivent être demandées au client.

### 6.2. Vanilles

Les vanilles disposent de règles spécifiques configurables. Le système doit pouvoir refuser une demande lorsque les caractéristiques renseignées ne correspondent pas aux exigences définies par Sarielle.

### 6.3. Coupes et autres prestations

Les coupes doivent être gérées comme des prestations à part entière.

Elles peuvent avoir des questions différentes de celles des tresses, par exemple le type de coupe souhaité, la longueur actuelle ou la présence de locs.

Les questions doivent donc être configurables par prestation, et pas imposées uniformément à tout le catalogue.

### 6.4. Évolution du catalogue

Sarielle doit pouvoir créer une nouvelle coiffure sans intervention d'un développeur.

La création d'une prestation comprend :

- Le nom.
- La description.
- La catégorie.
- Les photos.
- Le prix.
- La durée.
- Les options.
- Les conditions de réalisation.
- Les règles de compatibilité.
- Les questions à poser au client.
- Le comportement en cas d'incertitude.
- Le statut actif ou inactif.

La nouvelle prestation devient disponible sur le site public lorsqu'elle est publiée.

---

## 7. Réservation en ligne

### 7.1. Parcours de réservation

Le parcours de réservation doit être simple et guidé.

**Étape 1 — Choix de la coiffure**

Le client sélectionne une coiffure dans le catalogue ou choisit une demande personnalisée.

**Étape 2 — Informations capillaires**

Il répond aux questions liées à la prestation : longueur, locs, type de cheveux ou autres critères pertinents.

**Étape 3 — Vérification de compatibilité**

Le système applique les règles configurées.

- Si la prestation est compatible, le parcours continue.
- Si elle est incompatible, la réservation est bloquée et un message explicatif est affiché.
- Si la situation est incertaine, le client peut transmettre une photo pour évaluation.

**Étape 4 — Options et précisions**

Le client sélectionne les options autorisées et ajoute, si nécessaire, un commentaire.

**Étape 5 — Choix d'un créneau**

Seuls les créneaux disponibles sont proposés.

**Étape 6 — Coordonnées**

Le client renseigne son nom, son adresse e-mail et son numéro de téléphone si nécessaire.

**Étape 7 — Récapitulatif**

L'application affiche :

- La prestation.
- Les options.
- Le prix connu ou son statut de confirmation.
- La date et l'heure.
- La durée estimée.
- Les informations communiquées.
- Les conditions d'annulation.
- La mention « Paiement sur place ».

**Étape 8 — Confirmation**

Après validation, la réservation est enregistrée, le créneau est protégé contre les doubles réservations et les notifications sont envoyées.

### 7.2. Réservation avec validation manuelle

Certaines prestations ou situations capillaires peuvent nécessiter l'approbation de Sarielle.

Dans ce cas :

- La demande est enregistrée comme « En attente de confirmation ».
- Le créneau peut être placé en attente pendant une durée configurable, si la politique du salon le permet.
- Sarielle reçoit une notification.
- Elle accepte, refuse ou propose un autre créneau.
- Le client reçoit le résultat par e-mail et sur la plateforme.

Une demande en attente ne doit pas bloquer indéfiniment un créneau.

Le système doit définir une durée maximale d'attente et une règle de libération automatique, sauf si Sarielle a déjà confirmé la réservation.

### 7.3. Protection contre les doubles réservations

Le système doit vérifier la disponibilité au moment de l'enregistrement définitif, et pas uniquement au moment de l'affichage des créneaux.

Si deux clients tentent de réserver simultanément le même créneau, une seule réservation doit pouvoir être confirmée.

Les conflits doivent être traités côté serveur et dans la base de données.

### 7.4. Gestion des informations client

Le formulaire doit demander uniquement les informations nécessaires.

Les champs peuvent comprendre :

- Nom et prénom.
- Adresse e-mail.
- Numéro de téléphone.
- Prestation.
- Informations capillaires.
- Options.
- Commentaire.
- Photo, si nécessaire.

La création d'un compte client permanent ne doit pas être obligatoire pour la première version.

Pour consulter ou annuler une réservation, le client pourra utiliser un lien sécurisé envoyé par e-mail ou un espace client facultatif si celui-ci est ajouté.

---

## 8. Disponibilités et calendrier

### 8.1. Configuration des disponibilités

L'administratrice peut définir :

- Les jours d'ouverture.
- Les horaires de début et de fin.
- Les pauses.
- Les jours de fermeture.
- Les congés.
- Les indisponibilités exceptionnelles.
- Les créneaux supplémentaires.
- Les horaires spécifiques à certaines dates.
- Les durées entre deux prestations, si nécessaire.

Les disponibilités doivent être calculées à partir des horaires configurés, de la durée de chaque prestation et des rendez-vous déjà enregistrés.

### 8.2. Calendrier administrateur

Le dashboard doit comporter un calendrier avec les vues suivantes :

- Jour.
- Semaine.
- Mois.
- Liste chronologique.

Chaque rendez-vous doit afficher les informations essentielles : client, coiffure, heure, statut et durée.

En cliquant sur un rendez-vous, Sarielle peut consulter les détails, modifier le statut, annuler ou reprogrammer le rendez-vous.

Les couleurs peuvent différencier les statuts, sans se reposer uniquement sur la couleur pour communiquer une information.

### 8.3. Gestion des conflits et indisponibilités

L'application doit empêcher :

- La réservation pendant une fermeture.
- La réservation sur un créneau déjà pris.
- Les chevauchements entre deux prestations.
- Les réservations sur des indisponibilités bloquées par Sarielle.

Si un rendez-vous est déplacé, l'ancien créneau est libéré et le nouveau est vérifié avant la modification définitive.

### 8.4. Durée des prestations

La durée estimée est définie par l'administratrice pour chaque coiffure.

Si une prestation comprend des options qui modifient sa durée, le système doit en tenir compte dans le calcul des créneaux.

---

## 9. Gestion des réservations et annulations

### 9.1. Statuts de réservation

Les statuts doivent être gérés de manière cohérente :

- En attente de confirmation.
- Confirmée.
- Reprogrammée.
- Annulée par le client.
- Annulée par l'administratrice.
- Terminée.
- Client absent.

Les transitions de statut doivent être contrôlées côté serveur.

### 9.2. Annulation par l'administratrice

Sarielle peut annuler un rendez-vous depuis le calendrier ou sa fiche détaillée.

Lors de l'annulation :

1. Elle sélectionne ou confirme le motif.
2. Le rendez-vous passe au statut annulé.
3. Le créneau est libéré.
4. Le client reçoit un e-mail.
5. Une notification est créée dans son espace de suivi ou via un lien de réservation sécurisé.
6. L'annulation est enregistrée dans l'historique.

Le message doit préciser la date, l'heure, la prestation et le motif communiqué, si Sarielle choisit d'en fournir un.

### 9.3. Annulation par le client

Le client doit pouvoir annuler sa réservation à l'aide d'un lien sécurisé reçu par e-mail.

Les conditions d'annulation doivent être configurables :

- Délai minimal avant le rendez-vous.
- Annulation autorisée ou non après un certain délai.
- Possibilité de demander un motif.
- Traitement des rendez-vous en attente.

Une annulation autorisée libère le créneau et déclenche une notification à Sarielle.

Si l'annulation intervient hors délai, l'application explique la règle et propose, si nécessaire, de contacter le salon.

### 9.4. Reprogrammation

Une fonctionnalité de reprogrammation doit permettre de déplacer un rendez-vous vers un autre créneau disponible.

La modification doit être validée sans créer de doublon ni perdre l'ancien rendez-vous en cas d'échec.

Le client et Sarielle reçoivent une confirmation du nouvel horaire.

---

## 10. Notifications et messagerie

### 10.1. Notifications par e-mail

L'application doit envoyer des e-mails automatiques pour les événements suivants :

- Nouvelle réservation.
- Demande de réservation en attente.
- Confirmation du rendez-vous.
- Demande d'évaluation capillaire.
- Nouvelle photo reçue.
- Demande de coiffure personnalisée.
- Annulation par le client.
- Annulation par Sarielle.
- Reprogrammation.
- Demande d'informations supplémentaires.
- Acceptation ou refus d'une demande.
- Rappel avant le rendez-vous.

Les modèles d'e-mail doivent être personnalisables dans la mesure du possible.

Chaque message doit contenir les informations utiles à son destinataire.

### 10.2. Notifications à Sarielle

Pour toute nouvelle réservation ou demande importante, Sarielle reçoit :

- Un e-mail à son adresse professionnelle configurée.
- Une notification dans son dashboard.

Les notifications doivent préciser la nature de l'événement et proposer un accès direct à la fiche correspondante.

### 10.3. Notifications aux clients

Le client reçoit un e-mail de confirmation ou d'information selon le statut de sa demande.

Si la réservation est en attente, le message doit clairement indiquer qu'elle n'est pas encore définitive.

### 10.4. Messagerie du dashboard

Le dashboard doit centraliser :

- Les messages du formulaire de contact.
- Les demandes de renseignements.
- Les commentaires associés aux réservations.
- Les demandes de coiffures personnalisées.
- Les échanges concernant la compatibilité capillaire.

Chaque conversation ou demande doit avoir un statut :

- Nouveau.
- En cours.
- En attente de réponse.
- Traité.
- Archivé.

Sarielle peut consulter le message, répondre par e-mail si la fonctionnalité est activée, ajouter une note interne et marquer la demande comme traitée.

Les notes internes ne doivent jamais être envoyées au client.

### 10.5. Rappels automatiques

L'application doit permettre de configurer des rappels, par exemple 24 heures avant le rendez-vous.

Le délai doit être configurable et les rappels doivent être envoyés uniquement pour les rendez-vous encore valides.

Le système doit éviter d'envoyer plusieurs fois le même rappel à cause d'une relance technique.

### 10.6. Fiabilité des e-mails

L'envoi d'un e-mail ne doit pas dépendre directement de la réussite de l'enregistrement de la réservation.

La réservation doit d'abord être enregistrée de manière fiable, puis les notifications doivent être traitées avec un mécanisme de reprise en cas d'échec.

Les échecs d'envoi doivent être visibles dans le dashboard ou les journaux techniques.

---

## 11. Demande de coiffure personnalisée

Le client doit pouvoir demander une coiffure qui n'existe pas dans le catalogue.

### 11.1. Formulaire

Le formulaire comprend :

- Nom et prénom.
- Adresse e-mail.
- Numéro de téléphone, si nécessaire.
- Description de la coiffure souhaitée.
- Une ou plusieurs photos de référence.
- Informations capillaires utiles.
- Longueur des cheveux.
- Présence ou non de locs.
- Date souhaitée, facultative.
- Commentaire complémentaire.

### 11.2. Traitement de la demande

À la soumission :

- La demande est enregistrée.
- Sarielle reçoit une notification dans le dashboard.
- Un e-mail lui est envoyé.
- Le client reçoit un accusé de réception.

Sarielle peut ensuite :

- Accepter la demande.
- Refuser la demande.
- Demander des précisions.
- Proposer une prestation existante.
- Définir un prix estimatif.
- Proposer un créneau de rendez-vous.

Une demande personnalisée ne devient pas automatiquement un rendez-vous confirmé.

### 11.3. Historique

Toutes les décisions doivent être conservées afin que Sarielle puisse retrouver les demandes précédentes et leur état d'avancement.

---

## 12. Dashboard administrateur

### 12.1. Tableau de bord principal

Le tableau de bord affiche :

- Les rendez-vous du jour.
- Les prochains rendez-vous.
- Les réservations en attente.
- Les nouvelles demandes de coiffures personnalisées.
- Les demandes d'évaluation par photo.
- Les messages non lus.
- Les annulations récentes.
- Les prochaines indisponibilités.
- Des indicateurs de fréquentation et d'activité.

Les données doivent être actualisées après chaque action importante.

### 12.2. Gestion du catalogue

Sarielle peut :

- Ajouter une coiffure.
- Modifier une coiffure.
- Supprimer ou archiver une coiffure.
- Ajouter plusieurs photos.
- Réorganiser les photos.
- Modifier le prix.
- Modifier la durée.
- Créer des options.
- Configurer les règles capillaires.
- Publier ou dépublier la prestation.
- Organiser les catégories.

Une prestation déjà utilisée dans des réservations historiques devrait être archivée plutôt que supprimée définitivement.

### 12.3. Gestion des disponibilités

Sarielle peut définir ses horaires habituels, ajouter des exceptions et bloquer des créneaux.

Une modification d'horaires ne doit pas annuler silencieusement les rendez-vous déjà confirmés. En cas de conflit, le dashboard doit l'avertir et lui proposer une action explicite.

### 12.4. Gestion des clients

Le dashboard peut conserver un historique des réservations d'un client, ses coordonnées et les informations nécessaires à la gestion de ses demandes.

Les données doivent être accessibles uniquement aux personnes autorisées.

### 12.5. Paramètres du salon

L'administratrice peut configurer :

- Le nom de l'entreprise.
- Le logo.
- L'adresse e-mail de réception.
- Le numéro de téléphone.
- L'adresse et les informations pratiques.
- Les horaires d'ouverture.
- Les règles d'annulation.
- Les délais de réservation.
- Les délais de rappel.
- Les modèles d'e-mail.
- Les catégories de prestations.
- Les paramètres de confidentialité.

---

## 13. Fonctionnalités supplémentaires recommandées

### 13.1. Rappels et gestion des absences

Le système doit rappeler les rendez-vous et permettre de marquer un client comme absent lorsque cela est justifié.

Ces informations peuvent alimenter des statistiques internes sans automatiquement interdire à un client de réserver.

### 13.2. Liste d'attente

Lorsqu'aucun créneau n'est disponible, le client peut demander à être prévenu si un créneau se libère.

Sarielle peut également gérer manuellement une liste d'attente.

Toute proposition de nouveau créneau doit être confirmée par le client et vérifiée à nouveau au moment de la réservation.

### 13.3. Suggestions de coiffures compatibles

Le catalogue peut proposer des coiffures compatibles avec les informations fournies par le client.

Les suggestions doivent reposer sur les règles définies par Sarielle. Une recommandation automatique ne doit jamais contourner une restriction.

### 13.4. Avis clients

Une fois le rendez-vous terminé, un e-mail peut inviter le client à laisser un avis.

Les avis peuvent être affichés sur le site après modération.

Seuls les avis vérifiés ou correctement encadrés doivent être présentés comme provenant de clients ayant utilisé le service.

### 13.5. Gestion des promotions

Sarielle peut créer des offres temporaires ou des réductions affichées dans le catalogue.

Les conditions, dates de validité et prestations concernées doivent être configurables.

### 13.6. Galerie de réalisations

Une galerie publique permet de mettre en valeur les réalisations du salon.

Chaque photo doit pouvoir être associée à une catégorie ou à une prestation.

Toute publication identifiable d'un client doit respecter les autorisations nécessaires.

### 13.7. Statistiques

Les indicateurs peuvent inclure :

- Nombre de réservations.
- Nombre d'annulations.
- Nombre de prestations terminées.
- Répartition des prestations les plus demandées.
- Taux de remplissage du calendrier.
- Demandes personnalisées reçues.
- Réservations en attente.
- Revenus estimés à partir des prestations terminées et des prix enregistrés.

Ces indicateurs doivent être calculés selon des définitions claires. Les revenus affichés constituent des estimations tant que les paiements sur place ne sont pas enregistrés ou vérifiés.

---

## 14. Architecture technique recommandée

L'application doit être conçue pour rester maintenable, sécurisée et évolutive.

### 14.1. Stack proposée

- **Frontend :** Next.js avec TypeScript.
- **Interface :** Tailwind CSS et composants personnalisés.
- **Backend :** API serveur Next.js, avec séparation claire des modules métier.
- **Base de données :** PostgreSQL.
- **ORM :** Prisma ou Drizzle.
- **Authentification :** solution éprouvée compatible avec le framework retenu.
- **Stockage des photos :** stockage objet compatible S3 ou service équivalent.
- **E-mails :** Resend, Brevo ou un fournisseur transactionnel équivalent.
- **Tâches planifiées :** service de tâches différées pour les rappels et les traitements asynchrones.
- **Hébergement :** plateforme compatible avec Next.js et PostgreSQL.
- **Suivi des erreurs :** service de monitoring applicatif.

Le choix final doit privilégier la fiabilité, la facilité de maintenance et le coût raisonnable. Les clés secrètes doivent rester côté serveur.

### 14.2. Organisation logique

L'application doit séparer les responsabilités suivantes :

- Catalogue et catégories.
- Règles de compatibilité.
- Disponibilités.
- Réservations.
- Clients.
- Demandes personnalisées.
- Messagerie.
- Notifications.
- Gestion des fichiers.
- Authentification et autorisations.
- Paramètres.
- Statistiques et journalisation.

Cette séparation facilite l'évolution de l'application et les tests.

### 14.3. Modèle de données initial

Les principales entités sont :

**User**
- Identifiant.
- Nom.
- E-mail.
- Mot de passe chiffré ou référence au fournisseur d'authentification.
- Rôle.
- Date de création.

**Service**
- Identifiant.
- Nom.
- Description.
- Catégorie.
- Prix ou fourchette de prix.
- Durée.
- Statut de publication.
- Paramètres de compatibilité.
- Options et règles de réservation.

**ServiceImage**
- Identifiant.
- Identifiant de la prestation.
- URL du fichier.
- Texte alternatif.
- Ordre d'affichage.
- Indicateur d'image principale.

**Category**
- Identifiant.
- Nom.
- Description.
- Ordre.
- Statut.

**AvailabilityRule**
- Identifiant.
- Jour de la semaine ou date concernée.
- Heure de début.
- Heure de fin.
- Type de règle.
- Statut.

**BlockedPeriod**
- Identifiant.
- Début.
- Fin.
- Motif.
- Créateur.

**Customer**
- Identifiant.
- Nom.
- E-mail.
- Téléphone.
- Dates de création et de mise à jour.

**Appointment**
- Identifiant.
- Client.
- Prestation.
- Date et heure de début.
- Date et heure de fin.
- Statut.
- Prix prévu.
- Options sélectionnées.
- Informations capillaires.
- Commentaires utiles.
- Dates de création et de mise à jour.

**CustomRequest**
- Identifiant.
- Client ou coordonnées du demandeur.
- Description.
- Photos de référence.
- Statut.
- Réponse de Sarielle.
- Prix estimatif éventuel.
- Dates de suivi.

**HairAssessment**
- Identifiant.
- Demande ou réservation associée.
- Informations capillaires.
- Photos.
- Statut de l'évaluation.
- Décision de l'administratrice.
- Motif ou commentaire.
- Dates de suivi.

**Conversation**
- Identifiant.
- Client.
- Sujet.
- Statut.
- Date de création.

**Message**
- Identifiant.
- Conversation.
- Auteur.
- Contenu.
- Type de message.
- Date d'envoi.
- Statut de lecture.

**Notification**
- Identifiant.
- Destinataire.
- Type d'événement.
- Contenu ou référence au modèle.
- Canal.
- Statut d'envoi.
- Date de création.

**AuditLog**
- Identifiant.
- Utilisateur à l'origine de l'action.
- Type d'action.
- Entité concernée.
- Date.
- Métadonnées limitées au nécessaire.

Les modèles devront être affinés pendant la conception afin de gérer les contraintes, les suppressions logiques, les historiques et les relations entre entités.

### 14.4. Règles techniques essentielles

- Les tarifs et durées utilisés pour une réservation doivent être conservés comme instantanés afin qu'une modification ultérieure du catalogue ne modifie pas l'historique.
- Les dates doivent être stockées de manière cohérente, avec un fuseau horaire explicite pour le salon.
- Les créneaux doivent être protégés contre les conflits de réservation.
- Les notifications doivent être idempotentes pour éviter les doublons.
- Les actions importantes doivent être journalisées.
- Les règles de compatibilité doivent être vérifiées côté serveur.
- Les fichiers doivent être stockés séparément de la base de données.
- Les photos et documents privés doivent utiliser des accès contrôlés.
- Les données doivent pouvoir être sauvegardées et restaurées.

---

## 15. Sécurité, confidentialité et conformité

L'application doit respecter les principes de sécurité et de protection des données applicables en France et dans l'Union européenne.

### 15.1. Authentification et autorisations

- Seules les personnes autorisées peuvent accéder au dashboard.
- Les opérations d'administration doivent être protégées côté serveur.
- Les rôles doivent être vérifiés sur chaque opération sensible.
- Les sessions doivent être sécurisées.
- Les fonctions de récupération de compte doivent être protégées contre les abus.
- Les mots de passe ne doivent jamais être stockés en clair.

### 15.2. Protection des photos

Les photos peuvent contenir des informations personnelles. L'application doit donc :

- Limiter les formats autorisés.
- Vérifier la taille des fichiers.
- Contrôler les fichiers côté serveur.
- Générer des noms de fichiers non prévisibles.
- Éviter de publier les photos d'évaluation dans la galerie publique.
- Restreindre l'accès aux seules personnes habilitées.
- Définir une politique de conservation et de suppression.

### 15.3. RGPD

Le site doit notamment prévoir :

- Une politique de confidentialité.
- Des informations claires sur l'utilisation des données.
- Une durée de conservation définie.
- Des moyens de contacter l'entreprise pour exercer les droits applicables.
- Une gestion appropriée des demandes de suppression ou de rectification.
- Une configuration conforme des cookies et traceurs éventuels.
- Des contrats adaptés avec les prestataires techniques.

Les données capillaires et les photos ne doivent être collectées que dans la mesure nécessaire à la prestation. Il ne faut pas en déduire ni enregistrer de données sensibles inutiles.

### 15.4. Sauvegardes et disponibilité

- Sauvegardes régulières de la base de données.
- Procédure documentée de restauration.
- Surveillance des erreurs.
- Gestion des erreurs d'envoi d'e-mails.
- Limitation des tentatives abusives.
- Protection des formulaires contre le spam.
- Mise à jour régulière des dépendances.

---

## 16. Exigences non fonctionnelles

### Performance
- Chargement rapide des pages.
- Images optimisées et adaptées à la taille de l'écran.
- Pagination ou chargement progressif lorsque le catalogue devient important.
- Évitement des requêtes inutiles.

### Accessibilité
- Contrastes lisibles.
- Formulaires avec libellés explicites.
- Navigation au clavier.
- Textes alternatifs pour les images.
- Messages d'erreur compréhensibles.
- Utilisation de statuts textuels en complément des couleurs.

### Compatibilité
- Chrome, Safari, Firefox et Edge récents.
- Téléphones Android et iPhone.
- Tablettes et ordinateurs.
- Affichage responsive sur toutes les pages principales.

### Maintenabilité
- TypeScript strict.
- Code modulaire.
- Validation des données.
- Gestion centralisée des erreurs.
- Tests automatisés.
- Documentation des variables d'environnement.
- Environnements distincts de développement et de production.

---

## 17. Tests et critères d'acceptation

L'application ne sera considérée comme prête que lorsque les scénarios suivants auront été vérifiés.

### Catalogue
- Sarielle peut créer une nouvelle coiffure.
- Elle peut ajouter plusieurs photos.
- Elle peut modifier le tarif et la durée.
- Elle peut configurer les règles de compatibilité.
- La nouvelle coiffure apparaît sur le site après publication.

### Compatibilité
- Une coiffure incompatible avec les cheveux courts est correctement bloquée.
- Le message explicatif configuré est affiché.
- Le client peut demander une évaluation par photo lorsque cette option est activée.
- La demande arrive dans le dashboard.
- Sarielle peut accepter ou refuser la demande.
- Une décision ne crée pas de réservation sans contrôle du créneau.

### Réservation
- Le client peut choisir une prestation et un créneau disponible.
- Les créneaux fermés ou déjà occupés sont refusés.
- Deux clients ne peuvent pas obtenir le même créneau exclusif.
- Une réservation confirmée est visible dans le calendrier.
- Le client reçoit l'e-mail correspondant au statut réel.

### Annulation
- Sarielle peut annuler une réservation.
- Le client reçoit une notification d'annulation.
- Le créneau est libéré.
- Le client peut annuler à l'aide d'un lien sécurisé dans les conditions autorisées.
- L'administratrice reçoit la notification correspondante.
- Les rendez-vous historiques restent consultables.

### Messagerie et notifications
- Un message de contact est enregistré.
- Sarielle reçoit une notification dans le dashboard.
- Les e-mails sont envoyés ou signalés en échec.
- Les rappels ne sont pas envoyés en double.
- Les notes internes ne sont pas accessibles au client.

### Sécurité
- Un visiteur non authentifié ne peut pas accéder au dashboard.
- Un client ne peut pas modifier la réservation d'une autre personne.
- Une photo privée n'est pas accessible publiquement.
- Les données envoyées au serveur sont validées.
- Les opérations sensibles sont contrôlées côté serveur.

### Interface
- Le parcours complet fonctionne sur mobile.
- Les formulaires indiquent clairement les champs obligatoires.
- Les états d'attente, de succès et d'erreur sont visibles.
- Les pages restent utilisables lorsque les images sont lentes à charger.

---

## 18. Phasage du développement

### Phase 1 — Fondations
- Mise en place du projet.
- Design system.
- Base de données.
- Authentification administrateur.
- Configuration de l'environnement.

### Phase 2 — Site public et catalogue
- Page d'accueil.
- Catalogue.
- Fiches de coiffures.
- Galerie de photos.
- Catégories.
- Gestion du catalogue depuis le dashboard.

### Phase 3 — Compatibilité capillaire
- Configuration des règles par prestation.
- Questions conditionnelles.
- Gestion des cheveux courts, longs et des locs.
- Téléversement de photos.
- Évaluation manuelle.

### Phase 4 — Réservations
- Disponibilités.
- Calcul des créneaux.
- Création des rendez-vous.
- Calendrier.
- Prévention des conflits.
- Annulations et reprogrammations.

### Phase 5 — Notifications et messagerie
- Notifications du dashboard.
- E-mails transactionnels.
- Demandes personnalisées.
- Rappels automatiques.
- Gestion des échecs d'envoi.

### Phase 6 — Finitions et fonctionnalités complémentaires
- Statistiques.
- Galerie de réalisations.
- Avis clients.
- Liste d'attente.
- Optimisations UX.

### Phase 7 — Tests et mise en production
- Tests fonctionnels.
- Tests de sécurité.
- Tests responsive.
- Vérification des e-mails.
- Sauvegardes.
- Configuration du domaine et du déploiement.
- Documentation et transfert à Sarielle.

---

## 19. Périmètre de la première version

La première version doit prioritairement inclure :

1. Un site public professionnel.
2. Un catalogue administrable avec plusieurs photos par coiffure.
3. Des règles de compatibilité configurables par prestation.
4. Un parcours de réservation.
5. L'envoi de photos pour évaluation.
6. La gestion des demandes de coiffures personnalisées.
7. Un dashboard administrateur.
8. Un calendrier et la gestion des disponibilités.
9. Les annulations et reprogrammations.
10. Les notifications par e-mail et dans le dashboard.
11. Une messagerie centralisée.
12. La sécurisation des accès et des données.
13. Les informations légales et la politique de confidentialité.

Les avis clients, la liste d'attente, les promotions et les statistiques plus avancées pourront être intégrés après validation du fonctionnement principal.

---

## 20. Résultat attendu

À la livraison, Sarielle Fashion doit disposer d'une application web complète permettant aux clients de découvrir les coiffures, de comprendre les conditions de réalisation, de demander une évaluation si nécessaire et de réserver un rendez-vous.

Sarielle doit pouvoir administrer elle-même son activité : ajouter des coiffures, publier des photos, définir les prix et les durées, préciser les caractéristiques capillaires acceptées, gérer les disponibilités, traiter les demandes et recevoir les notifications.

Le système doit être suffisamment flexible pour accueillir de nouvelles prestations sans modification du code métier.

L'expérience doit rester simple pour les clients, efficace pour Sarielle et fiable sur le plan technique.

**Principe final :** aucune réservation ne doit être confirmée sur un créneau indisponible, aucune règle de compatibilité ne doit être contournée et aucune notification ne doit annoncer un statut différent de celui réellement enregistré dans le système.