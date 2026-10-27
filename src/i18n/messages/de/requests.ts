import type { Messages } from '../types';

export const requests: Messages['requests'] = {
  meta: {
    title: 'Anfrage für eine individuelle Frisur',
    description:
      'Beschreib deine Wunschfrisur, lade Referenzfotos hoch und erhalte eine persönliche Antwort von Sarielle.',
  },
  breadcrumb: 'Sonderwunsch',
  h1: 'Eine Frisur, die nicht im Katalog steht?',
  intro:
    'Beschreib dein Vorhaben und füge bis zu 3 Referenzfotos hinzu. Sarielle antwortet dir mit einem passenden Vorschlag.',
  formTitle: 'Deine Anfrage',
  noBooking: 'Eine Anfrage reserviert keinen Termin. Es wird keine Zahlung verlangt.',
  asideAria: 'So läuft es ab',
  asideTitle: 'So läuft es ab',
  steps: [
    { title: 'Beschreib deine Frisur', text: 'Deine Idee, dein Haar, deine Fotos.' },
    { title: 'Sarielle prüft die Machbarkeit', text: 'Sie schaut sich jede Anfrage genau an.' },
    {
      title: 'Du buchst, wenn der Vorschlag für dich passt',
      text: 'Keine Verpflichtung vor deiner Zusage.',
    },
  ],
  photoTip: 'Scharfe Fotos von vorn, von der Seite und von deinem aktuellen Haar.',
  form: {
    successTitle: 'Anfrage erhalten',
    ack: 'Eine Eingangsbestätigung bekommst du per E-Mail.',
    another: 'Weitere Anfrage senden',
    honeypot: 'Website',
    contactLegend: 'Deine Kontaktdaten',
    name: 'Vor- und Nachname',
    email: 'E-Mail',
    phone: 'Telefon (optional)',
    hairLegend: 'Deine Frisur',
    description: 'Beschreib die gewünschte Frisur',
    descriptionHint: 'Form, Länge, Technik, Inspiration, Anlass.',
    length: 'Aktuelle Haarlänge',
    lengthOptions: {
      SHORT: 'Kurz',
      MEDIUM: 'Mittellang',
      LONG: 'Lang',
      VERY_LONG: 'Sehr lang',
    },
    hairType: 'Haartyp',
    hairTypeHint: 'Beispiele: naturbelassen, geglättet, feines Haar, langes Haar.',
    currentStyle: 'Aktuelle Frisur (optional)',
    currentStyleHint: 'Beispiel: Lace seit 3 Wochen eingesetzt.',
    desiredDate: 'Wunschdatum (optional)',
    comment: 'Weitere Hinweise (optional)',
    commentHint: 'Zeitliche Vorgaben, Budget, Accessoires, empfindliche Kopfhaut.',
    photosLegend: 'Referenzfotos',
    photosInfo: 'Bis zu 3 Fotos, jeweils maximal 5 MB. Sie bleiben privat.',
    photosAria: 'Referenzfotos, maximal drei',
    previewAlt: 'Vorschau eines Referenzfotos',
    consent:
      'Ich bin damit einverstanden, dass meine Angaben und Fotos zur Bearbeitung meiner Anfrage verwendet werden. Ich kann jederzeit ihre Löschung verlangen.',
    sending: 'Anfrage wird gesendet …',
    send: 'Anfrage senden',
  },
};
