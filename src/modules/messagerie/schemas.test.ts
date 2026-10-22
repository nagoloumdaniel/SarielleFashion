import { describe, expect, it } from 'vitest';
import { conversationStatusSchema, internalNoteSchema, replySchema } from './schemas';

describe('messagerie schemas', () => {
  it('should accept a valid reply and trim it', () => {
    const result = replySchema.safeParse({ conversationId: 'conv-1', content: '  Bonjour  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toBe('Bonjour');
  });

  it('should reject an empty reply or note', () => {
    expect(replySchema.safeParse({ conversationId: 'conv-1', content: ' ' }).success).toBe(false);
    expect(internalNoteSchema.safeParse({ conversationId: 'conv-1', content: '' }).success).toBe(
      false,
    );
  });

  it('should accept only known conversation statuses', () => {
    expect(
      conversationStatusSchema.safeParse({ conversationId: 'conv-1', status: 'TREATED' }).success,
    ).toBe(true);
    expect(
      conversationStatusSchema.safeParse({ conversationId: 'conv-1', status: 'OPEN' }).success,
    ).toBe(false);
  });
});
