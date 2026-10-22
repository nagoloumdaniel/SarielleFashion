/**
 * P5.9, tests de bout en bout du parcours de compatibilité.
 *
 * Couvre les scénarios §5.3, §5.4 et §5.5 :
 * - cheveux courts bloqués par une règle configurée, message dédié ;
 * - question conditionnelle affichée uniquement quand utile ;
 * - cas « Je ne suis pas sûr(e) » avec demande d'évaluation ;
 * - photo privée stockée puis consultée dans le dashboard ;
 * - décision de Patricia sans création de réservation ;
 * - prestation sans photo possible : demande bloquée sans évaluation.
 *
 * Les données de test sont créées en base avec le préfixe « ZZ E2E »
 * puis supprimées, photos R2 comprises.
 */

import { readFileSync } from 'node:fs';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { test, expect, type Page } from '@playwright/test';
import type { PrismaClient } from '@prisma/client';
import { selectOption } from './helpers/fields';

const stamp = Date.now().toString(36);
const categorySlug = `zz-e2e-compat-categorie-${stamp}`;
const categoryName = `ZZ E2E Compat Catégorie ${stamp}`;
const serviceSlug = `zz-e2e-compat-${stamp}`;
const serviceName = `ZZ E2E Compatibilité ${stamp}`;
const blockedServiceSlug = `zz-e2e-compat-bloque-${stamp}`;
const customerEmail = `zz-e2e-compat-${stamp}@example.com`;
const unsureEmail = `zz-e2e-compat-unsure-${stamp}@example.com`;
const questionLabel = 'Quel est l’état de vos cheveux ?';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

interface Env {
  DATABASE_URL?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
}

function readEnv(): Env {
  const env: Env = {};
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
      if (match?.[1]) env[match[1] as keyof Env] = match[2];
    }
  } catch {
    return env;
  }
  return env;
}

const env = readEnv();
if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;

let db: PrismaClient;
let serviceId = '';
let blockedServiceId = '';
let categoryId = '';
let ruleId = '';
let questionId = '';
let assessmentId = '';
let unsureAssessmentId = '';
let storedPhotoKeys: string[] = [];

async function cleanup(): Promise<void> {
  if (!db) return;
  const assessments = await db.hairAssessment.findMany({
    where: { serviceId: { in: [serviceId, blockedServiceId].filter(Boolean) } },
    select: { id: true, photoKeys: true },
  });
  const photoKeys = assessments.flatMap((assessment) => assessment.photoKeys);
  const assessmentIds = assessments.map((assessment) => assessment.id);

  if (photoKeys.length > 0 && env.S3_ENDPOINT && env.S3_BUCKET) {
    const client = new S3Client({
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
    for (const key of photoKeys) {
      await client
        .send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
        .catch(() => undefined);
    }
  }

  if (assessmentIds.length > 0) {
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'HairAssessment', entityId: { in: assessmentIds } },
          {
            entityType: 'Service',
            entityId: { in: [serviceId, blockedServiceId].filter(Boolean) },
          },
        ],
      },
    });
  }
  if (serviceId || blockedServiceId) {
    await db.service.deleteMany({
      where: { id: { in: [serviceId, blockedServiceId].filter(Boolean) } },
    });
  }
  if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
  await db.customer.deleteMany({
    where: { email: { startsWith: 'zz-e2e-compat-' } },
  });
  await db.$disconnect();
}

async function login(page: Page): Promise<void> {
  await page.goto('/connexion?callbackUrl=/dashboard/evaluations');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
  await expect(page.getByRole('heading', { name: 'Évaluations capillaires' })).toBeVisible();
}

async function fillContact(page: Page, email: string, withPhoto: boolean): Promise<void> {
  await page.getByLabel('Nom et prénom').fill('Amina Test E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Téléphone').fill('06 12 34 56 78');
  await page
    .getByLabel(/^Informations complémentaires/)
    .fill('Mes cheveux sont fins et cassants sur les pointes.');
  if (withPhoto) {
    await page.getByLabel(/^Photos de vos cheveux/).setInputFiles({
      name: 'evaluation-e2e.png',
      mimeType: 'image/png',
      buffer: png,
    });
  }
  await page.getByLabel(/J’accepte/).check();
}

test.describe('Compatibilité capillaire', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const { PrismaClient: Client } = await import('@prisma/client');
    db = new Client();

    const category = await db.category.create({
      data: { name: categoryName, slug: categorySlug, order: 99, active: true },
    });
    categoryId = category.id;

    const service = await db.service.create({
      data: {
        name: serviceName,
        slug: serviceSlug,
        description: 'Prestation de test P5.9.',
        categoryId: category.id,
        priceFromCents: 5000,
        priceToCents: 7000,
        durationMinutes: 120,
        status: 'PUBLISHED',
        compatibility: {
          create: {
            acceptedLengths: ['LONG', 'VERY_LONG'],
            acceptedHairTypes: [],
            requiresLocs: false,
            incompatibleLocs: true,
            photoPolicy: 'OPTIONAL',
            autoApprove: false,
            conditionsNote: 'Prévoir un soin hydratant avant la pose.',
            incompatibleMessage: 'Message E2E incompatible.',
            uncertainMessage: 'Message E2E incertain.',
          },
        },
        questions: {
          create: {
            key: 'etat_cheveux',
            label: questionLabel,
            type: 'SINGLE_CHOICE',
            options: ['Sains', 'Abîmés'],
            required: true,
            active: true,
            order: 0,
            condition: { dependsOn: 'has_locs', equals: 'NO' },
          },
        },
      },
    });
    serviceId = service.id;

    const blockedService = await db.service.create({
      data: {
        name: `${serviceName} bloquée`,
        slug: blockedServiceSlug,
        categoryId: category.id,
        priceFromCents: 4000,
        durationMinutes: 90,
        status: 'PUBLISHED',
        compatibility: {
          create: {
            acceptedLengths: ['LONG'],
            requiresLocs: false,
            incompatibleLocs: false,
            photoPolicy: 'FORBIDDEN',
            autoApprove: true,
            incompatibleMessage: 'Message E2E bloqué.',
          },
        },
      },
    });
    blockedServiceId = blockedService.id;

    const rule = await db.compatibilityRule.findUnique({ where: { serviceId } });
    ruleId = rule?.id ?? '';
    const question = await db.questionDefinition.findFirst({ where: { serviceId } });
    questionId = question?.id ?? '';
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('should block short hair, ask only useful questions and store a private photo', async ({
    page,
  }) => {
    await page.goto(`/compatibilite?service=${serviceSlug}`);
    await expect(
      page.getByRole('heading', { name: 'Votre coiffure est-elle compatible ?' }),
    ).toBeVisible();

    // La question personnalisée est conditionnée par la réponse sur les locs.
    await expect(page.getByText(questionLabel)).toHaveCount(0);

    await page.getByLabel('Cheveux courts').check();
    await page.getByLabel('Non, je ne porte pas de locs').check();
    await expect(page.getByText(questionLabel)).toBeVisible();
    await page.getByLabel('Abîmés').check();

    await page.screenshot({
      path: 'tests/e2e/screenshots/compatibilite-questions-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.getByRole('button', { name: 'Vérifier ma compatibilité' }).click();
    await expect(page.getByText('Incompatible', { exact: true })).toBeVisible();
    await expect(page.getByText('Message E2E incompatible.')).toBeVisible();

    await page.getByRole('button', { name: 'Envoyer une photo pour évaluation' }).click();
    await expect(page.getByRole('heading', { name: /Demander l’évaluation/ })).toBeVisible();
    await fillContact(page, customerEmail, true);

    await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
    await expect(
      page.getByRole('heading', { name: 'Votre demande a bien été transmise' }),
    ).toBeVisible();
    await expect(page.getByText(/Statut :/)).toContainText('en attente d’évaluation');
    await expect(page.getByText(/Référence de votre demande/)).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/screenshots/compatibilite-demande-envoyee-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    const assessment = await db.hairAssessment.findFirst({
      where: { serviceId, customer: { email: customerEmail } },
      include: { customer: true },
    });
    expect(assessment).not.toBeNull();
    assessmentId = assessment?.id ?? '';
    storedPhotoKeys = assessment?.photoKeys ?? [];
    expect(assessment?.status).toBe('RECEIVED');
    expect(storedPhotoKeys).toHaveLength(1);
    expect(storedPhotoKeys[0]).toMatch(/^assessments\//);
    const answers = assessment?.answers as Record<string, unknown>;
    expect(answers.hair_length).toBe('SHORT');
    expect(answers.has_locs).toBe('NO');
    expect(answers.etat_cheveux).toBe('Abîmés');
    expect(assessment?.customer?.email).toBe(customerEmail);
  });

  test('should let Patricia accept the assessment without creating an appointment', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');
    test.setTimeout(120_000);

    await login(page);
    await page.goto(`/dashboard/evaluations/${assessmentId}`);
    await expect(page.getByText('Reçue', { exact: true })).toBeVisible();

    const photo = page.locator('img[alt^="Photo capillaire"]').first();
    await expect(photo).toBeVisible();
    await expect
      .poll(
        () =>
          photo.evaluate(
            (element) =>
              (element as HTMLImageElement).complete &&
              (element as HTMLImageElement).naturalWidth > 0,
          ),
        { timeout: 20_000 },
      )
      .toBe(true);

    await selectOption(page, 'Décision', { label: 'Accepter la compatibilité' });
    await page
      .getByLabel(/^Message pour la cliente/)
      .fill('Vos cheveux sont compatibles, vous pouvez réserver un créneau.');
    await page.getByLabel(/^Note interne/).fill('Vérifié sur photo E2E.');
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Accepter', exact: true }).click();

    await expect(page.getByText('Acceptée', { exact: true })).toBeVisible();

    const assessment = await db.hairAssessment.findUnique({ where: { id: assessmentId } });
    expect(assessment?.status).toBe('ACCEPTED');
    expect(assessment?.decisionMessage).toContain('compatibles');
    expect(assessment?.decidedAt).not.toBeNull();
    expect(assessment?.decidedById).not.toBeNull();

    // Règle d'or P5.7 : aucune réservation n'est créée par la décision.
    const appointments = await db.appointment.count({
      where: { serviceId, customer: { email: customerEmail } },
    });
    expect(appointments).toBe(0);

    await page.screenshot({
      path: 'tests/e2e/screenshots/evaluation-dashboard-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
  });

  test('should handle the “I am not sure” case with an evaluation request', async ({ page }) => {
    await page.goto(`/compatibilite?service=${serviceSlug}`);
    await page
      .getByRole('group', { name: /longueur actuelle/ })
      .getByLabel('Je ne suis pas sûr(e)')
      .check();
    await page.getByLabel('Non, je ne porte pas de locs').check();
    await page.getByLabel('Sains').check();
    await page.getByRole('button', { name: 'Vérifier ma compatibilité' }).click();

    await expect(page.getByText('À vérifier', { exact: true })).toBeVisible();
    await expect(page.getByText('Message E2E incertain.')).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer une photo pour évaluation' }).click();
    await fillContact(page, unsureEmail, false);
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
    await expect(
      page.getByRole('heading', { name: 'Votre demande a bien été transmise' }),
    ).toBeVisible();

    const assessment = await db.hairAssessment.findFirst({
      where: { serviceId, customer: { email: unsureEmail } },
    });
    expect(assessment).not.toBeNull();
    unsureAssessmentId = assessment?.id ?? '';
    expect(assessment?.status).toBe('RECEIVED');
    expect(assessment?.photoKeys).toHaveLength(0);
    const answers = assessment?.answers as Record<string, unknown>;
    expect(answers.hair_length).toBe('UNSURE');
  });

  test('should block without offering a photo when the policy forbids it', async ({ page }) => {
    await page.goto(`/compatibilite?service=${blockedServiceSlug}`);
    await page.getByLabel('Cheveux courts').check();
    await page.getByRole('button', { name: 'Vérifier ma compatibilité' }).click();

    await expect(page.getByText('Incompatible', { exact: true })).toBeVisible();
    await expect(page.getByText('Message E2E bloqué.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voir les autres coiffures' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Envoyer une photo pour évaluation/ }),
    ).toHaveCount(0);
  });

  test('should render the public and dashboard views on mobile without overflow', async ({
    page,
  }) => {
    test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/compatibilite?service=${serviceSlug}`);
    await page.getByLabel('Cheveux courts').check();
    await page.getByLabel('Non, je ne porte pas de locs').check();
    const publicOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(publicOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/compatibilite-mobile.png',
      fullPage: true,
      caret: 'initial',
    });

    await login(page);
    await page.goto('/dashboard/evaluations');
    await expect(page.getByRole('heading', { name: 'Évaluations capillaires' })).toBeVisible();
    const dashboardOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(dashboardOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/evaluations-mobile.png',
      fullPage: true,
      caret: 'initial',
    });
  });

  // Variables conservées pour le nettoyage et la lisibilité des rapports.
  test('should have created only fixture data', async () => {
    expect(serviceId).not.toBe('');
    expect(ruleId).not.toBe('');
    expect(questionId).not.toBe('');
    expect(unsureAssessmentId).not.toBe('');
    expect(storedPhotoKeys.every((key) => key.startsWith('assessments/'))).toBe(true);
  });
});
