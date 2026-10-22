#!/usr/bin/env node
/**
 * P9.8 : restauration contrôlée d'une sauvegarde PostgreSQL.
 *
 * Usage : RESTORE_DATABASE_URL=postgresql://... node scripts/restore-db.mjs backups/fichier.dump --confirm
 * La cible ne doit jamais être la base de production. Le script refuse de restaurer
 * si la confirmation explicite ou l'URL cible manque.
 * Si pg_restore local est incompatible, l'image Docker postgres:18 est utilisée.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
const confirmed = args.includes('--confirm');
const target = process.env.RESTORE_DATABASE_URL;

if (!file || !existsSync(file)) {
  console.error('Fichier de sauvegarde introuvable.');
  process.exit(1);
}
if (!target) {
  console.error('RESTORE_DATABASE_URL est requis. Utilisez une base de restauration dédiée.');
  process.exit(1);
}
if (!confirmed) {
  console.error('Ajoutez --confirm pour autoriser la restauration sur la cible indiquée.');
  process.exit(1);
}
if (process.env.DATABASE_URL && target === process.env.DATABASE_URL) {
  console.error('La cible est identique à DATABASE_URL : restauration refusée.');
  process.exit(1);
}

const local = spawnSync('pg_restore', ['--no-owner', '--no-acl', '--dbname', target, file], {
  stdio: ['ignore', 'inherit', 'inherit'],
});
let ok = !local.error && local.status === 0;

if (!ok) {
  const docker = spawnSync('docker', ['--version'], { stdio: 'ignore' });
  if (docker.status === 0) {
    console.log('pg_restore local incompatible ou absent, tentative via Docker postgres:18…');
    const dockerRestore = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${resolve('backups')}:/backups:ro`,
        '-e',
        'PGURL',
        'postgres:18',
        'sh',
        '-c',
        `pg_restore --no-owner --no-acl --dbname "$PGURL" /backups/${JSON.stringify(
          file.split(/[\\/]/).pop(),
        )}`,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PGURL: target } },
    );
    ok = dockerRestore.status === 0;
  }
}

if (!ok) {
  console.error('La restauration a échoué.');
  process.exit(1);
}
console.log('Restauration terminée. Vérifiez les tables et les compteurs avant toute bascule.');
