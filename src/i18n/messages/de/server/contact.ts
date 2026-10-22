/* Messages serveur fr -> de : formulaire de contact. */
export const contact: Record<string, string> = {
  'Trop de requêtes, réessayez dans une minute.':
    'Zu viele Anfragen, versuch es in einer Minute erneut.',
  'Données invalides.': 'Ungültige Eingaben.',
  "Échec de l'enregistrement du message, réessayez.":
    'Die Nachricht konnte nicht gespeichert werden. Versuch es noch einmal.',
  // Messages de validation (schéma) affichables si le formulaire les remonte un jour
  'Nom requis (2 caractères minimum)': 'Name erforderlich (mindestens 2 Zeichen)',
  'E-mail invalide': 'Ungültige E-Mail-Adresse',
  'Téléphone invalide': 'Ungültige Telefonnummer',
  'Sujet requis': 'Betreff erforderlich',
  'Message trop court (10 caractères minimum)': 'Nachricht zu kurz (mindestens 10 Zeichen)',
};
