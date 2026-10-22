import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCAL_BUSINESS } from './local-business-data';
import { SOCIALS } from '@/components/layout/socials';

describe('LOCAL_BUSINESS', () => {
  it('should declare the 7 opening days from 05:00 to 22:00 and no phone', () => {
    expect(LOCAL_BUSINESS.openingHours).toHaveLength(7);
    for (const day of LOCAL_BUSINESS.openingHours) {
      expect(day.opens).toBe('05:00');
      expect(day.closes).toBe('22:00');
    }
    expect(LOCAL_BUSINESS.name).toBe('Sarielle Fashion');
    expect(JSON.stringify(LOCAL_BUSINESS)).not.toMatch(/telephone/i);
  });
});

describe('SOCIALS', () => {
  it('should expose the TikTok account', () => {
    const tiktok = SOCIALS.find((social) => social.label === 'TikTok');
    expect(tiktok?.href).toContain('tiktok.com/@sarielle6');
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|md)$/.test(name)) out.push(path);
  }
  return out;
}

describe('mentions légales interdites', () => {
  it('should not mention Steuernummer, USt-IdNr, TVA or § 19 UStG in the sources', () => {
    const forbidden = /steuernummer|ust-?idnr|\bUStG\b|\bTVA\b|umsatzsteuer|kleinunternehmer/i;
    const files = [...walk('src'), ...walk('docs')].filter((file) => !file.endsWith('.test.ts'));
    const hits = files.filter((file) => forbidden.test(readFileSync(file, 'utf8')));
    expect(hits).toEqual([]);
  });
});
