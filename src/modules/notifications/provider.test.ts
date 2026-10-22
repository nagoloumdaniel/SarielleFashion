import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmailProvider } from './provider';

describe('getEmailProvider', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('should use smtp when EMAIL_MODE is smtp and credentials exist', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_MODE', 'smtp');
    vi.stubEnv('SMTP_USER', 'a@gmail.com');
    vi.stubEnv('SMTP_PASSWORD', 'abcd efgh ijkl mnop');
    expect(getEmailProvider().name).toBe('smtp');
  });

  it('should fall back to console when smtp credentials are missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_MODE', 'smtp');
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('RESEND_API_KEY', '');
    expect(getEmailProvider().name).toBe('console');
  });

  it('should stay on console in forced console mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_MODE', 'console');
    vi.stubEnv('SMTP_USER', 'a@gmail.com');
    vi.stubEnv('SMTP_PASSWORD', 'x');
    expect(getEmailProvider().name).toBe('console');
  });
});
