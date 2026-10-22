import type { Messages } from '../types';

export const reviews: Messages['reviews'] = {
  tokenPage: {
    metaTitle: 'Bewertung abgeben',
    invalidTitle: 'Ungültiger Link',
    invalidText: 'Dieser Bewertungslink gehört zu keinem Termin.',
    answeredTitle: 'Bewertung bereits gesendet',
    expiredTitle: 'Link abgelaufen',
    answeredText: 'Danke, deine Bewertung wurde bereits übermittelt.',
    expiredText:
      'Dieser Bewertungslink ist abgelaufen. Du kannst deine Bewertung weiterhin auf der Seite der Leistung abgeben.',
    title: 'Deine Bewertung zu „{service}“',
  },
  section: {
    title: 'Kundenbewertungen',
    empty: 'Für diese Leistung gibt es noch keine Bewertung. Schreib doch die erste.',
    give: 'Bewertung abgeben',
  },
  list: {
    label: 'Kundenbewertungen',
    verified: 'Verifizierte Kundschaft',
    photosLabel: 'Fotos zur Bewertung',
    enlarge: 'Foto {n} von {total} vergrößern',
    loadError: 'Die Bewertungen konnten nicht geladen werden. Versuch es noch einmal.',
    more: 'Weitere Bewertungen anzeigen',
  },
  form: {
    firstName: 'Dein Vorname',
    firstNameHint: 'Angezeigt werden nur dein Vorname und der Anfangsbuchstabe deines Nachnamens.',
    comment: 'Dein Kommentar (optional)',
    commentPlaceholder: 'Erzähl, wie dein Termin war',
    photos: 'Fotos (optional, höchstens {max})',
    pickPhotos: 'Fotos auswählen',
    addPhotos: 'Fotos hinzufügen',
    photoRules: 'JPEG, PNG oder WebP, jeweils höchstens 5 MB.',
    tooMany: 'Höchstens {max} Fotos.',
    badType: 'Verwende Fotos im Format JPEG, PNG oder WebP.',
    tooBig: 'Jedes Foto darf höchstens 5 MB groß sein.',
    preview: 'Vorschau von Foto {n}',
    remove: 'Foto {n} entfernen',
    honeypot: 'Nicht ausfüllen',
    submit: 'Bewertung veröffentlichen',
  },
  photoAlt: 'Foto {n} zur Bewertung von {author}',
};
