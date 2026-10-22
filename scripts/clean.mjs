import { rmSync } from 'node:fs';

/**
 * Supprime le cache de build Next.js (`.next`).
 *
 * Utile après une alternance `next build` / `next dev` : les deux modes
 * partagent le même dossier et un cache de production laissé en place
 * provoque des erreurs du type « Cannot find module './500.js' ».
 */
rmSync('.next', { recursive: true, force: true });
console.log('Cache .next supprimé.');
