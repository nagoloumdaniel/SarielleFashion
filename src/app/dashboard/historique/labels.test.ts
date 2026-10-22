import { describe, expect, it } from 'vitest';
import { actionLabel, entityHref, entityLabel } from './labels';

describe('historique labels', () => {
  it('should translate known and dynamic actions', () => {
    expect(actionLabel('customer.anonymize')).toContain('anonymisée');
    expect(actionLabel('appointment.completed')).toBe('Rendez-vous : terminée');
    expect(actionLabel('custom_request.decision.quoted')).toContain('Demande');
  });

  it('should fall back to a readable label for unknown actions', () => {
    expect(actionLabel('foo.bar_baz')).toBe('Foo bar baz');
  });

  it('should link to existing entities only', () => {
    expect(entityHref('Customer', 'abc', 'customer.contact.update')).toBe('/dashboard/clients/abc');
    expect(entityHref('Conversation', 'abc', 'conversation.delete')).toBeNull();
    expect(entityHref('Category', 'abc', 'category.update')).toBeNull();
    expect(entityHref('Customer', null, 'customer.export')).toBeNull();
  });

  it('should expose a French entity label', () => {
    expect(entityLabel('Service')).toBe('Prestation');
    expect(entityLabel('Unknown')).toBe('Unknown');
  });
});
