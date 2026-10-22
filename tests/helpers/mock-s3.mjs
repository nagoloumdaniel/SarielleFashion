/**
 * Faux stockage S3 (chemin « path-style ») pour les tests E2E, sans dépendance ni secret.
 * Garde les objets en mémoire : PUT enregistre, GET renvoie, DELETE supprime. Aucune signature
 * n'est vérifiée (usage local uniquement).
 *
 * Lancement :  node tests/helpers/mock-s3.mjs [port]   (défaut 9199)
 * Serveur Next : S3_ENDPOINT=http://127.0.0.1:9199 S3_BUCKET=e2e S3_ACCESS_KEY_ID=x S3_SECRET_ACCESS_KEY=x
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 9199);
const objects = new Map();

createServer((req, res) => {
  const key = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (req.method === 'PUT') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      objects.set(key, {
        body: Buffer.concat(chunks),
        type: req.headers['content-type'] ?? 'application/octet-stream',
      });
      res.writeHead(200, { ETag: '"mock"' }).end();
    });
    return;
  }
  if (req.method === 'DELETE') {
    objects.delete(key);
    res.writeHead(204).end();
    return;
  }
  const object = objects.get(key);
  if (!object) {
    res.writeHead(404).end('NoSuchKey');
    return;
  }
  res.writeHead(200, { 'Content-Type': object.type, 'Content-Length': object.body.length });
  res.end(req.method === 'HEAD' ? undefined : object.body);
}).listen(port, '127.0.0.1', () => console.log(`mock S3 sur http://127.0.0.1:${port}`));
