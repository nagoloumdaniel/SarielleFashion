import type { Messages } from '../types';

export const errors: Messages['errors'] = {
  notFound: {
    title: 'Seite nicht gefunden',
    message:
      'Diese Seite existiert nicht oder ist nicht mehr verfügbar. Im Katalog findest du weiterhin alle Leistungen von Sarielle.',
    catalogue: 'Katalog ansehen',
    home: 'Zurück zur Startseite',
  },
};
