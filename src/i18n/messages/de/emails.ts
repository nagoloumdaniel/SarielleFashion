import type { Messages } from '../types';

export const emails: Messages['emails'] = {
  salon: 'Sarielle Fashion',
  dateTbd: 'Termin wird noch bestätigt',
  paymentShort: 'Bezahlung vor Ort, bar oder per Überweisung.',
  thanks: 'Danke für dein Vertrauen.',
  hello: 'Hallo {name},',
  yourService: 'deine Behandlung',
  free: 'Kostenlos',
  notSpecified: 'Nicht angegeben',
  row: {
    service: 'Leistung',
    dateTime: 'Datum und Uhrzeit',
    location: 'Ort',
    atHome: 'Bei dir zu Hause',
    address: 'Adresse',
    travelFee: 'Anfahrtskosten',
    reason: 'Grund',
    subject: 'Betreff',
    desiredDate: 'Wunschdatum',
    estimatedPrice: 'Geschätzter Preis',
    proposedService: 'Vorgeschlagene Leistung',
    proposedSlot: 'Vorgeschlagener Termin',
    slot: 'Termin',
  },
  text: {
    dateLabel: 'Datum: {when}',
    homeLocation: 'Ort: bei dir zu Hause{address}',
    travelFee: 'Anfahrtskosten: {fee}',
    manageLink: 'Meinen Termin verwalten: {url}',
    policyLine: '{title}: {text}',
    priceLine: 'Geschätzter Preis: {price}',
    proposedServiceLine: 'Vorgeschlagene Leistung: {service}',
  },
  policy: {
    cancellation: 'Stornierung',
    booking: 'Buchungsbedingungen',
    cancelDefaultNotice:
      'Du kannst deinen Termin bis {delay} vor dem vereinbarten Zeitpunkt kostenlos über den sicheren Link in der E-Mail stornieren. Danach funktioniert der Link nicht mehr: Melde dich dann direkt bei Sarielle.',
    cancelDefault:
      'Du kannst deinen Termin über den sicheren Link in der E-Mail stornieren. Bei Problemen melde dich bitte direkt bei Sarielle.',
    bookingDefault:
      'Termine gibt es nur nach Buchung. Bezahlt wird immer vor Ort, bar oder per Überweisung. Bitte komm pünktlich zur vereinbarten Zeit.',
    delayMinutes: { one: '{n} Minute', other: '{n} Minuten' },
    delayHours: { one: '{n} Stunde', other: '{n} Stunden' },
    delayHoursMinutes: '{h} Std. {m} Min.',
  },
  bookingReceived: {
    subject: 'Deine Terminanfrage ist eingegangen',
    title: 'Dein Termin ist registriert',
    intro:
      'Hallo {name}, deine Buchung für {service} ist bei uns eingegangen. Sarielle bestätigt deinen Termin, falls nötig.',
    note: 'Du bekommst eine Bestätigung, sobald der Termin bestätigt ist.',
    text: 'Deine Buchung für {service} ist registriert.',
  },
  bookingConfirmed: {
    subject: 'Dein Termin ist bestätigt',
    title: 'Dein Termin ist bestätigt',
    intro: 'Hallo {name}, dein Termin für {service} ist bestätigt.',
    cta: 'Meinen Termin verwalten oder stornieren',
    note: 'Bewahre diese Nachricht auf, damit du deinen Termin wiederfindest.',
    text: 'Dein Termin für {service} ist bestätigt: {when}.',
  },
  bookingCancelled: {
    subject: 'Dein Termin wurde storniert',
    title: 'Dein Termin wurde storniert',
    intro: 'Hallo {name}, dein Termin für {service} wurde storniert.',
    introByAdmin: 'Hallo {name}, dein Termin für {service} wurde von Sarielle storniert.',
    paragraph:
      'Der Termin ist wieder frei. Du kannst jederzeit über die Website einen neuen Termin buchen.',
    cta: 'Neuen Termin buchen',
    text: 'Dein Termin für {service} am {when} wurde storniert.\nDu kannst einen neuen Termin buchen: {url}',
  },
  bookingRescheduled: {
    subject: 'Dein Termin wurde verschoben',
    title: 'Dein Termin wurde verschoben',
    intro:
      'Hallo {name}, dein Termin für {service} wurde auf den unten stehenden neuen Zeitpunkt verlegt.',
    cta: 'Meinen Termin verwalten oder stornieren',
    text: 'Dein Termin für {service} wurde verschoben: {when}.',
  },
  bookingReminder: {
    subject: 'Erinnerung: Dein Termin steht bald an',
    title: 'Dein Termin steht bald an',
    intro: 'Hallo {name}, eine kurze Erinnerung an deinen Termin für {service}.',
    cta: 'Meinen Termin ansehen',
    note: 'Wenn du verhindert bist, nutze den Link aus deiner Bestätigung.',
    text: 'Erinnerung: Termin für {service} am {when}.',
  },
  contactReceived: {
    subject: 'Deine Nachricht ist angekommen',
    title: 'Nachricht erhalten',
    intro: 'Hallo {name}, Sarielle hat deine Nachricht erhalten und antwortet dir persönlich.',
    note: 'Du kannst direkt auf diese E-Mail antworten.',
    text: 'Deine Nachricht „{subject}“ ist angekommen. Sarielle antwortet dir persönlich.',
  },
  conversationReply: {
    subject: 'Antwort auf deine Nachricht: {subject}',
    title: 'Antwort von Sarielle',
    intro: 'Hallo {name}, hier ist die Antwort auf deine Nachricht.',
    note: 'Du kannst direkt auf diese E-Mail antworten.',
  },
  customRequestReceived: {
    subject: 'Deine Anfrage für eine individuelle Frisur ist angekommen',
    title: 'Anfrage erhalten',
    intro:
      'Hallo {name}, Sarielle hat deine Anfrage für eine individuelle Frisur erhalten und antwortet dir persönlich.',
    note: 'Mit dieser Anfrage ist noch kein Termin reserviert. Sarielle schlägt dir eine passende Leistung oder einen passenden Termin vor.',
    text: 'Deine Anfrage für eine individuelle Frisur ist angekommen. Sarielle antwortet dir persönlich.',
  },
  customRequestDecision: {
    subject: 'Antwort auf deine Anfrage für eine individuelle Frisur',
    title: 'Antwort von Sarielle',
    intro: 'Hallo {name}, hier ist die Antwort auf deine Anfrage für eine individuelle Frisur.',
    cta: 'Termin buchen',
    note: 'Ein Terminvorschlag reserviert den Termin nicht automatisch: Du musst ihn noch buchen.',
  },
  waitlist: {
    subject: 'Ein Platz ist frei geworden: {service}',
    title: 'Ein Termin ist frei geworden',
    intro: 'Hallo {name}, der Termin, auf den du gewartet hast, ist jetzt frei: {service}.',
    cta: 'Meine Buchung bestätigen',
    note: 'Dieser Link ist bis {expires} gültig. Danach wird der Platz der nächsten Person angeboten.',
    text: 'Der Termin am {when} für {service} ist frei.\nBestätige deine Buchung: {url}\nLink gültig bis {expires}.',
  },
  review: {
    subject: 'Deine Meinung zählt für Sarielle',
    title: 'Wie war dein Termin?',
    intro:
      'Hallo {name}, Sarielle hofft, dass dir „{service}“ gefallen hat. Deine Bewertung hilft anderen Kundinnen bei der Wahl.',
    cta: 'Bewertung abgeben',
    note: 'Deine Bewertung erscheint sofort auf der Website, mit dem Hinweis „verifizierter Kunde“.',
    text: 'Deine Bewertung zu {service} zählt für Sarielle.\nBewertung abgeben: {url}',
  },
  assessment: {
    catalogue: 'Katalog: {url}',
    cta: 'Frisur wählen und buchen',
    noteBook:
      'Diese Antwort reserviert keinen Termin: Such dir im Katalog deine Frisur und deinen Termin aus.',
    noteInfo:
      'Es ist kein Termin reserviert. Antworte auf diese E-Mail oder schreib Sarielle über die Website.',
    accepted: {
      subject: 'Einschätzung akzeptiert: {service}',
      title: 'Deine Einschätzung ist akzeptiert',
      intro:
        'Hallo {name}, Sarielle hat deine Haaranalyse für „{service}“ geprüft: Dein Haar ist dafür geeignet.',
    },
    conditional: {
      subject: 'Einschätzung unter Bedingungen akzeptiert: {service}',
      title: 'Einschätzung unter Bedingungen akzeptiert',
      intro:
        'Hallo {name}, Sarielle hat deine Haaranalyse für „{service}“ geprüft: Die Behandlung ist unter den unten genannten Bedingungen möglich.',
    },
    refused: {
      subject: 'Antwort auf deine Einschätzung: {service}',
      title: 'Antwort auf deine Einschätzung',
      intro:
        'Hallo {name}, Sarielle hat deine Haaranalyse für „{service}“ geprüft. Leider kann diese Behandlung in deiner Situation nicht durchgeführt werden.',
    },
    infoRequested: {
      subject: 'Rückfrage: {service}',
      title: 'Sarielle braucht noch ein paar Angaben',
      intro:
        'Hallo {name}, Sarielle hat deine Haaranalyse für „{service}“ geprüft und braucht noch einige Angaben, bevor sie entscheidet.',
    },
  },
};
