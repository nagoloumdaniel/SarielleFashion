import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '@/lib/errors';
import { sanitizeImage } from './image-sanitize';

/* ============================================================
 * Stockage objet compatible S3 (Cloudflare R2 en production).
 * Le stockage reste privé : les photos sont servies par URL signée.
 * La configuration est lue à l'appel, jamais au chargement du module,
 * pour que le build fonctionne sans secrets.
 * ============================================================ */

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const CONFIG_KEYS = [
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const;

function readStorageConfig(): StorageConfig | null {
  const missing = CONFIG_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) return null;
  return {
    endpoint: process.env.S3_ENDPOINT as string,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET as string,
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  };
}

export function isStorageConfigured(): boolean {
  return readStorageConfig() !== null;
}

export function getStorageConfigurationHint(): string {
  return (
    'Stockage photos non configuré : renseignez S3_ENDPOINT, S3_REGION, S3_BUCKET, ' +
    'S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY dans .env.local.'
  );
}

let cachedClient: S3Client | null = null;
let cachedClientFingerprint: string | null = null;

function getClient(config: StorageConfig): S3Client {
  const fingerprint = [config.endpoint, config.region, config.bucket, config.accessKeyId].join('|');
  if (cachedClient && cachedClientFingerprint === fingerprint) return cachedClient;
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedClientFingerprint = fingerprint;
  return cachedClient;
}

function requireConfig(): StorageConfig {
  const config = readStorageConfig();
  if (!config) throw new AppError('STORAGE', getStorageConfigurationHint(), 503);
  return config;
}

export async function uploadImageObject(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  const config = requireConfig();
  // Point de passage unique de tous les envois (galerie, prestations, photos privées) :
  // ré-encodage sans métadonnées (EXIF/GPS retirés, orientation appliquée, 2400 px max).
  const sanitized = await sanitizeImage(params.body);
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      Body: sanitized.body,
      ContentType: sanitized.mime,
      // Le stockage est privé : aucune URL publique prévisible.
      CacheControl: 'private, max-age=3600',
    }),
  );
}

/** URL de lecture signée, à durée limitée. Retourne null si non configuré. */
export async function getImageSignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  // Photos de démonstration : la clé est déjà une URL publique, pas un objet du bucket.
  if (/^(https?:)?\/\//.test(key) || key.startsWith('/')) return key;
  const config = readStorageConfig();
  if (!config || !key) return null;
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(getClient(config), command, { expiresIn: expiresInSeconds });
}

export async function deleteImageObject(key: string): Promise<void> {
  const config = readStorageConfig();
  if (!config || !key) return;
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
