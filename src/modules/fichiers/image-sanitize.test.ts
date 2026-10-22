import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { sanitizeImage } from './image-sanitize';

const GPS_EXIF = {
  IFD0: { Copyright: 'secret-copyright', Make: 'TestCam' },
  IFD3: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '14/1 41/1 0/1',
    GPSLongitudeRef: 'W',
    GPSLongitude: '17/1 26/1 0/1',
  },
};

async function makeImage(
  format: 'jpeg' | 'png' | 'webp',
  width: number,
  height: number,
  withExif = true,
) {
  let pipeline = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
  });
  if (withExif) pipeline = pipeline.withExif(GPS_EXIF);
  const out =
    format === 'jpeg' ? pipeline.jpeg() : format === 'png' ? pipeline.png() : pipeline.webp();
  return new Uint8Array(await out.toBuffer());
}

describe('sanitizeImage', () => {
  it('should produce a fixture that really carries GPS EXIF', async () => {
    const input = await makeImage('jpeg', 40, 20);
    const meta = await sharp(input).metadata();
    expect(meta.exif).toBeDefined();
    expect(Buffer.from(input).includes(Buffer.from('secret-copyright'))).toBe(true);
  });

  it.each(['jpeg', 'webp'] as const)('should strip EXIF/GPS from a %s', async (format) => {
    const input = await makeImage(format, 40, 20);
    const output = await sanitizeImage(input);
    const meta = await sharp(output.body).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    expect(Buffer.from(output.body).includes(Buffer.from('secret-copyright'))).toBe(false);
    expect(output.mime).toBe(format === 'jpeg' ? 'image/jpeg' : 'image/webp');
  });

  it('should keep PNG format and strip metadata', async () => {
    const output = await sanitizeImage(await makeImage('png', 30, 30));
    const meta = await sharp(output.body).metadata();
    expect(output.mime).toBe('image/png');
    expect(meta.format).toBe('png');
    expect(meta.exif).toBeUndefined();
  });

  it('should apply EXIF orientation to the pixels', async () => {
    const landscape = await sharp({
      create: { width: 40, height: 20, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect((await sharp(landscape).metadata()).orientation).toBe(6);
    const output = await sanitizeImage(new Uint8Array(landscape));
    const meta = await sharp(output.body).metadata();
    expect(meta.orientation).toBeUndefined();
    expect(meta.width).toBe(20);
    expect(meta.height).toBe(40);
  });

  it('should downscale to 2400 px on the long side without enlarging small images', async () => {
    const big = await sanitizeImage(await makeImage('jpeg', 3000, 1500, false));
    const bigMeta = await sharp(big.body).metadata();
    expect(bigMeta.width).toBe(2400);
    expect(bigMeta.height).toBe(1200);
    const small = await sanitizeImage(await makeImage('jpeg', 100, 50, false));
    expect((await sharp(small.body).metadata()).width).toBe(100);
  });

  it('should reject content that is not a decodable image', async () => {
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    await expect(sanitizeImage(truncated)).rejects.toThrow(/illisible|reconnue/);
    await expect(sanitizeImage(new TextEncoder().encode('<svg onload=x>'))).rejects.toThrow(
      /reconnue/,
    );
  });
});
