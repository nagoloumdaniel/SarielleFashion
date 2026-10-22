/* Messages serveur fr -> de : réservation, annulation par lien (clé = texte français exact). */
export const booking: Record<string, string> = {
  // Génériques
  'Données invalides.': 'Ungültige Angaben.',
  'Une erreur est survenue. Réessayez plus tard.':
    'Es ist ein Fehler aufgetreten. Versuch es später noch einmal.',
  'Trop de demandes. Réessayez dans une minute.':
    'Zu viele Anfragen. Versuch es in einer Minute noch einmal.',
  'Trop de demandes. Réessayez dans quelques minutes.':
    'Zu viele Anfragen. Versuch es in ein paar Minuten noch einmal.',
  'Trop de demandes de réservation. Réessayez dans quelques minutes.':
    'Zu viele Buchungsanfragen. Versuch es in ein paar Minuten noch einmal.',
  'Trop d’essais. Réessayez dans quelques minutes.':
    'Zu viele Versuche. Versuch es in ein paar Minuten noch einmal.',
  'Demande refusée.': 'Anfrage abgelehnt.',
  'Informations capillaires illisibles.': 'Die Haarinfos sind nicht lesbar.',
  'Informations capillaires invalides.': 'Die Haarinfos sind ungültig.',
  'Créneau invalide.': 'Ungültiges Zeitfenster.',

  // Schémas Zod (réservation)
  'Fuseau horaire invalide.': 'Ungültige Zeitzone.',
  'Date invalide.': 'Ungültiges Datum.',
  'Indiquez votre nom.': 'Bitte gib deinen Namen an.',
  'Le nom est trop long.': 'Der Name ist zu lang.',
  'Adresse e-mail invalide.': 'Ungültige E-Mail-Adresse.',
  'Numéro de téléphone trop court.': 'Die Telefonnummer ist zu kurz.',
  'Numéro de téléphone trop long.': 'Die Telefonnummer ist zu lang.',
  'Numéro de téléphone invalide.': 'Ungültige Telefonnummer.',
  'Le commentaire est limité à 1000 caractères.': 'Der Kommentar ist auf 1000 Zeichen begrenzt.',
  'Vous devez accepter les conditions de réservation.':
    'Du musst die Buchungsbedingungen akzeptieren.',
  'L’adresse est limitée à 300 caractères.': 'Die Adresse ist auf 300 Zeichen begrenzt.',
  'Indiquez votre adresse ou votre quartier pour la coiffure à domicile.':
    'Gib deine Adresse oder deinen Stadtteil für den Hausbesuch an.',
  'Prestation manquante.': 'Leistung fehlt.',
  'Code promo invalide.': 'Ungültiger Gutscheincode.',
  'Saisissez un code promo.': 'Gib einen Gutscheincode ein.',
  'Ce code promo n’est pas valide.': 'Dieser Gutscheincode ist nicht gültig.',
  'Lien d’annulation invalide.': 'Ungültiger Stornierungslink.',
  'Le motif est limité à 500 caractères.': 'Der Grund ist auf 500 Zeichen begrenzt.',

  // Services
  'Cette prestation n’est plus disponible.': 'Diese Leistung ist nicht mehr verfügbar.',
  'Une option sélectionnée n’est plus disponible.':
    'Eine ausgewählte Option ist nicht mehr verfügbar.',
  'La durée de cette prestation n’est pas renseignée. Contactez Sarielle.':
    'Die Dauer dieser Leistung ist nicht hinterlegt. Bitte kontaktiere Sarielle.',
  'La durée de cette prestation n’est pas renseignée.':
    'Die Dauer dieser Leistung ist nicht hinterlegt.',
  'La coiffure à domicile n’est plus proposée. Retirez cette option pour continuer.':
    'Der Hausbesuch wird nicht mehr angeboten. Entferne diese Option, um fortzufahren.',
  'Une photo de vos cheveux doit être évaluée avant de réserver cette prestation.':
    'Ein Foto deiner Haare muss vor der Buchung dieser Leistung begutachtet werden.',
  'Ce créneau n’est plus disponible. Choisissez un autre horaire.':
    'Dieses Zeitfenster ist nicht mehr verfügbar. Wähle eine andere Uhrzeit.',
  'Rendez-vous introuvable.': 'Termin nicht gefunden.',
  'Ce lien d’annulation est invalide ou expiré.':
    'Dieser Stornierungslink ist ungültig oder abgelaufen.',
  'Ce lien d’annulation a expiré.': 'Dieser Stornierungslink ist abgelaufen.',
  'Merci d’indiquer un motif d’annulation.': 'Bitte gib einen Grund für die Stornierung an.',
  'Votre rendez-vous a bien été annulé. Le créneau est libéré.':
    'Dein Termin wurde storniert. Das Zeitfenster ist wieder frei.',
  'Ce rendez-vous ne peut plus être reprogrammé.':
    'Dieser Termin kann nicht mehr verschoben werden.',
  'Ce rendez-vous vient d’être modifié. Rechargez la page puis réessayez.':
    'Dieser Termin wurde gerade geändert. Lade die Seite neu und versuch es noch einmal.',

  // Politique d'annulation ({0} = délai, traduit automatiquement)
  'Ce rendez-vous est déjà passé. Contacte Sarielle si tu as besoin d’aide.':
    'Dieser Termin liegt bereits in der Vergangenheit. Melde dich bei Sarielle, wenn du Hilfe brauchst.',
  'L’annulation en ligne est fermée à moins de {0} du rendez-vous. Contacte Sarielle directement.':
    'Die Online-Stornierung ist weniger als {0} vor dem Termin geschlossen. Melde dich direkt bei Sarielle.',

  // Transition de statut ({0} = libellé de statut, traduit ci-dessous)
  'Cette action est impossible depuis le statut « {0} ».':
    'Diese Aktion ist im Status „{0}“ nicht möglich.',
  'En attente de confirmation': 'Wartet auf Bestätigung',
  Confirmée: 'Bestätigt',
  Reprogrammée: 'Verschoben',
  'Annulée par la cliente': 'Von der Kundin storniert',
  'Annulée par Sarielle': 'Von Sarielle storniert',
  Terminée: 'Abgeschlossen',
  'Cliente absente': 'Kundin nicht erschienen',
};
