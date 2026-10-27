import type { Messages } from '../types';

export const faq: Messages['faq'] = {
  meta: {
    title: 'FAQ',
    description:
      'Häufige Fragen zu Leistungen, Terminbuchung, Stornierung und Haaren bei Sarielle Fashion.',
  },
  breadcrumb: 'FAQ',
  title: 'Deine Fragen, unsere Antworten',
  listLabel: 'Liste der häufigen Fragen',
  other: 'Noch eine Frage?',
  contact: 'Kontakt aufnehmen',
  catalogue: 'Katalog ansehen',
  items: [
    {
      id: 'reservation',
      title: 'Wie buche ich einen Termin?',
      content:
        'Stöbere im Katalog, wähle die passende Leistung, beantworte gegebenenfalls die Fragen zur Verträglichkeit und such dir dann Datum und Uhrzeit aus. Du bekommst eine Bestätigung per E-Mail mit einem sicheren Link zu deinem Termin.',
    },
    {
      id: 'delai',
      title: 'Wie weit im Voraus sollte ich buchen?',
      content:
        'Ich empfehle dir, mindestens eine Woche vorher zu buchen, besonders für aufwendige Frisuren und Events. Manchmal sind kurzfristig noch Termine frei: Schreib mir einfach, dann prüfe ich es.',
    },
    {
      id: 'cheveux',
      title: 'Welche Haartypen frisierst du?',
      content:
        'Ich frisiere Frauen, Männer und Kinder und biete außerdem Make-up, Lace-Installation und Wimpern an. Jede Leistung wird an deine Haarstruktur angepasst.',
    },
    {
      id: 'preparation',
      title: 'Wie bereite ich meine Haare auf den Termin vor?',
      content:
        'Komm mit sauberen, entwirrten und getrockneten Haaren. Wenn du bereits eine Frisur trägst, löse sie nicht am Vortag auf: Das übernehme ich zu Beginn des Termins.',
    },
    {
      id: 'duree',
      title: 'Wie lange dauert eine Leistung?',
      content:
        'Die Dauer hängt von der Leistung und deiner Haarlänge ab. Im Katalog steht bei jeder Leistung eine Richtdauer; die tatsächliche Dauer bestätigen wir, bevor es losgeht.',
    },
    {
      id: 'prix',
      title: 'Wie werden die Preise festgelegt?',
      content:
        'Die Preise hängen von Länge, Dichte und Aufwand der Frisur ab. Im Katalog siehst du einen Ab-Preis oder eine Preisspanne. Den Endpreis bestätige ich dir immer, bevor ich anfange.',
    },
  ],
  payment: {
    title: 'Wie und wann kann ich bezahlen?',
    suffix: 'Den Endpreis bestätige ich dir, bevor ich anfange.',
  },
  cancellation: {
    title: 'Wie sind die Stornierungsbedingungen?',
    content:
      'Du kannst deinen Termin bis 30 Minuten vor der vereinbarten Zeit kostenlos online stornieren, über den sicheren Link aus deiner E-Mail. Danach funktioniert der Link nicht mehr: Wende dich dann direkt an Sarielle. Es gelten die ausführlichen Bedingungen in den praktischen Infos.',
  },
  options: {
    title: 'Kann ich meiner Leistung Optionen hinzufügen?',
    content:
      'Ja, die meisten Leistungen bieten Optionen an (Pflege, zusätzliche Längen, individuelle Muster). Du wählst sie bei der Buchung aus; sie beeinflussen Preis und Dauer.',
  },
  homeService: {
    title: 'Kommst du auch zu mir nach Hause?',
    suffix: 'Ansonsten empfange ich dich nach Terminvereinbarung in Clausthal-Zellerfeld.',
  },
};
