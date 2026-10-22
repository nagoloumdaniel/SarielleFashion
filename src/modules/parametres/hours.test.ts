import { describe, expect, it } from 'vitest';
import { formatHour, formatOpeningHours } from './hours';

describe('formatOpeningHours', () => {
  it('affiche la valeur par défaut quand rien n’est enregistré', () => {
    expect(formatOpeningHours(null)).toEqual(['Lundi - Dimanche : 5h - 22h']);
  });

  it('regroupe les jours consécutifs', () => {
    const raw = [0, 1, 2, 4].map((weekday) => ({ weekday, open: '08:00', close: '18:30' }));
    expect(formatOpeningHours(raw)).toEqual([
      'Lundi - Mercredi : 8h - 18h30',
      'Vendredi : 8h - 18h30',
    ]);
  });

  it('formate les heures', () => {
    expect(formatHour('05:00')).toBe('5h');
    expect(formatHour('17:30')).toBe('17h30');
  });
});
