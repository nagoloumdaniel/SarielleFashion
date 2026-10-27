import type { Messages } from '../types';

export const contact: Messages['contact'] = {
  meta: {
    title: 'Kontakt',
    description:
      'Schreib Sarielle Fashion: Fragen, Terminbuchung, praktische Infos. Schnelle Antwort.',
  },
  h1: 'Schreib uns',
  formAria: 'Kontaktformular',
  infoAria: 'Praktische Informationen',
  infoTitle: 'Praktische Infos',
  infos: {
    reply: { title: 'Antwort innerhalb von 24 Stunden (Werktage)', text: 'Per E-Mail.' },
    appointment: {
      title: 'Frisuren nach Terminvereinbarung',
      text: 'Sarielle empfängt dich in Clausthal-Zellerfeld.',
    },
  },
  hours: 'Öffnungszeiten',
  hoursNote: 'Nur mit Termin, je nach verfügbaren Zeitfenstern.',
  book: 'Termin buchen',
  custom: 'Sonderwunsch anfragen',
  follow: 'Sarielle folgen',
  form: {
    success: {
      title: 'Danke, deine Nachricht ist angekommen',
      text: 'Nachricht gesendet. Sarielle antwortet dir innerhalb von 24 Stunden (Werktage) per E-Mail. Schau bitte auch in deinen Spam-Ordner.',
      again: 'Weitere Nachricht senden',
    },
    title: 'Deine Nachricht',
    name: 'Name',
    namePlaceholder: 'Dein Vor- und Nachname',
    email: 'E-Mail',
    emailPlaceholder: 'du@beispiel.de',
    phone: 'Telefon (optional)',
    subject: 'Betreff',
    subjectPlaceholder: 'Worum geht es?',
    message: 'Nachricht',
    messagePlaceholder: 'Schreib hier deine Nachricht …',
    messageHint: 'Nenn uns gern die gewünschte Frisur oder dein Wunschdatum, falls du eines hast.',
    sending: 'Wird gesendet ...',
    send: 'Nachricht senden',
  },
};
