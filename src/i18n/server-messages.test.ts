import { describe, expect, it } from 'vitest';
import { localizeMessage } from './server-messages';
import { createTranslator } from './translate';
import { MESSAGES } from './messages';
import {
  cancellationPolicyMessage,
  evaluateCancellationPolicy,
} from '@/modules/reservations/policy';

describe('localizeMessage', () => {
  it('should return the French text untouched in French', () => {
    expect(localizeMessage('fr', 'Créneau invalide.')).toBe('Créneau invalide.');
  });

  it('should translate known messages and keep unknown ones', () => {
    expect(localizeMessage('de', 'Créneau invalide.')).toBe('Ungültiges Zeitfenster.');
    expect(localizeMessage('de', 'Message inconnu.')).toBe('Message inconnu.');
  });

  it('should translate parametrized messages and their delay', () => {
    const fr =
      'L’annulation en ligne est fermée à moins de 30 minutes du rendez-vous. Contacte Sarielle directement.';
    expect(localizeMessage('de', fr)).toContain('weniger als 30 Minuten');
    expect(localizeMessage('de', fr.replace('30 minutes', '1 h 30'))).toContain('1 Std. 30 Min.');
  });
});

describe('cancellationPolicyMessage', () => {
  it('should render the policy in German', () => {
    const t = createTranslator('de', MESSAGES.de);
    const now = new Date('2026-10-22T10:00:00Z');
    const policy = evaluateCancellationPolicy({
      startsAt: new Date('2026-10-22T10:10:00Z'),
      now,
      minCancelNoticeMinutes: 30,
    });
    expect(policy.code).toBe('CLOSED');
    expect(cancellationPolicyMessage(t, policy)).toContain('30 Minuten');
  });
});
