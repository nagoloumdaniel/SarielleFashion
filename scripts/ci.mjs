#!/usr/bin/env node
/**
 * CI/CD locale (remplace GitHub Actions, désactivé sur le dépôt).
 *
 * Exécute la chaîne de vérification dans l'ordre : chaque étape
 * qui existe dans package.json est exécutée, les étapes absentes
 * sont marquées « ignoré » (la chaîne se complète toute seule au
 * fil des phases : lint dès Phase 1, tests dès Phase 11, build
 * dès le scaffold Next.js).
 *
 * Usage : npm run ci        (aussi déclenché par le hook pre-push)
 * Sortie : récapitulatif + code 0 si tout est vert, 1 sinon.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const CHAIN = [
  ['typecheck', 'Types (tsc --noEmit)'],
  ['format:check', 'Formatage (Prettier)'],
  ['lint', 'Lint (ESLint)'],
  ['test', 'Tests (Vitest)'],
  ['build', 'Build de production (Next.js)'],
];

const results = [];
let failed = false;

for (const [name, label] of CHAIN) {
  if (!pkg.scripts || !(name in pkg.scripts)) {
    results.push({ name, status: 'ignoré (script absent)' });
    continue;
  }
  console.log(`\n=== ${label} — npm run ${name} ===`);
  try {
    execSync(`npm run ${name}`, { stdio: 'inherit', shell: true });
    results.push({ name, status: 'OK' });
  } catch {
    results.push({ name, status: 'ÉCHEC' });
    failed = true;
    break; // fail fast : la CI s'arrête à la première erreur, comme une pipeline
  }
}

console.log('\n=== Récapitulatif CI locale ===');
for (const r of results) {
  console.log(
    `  ${r.status.startsWith('OK') ? '[OK]' : r.status.startsWith('ignor') ? '[-]' : '[KO]'} ${r.name.padEnd(12)} ${r.status}`,
  );
}
const skipped = CHAIN.length - results.length;
if (skipped > 0 && !failed) {
  console.log(`  [-] ${skipped} étape(s) suivante(s) ignorée(s) après échec`);
}
console.log(failed ? '\nCI LOCALE : ÉCHEC' : '\nCI LOCALE : SUCCÈS');
process.exit(failed ? 1 : 0);
