import { describe, expect, it } from 'vitest';
import {
  buildServiceImageKey,
  detectImageMime,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from './image-validation';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe('detectImageMime', () => {
  it('should detect JPEG from its signature', () => {
    expect(detectImageMime(JPEG)).toBe('image/jpeg');
  });

  it('should detect PNG from its signature', () => {
    expect(detectImageMime(PNG)).toBe('image/png');
  });

  it('should detect WebP from its signature', () => {
    expect(detectImageMime(WEBP)).toBe('image/webp');
  });

  it('should reject unknown content', () => {
    expect(detectImageMime(new TextEncoder().encode('<?php echo "x"; ?>'))).toBeNull();
    expect(detectImageMime(new Uint8Array([]))).toBeNull();
  });
});

describe('validateImageFile', () => {
  it('should accept a real JPEG declared as JPEG', () => {
    expect(validateImageFile({ size: JPEG.length, type: 'image/jpeg', bytes: JPEG })).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('should reject a file whose content does not match its declared type', () => {
    expect(() => validateImageFile({ size: PNG.length, type: 'image/jpeg', bytes: PNG })).toThrow(
      /ne correspond pas/,
    );
  });

  it('should reject an unknown declared type', () => {
    expect(() =>
      validateImageFile({ size: JPEG.length, type: 'image/svg+xml', bytes: JPEG }),
    ).toThrow(/Format non accepté/);
  });

  it('should reject an empty file', () => {
    expect(() =>
      validateImageFile({ size: 0, type: 'image/jpeg', bytes: new Uint8Array([]) }),
    ).toThrow(/vide/);
  });

  it('should reject a file larger than 5 MB', () => {
    expect(() =>
      validateImageFile({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg', bytes: JPEG }),
    ).toThrow(/5 Mo/);
  });

  it('should reject disguised non-image content', () => {
    const fake = new TextEncoder().encode('not an image');
    expect(() => validateImageFile({ size: fake.length, type: 'image/png', bytes: fake })).toThrow(
      /pas une image/,
    );
  });
});

describe('buildServiceImageKey', () => {
  it('should create an unpredictable key under the service prefix', () => {
    const key = buildServiceImageKey('cm0service0000000000000000', 'jpg');
    expect(key).toMatch(/^services\/cm0service0000000000000000\/[0-9a-f-]{36}\.jpg$/);
  });

  it('should never reuse the original filename', () => {
    const first = buildServiceImageKey('cm0service0000000000000000', 'png');
    const second = buildServiceImageKey('cm0service0000000000000000', 'png');
    expect(first).not.toBe(second);
  });

  it('should reject a path traversal attempt in the service id', () => {
    expect(() => buildServiceImageKey('../../etc/passwd', 'jpg')).toThrow(/invalide/);
  });
});
