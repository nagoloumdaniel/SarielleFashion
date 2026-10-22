import type { Messages } from '../types';

export const waitlist: Messages['waitlist'] = {
  meta: {
    title: 'Warteliste',
    description:
      'Lass dich per E-Mail benachrichtigen, sobald ein Zeitfenster für die gewünschte Leistung frei wird.',
  },
  title: 'Warteliste',
  intro: 'Du bekommst eine E-Mail, sobald dieses Zeitfenster frei wird.',
  form: {
    service: 'Gewünschte Leistung',
    date: 'Gewünschtes Datum',
    time: 'Gewünschte Uhrzeit',
    name: 'Vor- und Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    submit: 'Auf die Warteliste',
  },
  confirm: {
    meta: { title: 'Meine Buchung bestätigen' },
    invalidTitle: 'Ungültiger Link',
    invalidText: 'Dieser Link gehört zu keinem Wartelisten-Eintrag.',
    alreadyTitle: 'Bereits bestätigt',
    expiredTitle: 'Link abgelaufen',
    alreadyText: 'Diese Buchung wurde bereits bestätigt.',
    expiredText:
      'Dieser Link ist abgelaufen. Der Platz wurde der nächsten Person auf der Warteliste angeboten.',
    freedTitle: 'Für „{service}“ ist ein Platz frei geworden',
    slotBefore: 'Zeitfenster am',
    name: 'Vor- und Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    submit: 'Meine Buchung bestätigen',
    reference: 'Referenz: {reference}.',
  },
};
