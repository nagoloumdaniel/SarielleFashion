import type { Messages } from '../types';

export const nav: Messages['nav'] = {
  home: 'Start',
  catalogue: 'Katalog',
  gallery: 'Galerie',
  faq: 'FAQ',
  custom: 'Sonderwunsch',
  contact: 'Kontakt',
  reserve: 'Termin buchen',
  homeAria: 'Sarielle Fashion, Startseite',
  main: 'Hauptnavigation',
  mobile: 'Mobile Navigation',
  openMenu: 'Menü öffnen',
  closeMenu: 'Menü schließen',
  footer: {
    tagline: 'Frisuren, Make-up, Lace-Installation und Wimpern in Clausthal-Zellerfeld.',
    practical: 'Praktisches',
    practicalAria: 'Praktische Links',
    info: 'Praktische Infos',
    legal: 'Impressum',
    privacy: 'Datenschutz',
    follow: 'Folge mir',
    rights: 'Alle Rechte vorbehalten.',
  },
  language: {
    label: 'Sprache',
    switchTo: 'Website auf {name} umstellen',
    current: '{name} (aktuelle Sprache)',
    // Suggestion rédigée dans la langue PROPOSÉE (l'utilisateur lit cette langue).
    suggest: {
      fr: {
        text: 'Ce site est aussi disponible en français.',
        action: 'Passer au français',
        dismiss: 'Fermer cette suggestion',
      },
      de: {
        text: 'Diese Seite gibt es auch auf Deutsch.',
        action: 'Auf Deutsch ansehen',
        dismiss: 'Diesen Hinweis schließen',
      },
    },
  },
};
