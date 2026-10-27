/* Slug d'URL généré côté serveur depuis un nom : minuscules, sans accents, tirets. */

export function slugify(value: string, maxLength = 80): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * Premier slug libre : `base`, puis `base-2`, `base-3`… `exists` dit si un slug est déjà pris
 * (par une autre entité). Base vide (nom sans lettre ni chiffre) : repli sur `fallback`.
 */
export async function uniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
  options: { fallback?: string; maxLength?: number } = {},
): Promise<string> {
  const maxLength = options.maxLength ?? 80;
  const base = slugify(name, maxLength) || options.fallback || 'element';
  let candidate = base;
  for (let n = 2; await exists(candidate); n += 1) {
    const suffix = `-${n}`;
    candidate = `${base.slice(0, maxLength - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (n > 500) throw new Error('Impossible de générer un slug unique.');
  }
  return candidate;
}
