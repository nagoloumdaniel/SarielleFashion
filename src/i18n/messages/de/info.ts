import type { Messages } from '../types';

export const info: Messages['info'] = {
  meta: {
    title: 'Praktische Infos',
    description:
      'Öffnungszeiten, Vorbereitung auf den Termin und Stornierungsbedingungen von Sarielle Fashion.',
  },
  title: 'Praktische Infos',
  contact: {
    title: 'Kontaktdaten',
    address: 'Adresse',
    defaultAddress: 'Clausthal-Zellerfeld\nDeutschland',
    homeService: 'Frisur bei dir zu Hause',
    email: 'E-Mail',
  },
  hours: {
    title: 'Öffnungszeiten',
    note: 'Nur nach Terminvereinbarung. Danke, dass du pünktlich bist.',
  },
  preparation: {
    title: 'So bereitest du deinen Termin vor',
    items: [
      'Komm mit sauberen, entwirrten und getrockneten Haaren.',
      'Wenn du bereits eine Frisur trägst, löse sie nicht am Vortag auf.',
      'Bring ein Foto oder eine Inspiration für das gewünschte Ergebnis mit, falls du eine hast.',
    ],
  },
  payment: {
    title: 'Bezahlung',
    sentence:
      'Die Bezahlung erfolgt immer vor Ort am Tag des Termins, bar oder per Überweisung. Online-Zahlungen sind nicht vorgesehen.',
  },
  booking: {
    title: 'Buchungsbedingungen',
    defaultPolicy:
      'Termine gibt es nur nach vorheriger Buchung. Die Bezahlung erfolgt immer vor Ort, bar oder per Überweisung. Bitte halte die vereinbarte Uhrzeit ein.',
  },
  homeService: {
    withFee:
      'Eine Frisur bei dir zu Hause ist optional möglich, die Anfahrtskosten gehen zu deinen Lasten: ab {fee}.',
    free: 'Eine Frisur bei dir zu Hause ist optional möglich, ohne Anfahrtskosten.',
  },
  cancellation: {
    title: 'Stornierungsbedingungen',
    noDelay: 'die vorgesehene Frist',
    onTime: {
      label: 'Rechtzeitige Stornierung',
      description:
        'Du kannst deinen Termin bis {delay} vor der vereinbarten Zeit kostenlos online stornieren, über den sicheren Link aus deiner E-Mail.',
    },
    late: {
      label: 'Späte Stornierung',
      description:
        'Nach Ablauf der Frist von {delay} funktioniert der Stornierungslink nicht mehr und der Termin kann nicht mehr an andere vergeben werden. Wende dich direkt an Sarielle, dann schauen wir gemeinsam, was möglich ist.',
    },
    absence: {
      label: 'Nichterscheinen',
      description:
        'Bei Nichterscheinen ohne Vorankündigung behält sich Sarielle vor, für spätere Buchungen eine Anzahlung zu verlangen.',
    },
    bySarielle: {
      label: 'Absage durch Sarielle',
      description:
        'Muss Sarielle aus persönlichen Gründen absagen (Krankheit, Notfall), melde ich mich sofort bei dir und biete dir vorrangig einen neuen Termin an, ohne Kosten.',
    },
  },
  delay: {
    minutes: { one: '{count} Minute', other: '{count} Minuten' },
    hours: { one: '{count} Stunde', other: '{count} Stunden' },
    hoursMinutes: '{h} Std. {m} Min.',
  },
  question: {
    title: 'Noch eine Frage?',
    contact: 'Kontakt aufnehmen',
    book: 'Termin buchen',
  },
};
