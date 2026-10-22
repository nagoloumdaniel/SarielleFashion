import type { Messages } from '../types';

export const home: Messages['home'] = {
  meta: {
    title: 'Sarielle Fashion | Frisuren, Make-up, Lace und Wimpern in Clausthal-Zellerfeld',
    description:
      'Frisuren für Damen, Herren und Kinder, Make-up, Lace-Installation und Wimpernverlängerung in Clausthal-Zellerfeld. Auf Wunsch auch bei dir zu Hause, Termin online buchen.',
    ogTitle: 'Sarielle Fashion | Frisuren, Make-up, Lace und Wimpern',
    ogDescription: 'Dein nächster Look. Ein Stil, der zu dir passt. Buche deinen Termin online.',
  },
  hero: {
    badge: 'Clausthal-Zellerfeld · Hausbesuch möglich',
    title: 'Dein nächster Look. Ein Stil, der zu dir passt.',
    text: 'Frisuren, Make-up, Lace-Installation und Wimpern. Ich kümmere mich um dich, mit nur einer Priorität: deiner Zufriedenheit.',
    reserve: 'Termin buchen',
    catalogue: 'Katalog ansehen',
    indexAria: 'Meine Leistungen',
  },
  expertises: [
    {
      title: 'Frisuren',
      text: 'Für Damen, Herren und Kinder: eine Frisur, die zu deinem Haartyp und deinem Alltag passt.',
    },
    {
      title: 'Make-up',
      text: 'Ein Make-up, das deine Gesichtszüge zur Geltung bringt, vom strahlend natürlichen Look bis zum Glamour für einen festlichen Abend.',
    },
    {
      title: 'Lace-Installation',
      text: 'Eine sorgfältige, unauffällige Anbringung mit natürlichem Ergebnis und langer Haltbarkeit.',
    },
    {
      title: 'Wimpern',
      text: 'Ein ausdrucksstarker Blick, mit präziser und angenehmer Anbringung.',
    },
  ],
  figuresAria: 'Sarielle Fashion in Zahlen',
  figures: [
    { value: '5 Jahre', label: 'Erfahrung' },
    { value: '≈ 30', label: 'Kundinnen und Kunden pro Monat' },
    { value: '4', label: 'Leistungsbereiche' },
    { value: '100 %', label: 'Priorität: deine Zufriedenheit' },
  ],
  skills: {
    title: 'Meine Leistungen',
    text: 'Frisieren ist meine Leidenschaft, und jedes Detail zählt für mich. Ich empfange Frauen, Männer und Kinder und begleite dich auch zu deinen besonderen Anlässen.',
    audiencesAria: 'Für wen',
    audiences: ['Damen', 'Herren', 'Kinder', 'Events'],
  },
  popular: {
    title: 'Am häufigsten gebucht',
    all: 'Alle Leistungen ansehen',
    aria: 'Die am häufigsten gebuchten Leistungen',
  },
  realisations: {
    title: 'Meine Arbeiten',
    all: 'Ganze Galerie ansehen',
    aria: 'Meine neuesten Arbeiten',
  },
  steps: {
    title: 'So funktioniert es',
    items: [
      {
        title: 'Wähle deine Leistung',
        description: 'Stöbere im Katalog und such dir aus, was zu dir passt.',
      },
      {
        title: 'Prüfe die Eignung',
        description: 'Beantworte ein paar Fragen, damit das Ergebnis zu dir passt.',
      },
      {
        title: 'Buche deinen Termin',
        description: 'Wähle Datum und Uhrzeit und bestätige mit wenigen Klicks.',
      },
    ],
  },
  about: {
    title: 'Über Sarielle',
    tagline: 'Priorität · Disziplin · Werte',
    p1: 'Seit fünf Jahren ist Frisieren für mich viel mehr als ein Beruf: Es ist meine Leidenschaft. Ich frisiere Frauen ebenso wie Männer und bilde mich laufend in Make-up, Lace-Installation und Wimpern weiter.',
    p2: 'Jeder Teil der Arbeit zählt, denn deine Zufriedenheit ist meine Priorität. Ich schätze gute Arbeit, Pünktlichkeit und Respekt: Das sind meine Werte, und du findest sie bei jedem Termin wieder.',
  },
  travel: {
    badge: 'Ich komme zu dir',
    title: 'In Clausthal-Zellerfeld oder bei dir zu Hause.',
    text: 'Ich komme auch gern zu dir, für ein Event oder einfach aus Bequemlichkeit.',
    feeWith: 'Die Anfahrtskosten gehen zu deinen Lasten: {fee}.',
    feeWithout: 'Die Anfahrtskosten gehen zu deinen Lasten und werden vor der Buchung angezeigt.',
    contact: 'Kontakt aufnehmen',
  },
  testimonials: { title: 'Sie vertrauen mir' },
  custom: {
    title: 'Du hast eine genaue Idee?',
    text: 'Beschreibe dein Vorhaben und füge bis zu drei Inspirationsfotos bei. Ich mache dir ein passendes Angebot.',
    action: 'Anfrage senden',
  },
  contact: {
    title: 'Kontakt',
    send: 'Nachricht senden',
    address: 'Clausthal-Zellerfeld, Deutschland',
    byAppointment: 'Nur nach Terminvereinbarung',
  },
};
