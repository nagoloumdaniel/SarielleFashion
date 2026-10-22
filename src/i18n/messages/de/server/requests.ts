/* Messages serveur fr -> de : demande personnalisée et téléversement de photos privées. */
export const requests: Record<string, string> = {
  'Une erreur est survenue. Réessayez.': 'Es ist ein Fehler aufgetreten. Versuch es noch einmal.',
  'Une erreur est survenue. Réessayez plus tard.':
    'Es ist ein Fehler aufgetreten. Versuch es später noch einmal.',
  'Trop de demandes envoyées. Réessayez dans un moment.':
    'Zu viele Anfragen gesendet. Versuch es in einem Moment erneut.',
  'Vérifiez les champs du formulaire.': 'Bitte prüfe die Felder des Formulars.',
  'Votre demande a bien été envoyée.': 'Deine Anfrage wurde erfolgreich gesendet.',
  'Votre demande a bien été envoyée. Sarielle vous répondra personnellement.':
    'Deine Anfrage wurde erfolgreich gesendet. Sarielle antwortet dir persönlich.',
  'Votre accord est nécessaire pour traiter la demande.':
    'Wir brauchen deine Zustimmung, um die Anfrage zu bearbeiten.',
  // Validation du schéma
  'Nom requis (2 caractères minimum).': 'Name erforderlich (mindestens 2 Zeichen).',
  'E-mail invalide.': 'Ungültige E-Mail-Adresse.',
  'Téléphone invalide.': 'Ungültige Telefonnummer.',
  'Téléphone invalide (chiffres, espaces et + uniquement).':
    'Ungültige Telefonnummer (nur Ziffern, Leerzeichen und +).',
  'Décrivez votre demande en 20 caractères minimum.':
    'Beschreib deine Anfrage mit mindestens 20 Zeichen.',
  'Description trop longue (3000 caractères maximum).':
    'Die Beschreibung ist zu lang (maximal 3000 Zeichen).',
  'Précisez votre type de cheveux.': 'Bitte gib deinen Haartyp an.',
  'Date souhaitée invalide.': 'Ungültiges Wunschdatum.',
  'Votre accord est nécessaire.': 'Deine Zustimmung ist erforderlich.',
  // Photos privées (fichiers)
  'Le fichier photo est vide.': 'Die Fotodatei ist leer.',
  'La photo dépasse 5 Mo. Choisissez une image plus légère.':
    'Das Foto ist größer als 5 MB. Wähl ein kleineres Bild.',
  'Format non accepté : utilisez une photo JPEG, PNG ou WebP.':
    'Format nicht akzeptiert: Verwende ein JPEG-, PNG- oder WebP-Foto.',
  "Le contenu du fichier n'est pas une image reconnue.":
    'Der Inhalt der Datei ist kein erkanntes Bild.',
  "Le contenu de l'image ne correspond pas à son format annoncé.":
    'Der Bildinhalt passt nicht zum angegebenen Format.',
  "L'image est illisible ou corrompue.": 'Das Bild ist nicht lesbar oder beschädigt.',
  '{0} photos maximum par demande.': 'Maximal {0} Fotos pro Anfrage.',
  'Stockage photos non configuré : renseignez S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY dans .env.local.':
    'Der Fotospeicher ist derzeit nicht verfügbar. Versuch es später noch einmal.',
};
