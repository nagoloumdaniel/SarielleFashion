#!/usr/bin/env node
/**
 * P9.8 : sauvegarde logique PostgreSQL.
 *
 * Usage : node scripts/backup-db.mjs
 * Variables : DIRECT_URL ou DATABASE_URL, lue depuis l'environnement ou .env.local.
 * Si le pg_dump local est plus ancien que le serveur, le script réessaie via
 * l'image Docker postgres:18 quand Docker est disponible.
 * Le fichier est écrit dans backups/ (ignoré par Git). Aucune URL ni secret n'est affiché.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  if (process.env.DIRECT_URL || process.env.DATABASE_URL) return;
  const path = resolve('.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
    if (match?.[1] && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnv();
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL ou DATABASE_URL est requis pour la sauvegarde.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('backups', { recursive: true });
const file = resolve('backups', `hairstyle-${stamp}.dump`);
const args = ['--format=custom', '--no-owner', '--no-acl', '--file', file, url];

const local = spawnSync('pg_dump', args, { stdio: ['ignore', 'inherit', 'inherit'] });
let ok = !local.error && local.status === 0;

if (!ok) {
  const docker = spawnSync('docker', ['--version'], { stdio: 'ignore' });
  if (docker.status === 0) {
    console.log('pg_dump local incompatible ou absent, tentative via Docker postgres:18…');
    const dockerBackup = spawnSync(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${resolve('backups')}:/backups`,
        '-e',
        'PGURL',
        'postgres:18',
        'sh',
        '-c',
        'pg_dump --format=custom --no-owner --no-acl --file /backups/' +
          JSON.stringify(file.split(/[\\/]/).pop()) +
          ' "$PGURL"',
      ],
      { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PGURL: url } },
    );
    ok = dockerBackup.status === 0;
  }
}

if (!ok) {
  console.error('La sauvegarde a échoué.');
  process.exit(1);
}
console.log(`Sauvegarde créée : ${file}`);
