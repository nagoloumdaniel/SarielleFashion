import { describe, expect, it } from 'vitest';
import { MAX_SERVICE_PHOTOS, parsePhotoLayout } from './service-photos';

const ctx = (fileCount: number, existingIds: string[] = []) => ({ fileCount, existingIds });

describe('parsePhotoLayout', () => {
  it('accepte jusqu’à 3 photos mélangeant existantes et nouvelles, dans l’ordre donné', () => {
    expect(MAX_SERVICE_PHOTOS).toBe(3);
    const entries = parsePhotoLayout(JSON.stringify(['n:0', 'e:a', 'e:b']), ctx(1, ['a', 'b']));
    expect(entries).toEqual([
      { kind: 'new', fileIndex: 0 },
      { kind: 'existing', id: 'a' },
      { kind: 'existing', id: 'b' },
    ]);
  });

  it('accepte une liste vide (toutes les photos retirées)', () => {
    expect(parsePhotoLayout('[]', ctx(0, ['a']))).toEqual([]);
  });

  it('refuse plus de 3 photos', () => {
    expect(() => parsePhotoLayout(JSON.stringify(['n:0', 'n:1', 'n:2', 'n:3']), ctx(4))).toThrow(
      /3 photos maximum/,
    );
    expect(() =>
      parsePhotoLayout(JSON.stringify(['e:a', 'e:b', 'n:0', 'n:1']), ctx(2, ['a', 'b'])),
    ).toThrow(/3 photos maximum/);
  });

  it('refuse une photo existante qui n’appartient pas à la prestation', () => {
    expect(() => parsePhotoLayout(JSON.stringify(['e:zzz']), ctx(0, ['a']))).toThrow(/introuvable/);
  });

  it('refuse les doublons et les indices de fichiers invalides', () => {
    expect(() => parsePhotoLayout(JSON.stringify(['e:a', 'e:a']), ctx(0, ['a']))).toThrow();
    expect(() => parsePhotoLayout(JSON.stringify(['n:0', 'n:0']), ctx(1))).toThrow();
    expect(() => parsePhotoLayout(JSON.stringify(['n:5']), ctx(1))).toThrow();
    expect(() => parsePhotoLayout(JSON.stringify(['n:-1']), ctx(1))).toThrow();
    expect(() => parsePhotoLayout(JSON.stringify(['n:x']), ctx(1))).toThrow();
  });

  it('refuse un fichier envoyé mais absent de la liste', () => {
    expect(() => parsePhotoLayout('[]', ctx(1))).toThrow();
  });

  it('refuse une entrée non JSON ou de mauvais type', () => {
    expect(() => parsePhotoLayout('pas du json', ctx(0))).toThrow();
    expect(() => parsePhotoLayout(null, ctx(0))).toThrow();
    expect(() => parsePhotoLayout('{"a":1}', ctx(0))).toThrow();
    expect(() => parsePhotoLayout('[1]', ctx(0))).toThrow();
    expect(() => parsePhotoLayout('["x:1"]', ctx(0))).toThrow();
  });
});
