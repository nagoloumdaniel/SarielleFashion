import type { Messages } from '../types';

export const legal: Messages['legal'] = {
  actions: { contact: 'Schreib mir', contactUs: 'Kontakt aufnehmen', catalogue: 'Katalog ansehen' },
  imprint: {
    meta: {
      title: 'Impressum',
      description:
        'Impressum von Sarielle Fashion: Anbieter, Kontaktdaten, Hosting und Verantwortlichkeit für die Inhalte der Website.',
    },
    title: 'Impressum',
    publisher: {
      title: '1. Anbieter der Website',
      legalName: 'Name und Marke',
      activity: 'Tätigkeit',
      activityValue: 'Frisuren, Make-up, Lace-Installation, Wimpern.',
      contact: 'Anschrift und Kontakt',
      address: 'Clausthal-Zellerfeld, Deutschland',
      email: 'E-Mail:',
    },
    hosting: {
      title: '2. Hosting',
      text: 'Diese Website wird von Vercel Inc. (vercel.com, USA) betrieben, einer öffentlichen Cloud-Plattform.',
    },
    publication: {
      title: '3. Verantwortlich für die Inhalte',
      text: 'Verantwortlich für die Inhalte ist Sarielle, Inhaberin von Sarielle Fashion. Texte, Fotos und Bilder dieser Website sind Eigentum von Sarielle oder werden mit Erlaubnis der Urheber verwendet. Jede Vervielfältigung ohne schriftliche Zustimmung ist untersagt.',
    },
    data: {
      title: '4. Personenbezogene Daten',
      before: 'Die über diese Website erhobenen Daten werden wie in der',
      link: 'Datenschutzerklärung',
      after:
        ' beschrieben verarbeitet. Nach der DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung und Widerspruch. Um diese Rechte auszuüben, schreib an',
    },
    question: 'Noch eine Frage?',
  },
  privacy: {
    meta: {
      title: 'Datenschutzerklärung (DSGVO)',
      description:
        'Datenschutzerklärung von Sarielle Fashion: erhobene Daten, Zwecke, Speicherdauer, Rechte und Cookies.',
    },
    breadcrumb: 'Datenschutzerklärung',
    title: 'Datenschutzerklärung',
    controller: {
      title: '1. Verantwortliche Stelle',
      text: 'Sarielle Fashion (Sarielle, Inhaberin) ist verantwortlich für die Verarbeitung der personenbezogenen Daten, die auf dieser Website erhoben werden. Kontakt:',
    },
    collected: {
      title: '2. Erhobene Daten',
      items: [
        'Kontaktformular: Name, E-Mail, Telefon (freiwillig), Betreff, Nachricht.',
        'Kundenkonto und Buchungen: Kontaktdaten, Verlauf der Termine und Leistungen.',
        'Haarbewertung (Fotos): nur mit deiner Einwilligung, privat gespeichert und nie in der öffentlichen Galerie veröffentlicht.',
        'Technische Daten: IP-Adresse (Ratenbegrenzung des Kontaktformulars, kein Profiling), Sitzungs-Cookies bei der Anmeldung im Dashboard.',
      ],
    },
    purposes: {
      title: '3. Zwecke und Rechtsgrundlage',
      purpose: 'Zweck',
      basis: 'Rechtsgrundlage',
      rows: [
        ['Auf deine Nachrichten antworten (Kontakt)', 'Deine Einwilligung'],
        ['Deine Termine und Leistungen verwalten', 'Vertragserfüllung'],
        ['Das Formular vor Spam schützen', 'Berechtigtes Interesse von Sarielle'],
        ['Die Verträglichkeit für dein Haar einschätzen', 'Deine Einwilligung'],
      ],
    },
    retention: {
      title: '4. Speicherdauer',
      messages: 'Kontaktnachrichten: höchstens 12 Monate nach der letzten Antwort.',
      customers:
        'Kundendaten und Verlauf: höchstens {months} Monate, danach Anonymisierung oder Löschung.',
      booking:
        'Buchungs- und Kundendaten: Dauer der Kundenbeziehung zuzüglich gesetzlicher Fristen (Rechnungsstellung).',
      photos:
        'Private Fotos für Bewertung und Anfragen: höchstens {days} Tage, danach automatische Löschung.',
      ip: 'IP-Adresse (Ratenbegrenzung): wird nur für die Dauer des Zeitfensters der Ratenbegrenzung gespeichert und dann gelöscht.',
    },
    recipients: {
      title: '5. Empfänger und Auftragsverarbeiter',
      text: 'Deine Daten werden weder verkauft noch vermietet. Sie können an technische Dienstleister weitergegeben werden, die für den Betrieb der Website unbedingt nötig sind: Hosting, Datenbank, E-Mail-Versand (Buchungsbestätigung) und gegebenenfalls Analyse-Dienste. Jeder Dienstleister ist vertraglich zu Vertraulichkeit und Datensicherheit verpflichtet (Auftragsverarbeitungsvertrag).',
    },
    rights: {
      title: '6. Deine Rechte (DSGVO)',
      intro: 'Nach der DSGVO kannst du kostenlos folgende Rechte ausüben:',
      items: [
        'Auskunft über die dich betreffenden Daten erhalten.',
        'Unrichtige oder unvollständige Daten berichtigen lassen.',
        'Deine Daten löschen lassen (Recht auf Vergessenwerden), vorbehaltlich gesetzlicher Aufbewahrungspflichten.',
        'Der Verarbeitung deiner Daten aus Gründen, die sich aus deiner besonderen Situation ergeben, widersprechen.',
        'Die Übertragbarkeit deiner Daten verlangen.',
        'Deine Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der bisherigen Verarbeitung berührt wird.',
      ],
      before: 'Um diese Rechte auszuüben oder eine Frage zu stellen, schreib an',
      after:
        '. Zur Vermeidung von Missbrauch kann ein Identitätsnachweis verlangt werden. Bei anhaltenden Meinungsverschiedenheiten kannst du dich bei der zuständigen Datenschutzaufsichtsbehörde in Niedersachsen beschweren: Die Landesbeauftragte für den Datenschutz Niedersachsen (lfd.niedersachsen.de).',
    },
    cookies: {
      title: '7. Cookies und Tracker',
      text: 'Diese Website kann Cookies verwenden, die für den Betrieb unbedingt erforderlich sind (Sitzung des Dashboards, Schutz des Kontaktformulars, Speicherung der gewählten Sprache). Ohne deine vorherige Einwilligung werden keine Werbe-Tracking-Cookies gesetzt. Du kannst Cookies in deinem Browser konfigurieren oder deaktivieren.',
    },
    security: {
      title: '8. Sicherheit',
      text: 'Sarielle setzt geeignete Sicherheitsmaßnahmen ein, um deine Daten vor Zerstörung, Verlust, Veränderung oder unbefugtem Zugriff zu schützen: geschützte Anmeldung, verschlüsselt gespeicherte Passwörter und Prüfung der Eingaben auf dem Server.',
    },
    exercise: 'Deine Rechte ausüben',
  },
};
