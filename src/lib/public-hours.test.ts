import { describe, expect, it } from 'vitest';
import { localizeOpeningHours } from './public-hours';

describe('localizeOpeningHours', () => {
  it('should keep the French lines unchanged', () => {
    expect(localizeOpeningHours(['Lundi - Dimanche : 5h - 22h'], 'fr')).toEqual([
      'Lundi - Dimanche : 5h - 22h',
    ]);
  });

  it('should translate days and hours for German', () => {
    expect(localizeOpeningHours(['Lundi - Dimanche : 5h - 22h'], 'de')).toEqual([
      'Montag - Sonntag: 5 - 22 Uhr',
    ]);
    expect(localizeOpeningHours(['Samedi : 9h - 17h30'], 'de')).toEqual(['Samstag: 9 - 17:30 Uhr']);
  });
});
