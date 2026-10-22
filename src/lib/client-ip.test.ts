import { describe, expect, it } from 'vitest';
import { pickClientIp } from './client-ip';

const from = (map: Record<string, string>) => (name: string) => map[name] ?? null;

describe('pickClientIp', () => {
  it('should prefer x-vercel-forwarded-for over the other headers', () => {
    expect(
      pickClientIp(
        from({
          'x-vercel-forwarded-for': '203.0.113.5',
          'x-real-ip': '198.51.100.1',
          'x-forwarded-for': '192.0.2.9',
        }),
      ),
    ).toBe('203.0.113.5');
  });

  it('should fall back to x-real-ip then the first x-forwarded-for entry', () => {
    expect(pickClientIp(from({ 'x-real-ip': '198.51.100.1' }))).toBe('198.51.100.1');
    expect(pickClientIp(from({ 'x-forwarded-for': '192.0.2.9, 10.0.0.1' }))).toBe('192.0.2.9');
  });

  it('should accept IPv6 and reject malformed values', () => {
    expect(pickClientIp(from({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(pickClientIp(from({ 'x-vercel-forwarded-for': 'not-an-ip<script>' }))).toBe('unknown');
    expect(pickClientIp(from({}))).toBe('unknown');
  });
});
