/**
 * Avis (publication immédiate) et galerie de réalisations.
 *
 * - Public : avis depuis la fiche prestation, moyenne sur la carte et la fiche, avis via lien
 *   e-mail (client vérifié), galerie + visionneuse clavier, section de l'accueil.
 * - Admin : voit chaque avis avec ses détails et le supprime ; ajoute / supprime des réalisations.
 * - Les parcours qui envoient de vraies photos exigent un stockage S3 : ils ne tournent qu'avec le
 *   faux S3 local (`node tests/helpers/mock-s3.mjs`, serveur Next lancé avec S3_ENDPOINT=…,
 *   et E2E_S3_MOCK=1 côté test). Sinon ils sont marqués « non exécutés ».
 *
 * Données de test : préfixe « ZZ E2E », nettoyées avant et après. Les compteurs de rate limit sont
 * vidés avant chaque test (la limite d'envoi d'avis est volontairement basse).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { PrismaClient } from '@prisma/client';

function readEnv(name: string): string {
  if (process.env[name]) return process.env[name] as string;
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"]*)"?\\s*$`));
      if (match?.[1]) return match[1];
    }
  } catch {
    return '';
  }
  return '';
}

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || readEnv('AUTH_ADMIN_EMAIL');
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || readEnv('AUTH_ADMIN_PASSWORD');
const S3_MOCK = process.env.E2E_S3_MOCK === '1';
const PNG = join(process.cwd(), 'public', 'brand', 'logo-mark-og.png');
const stamp = Date.now().toString(36);
const AUTHOR = `ZZ E2E Awa ${stamp}`;

let db: PrismaClient;
let service: { id: string; slug: string; name: string };

async function cleanup() {
  await db.review.deleteMany({
    where: {
      OR: [
        { authorName: { startsWith: 'ZZ E2E' } },
        { service: { slug: { startsWith: 'zz-e2e-avis-' } } },
      ],
    },
  });
  await db.galleryPhoto.deleteMany({ where: { alt: { startsWith: 'ZZ E2E' } } });
  await db.service.deleteMany({ where: { slug: { startsWith: 'zz-e2e-avis-' } } });
}

async function jsonLd(page: Page): Promise<string[]> {
  return page.locator('script[type="application/ld+json"]').allTextContents();
}

async function pickStars(page: Page, value: number) {
  await page
    .locator('label')
    .filter({ hasText: `${value} sur 5` })
    .click();
}

async function submitReview(page: Page, comment: string, stars = 4) {
  await page.goto(`/coiffures/${service.slug}`);
  const form = page.locator('#donner-mon-avis');
  await form.getByLabel('Ton prénom').fill(AUTHOR);
  await pickStars(page, stars);
  await form.getByLabel('Ton commentaire (facultatif)').fill(comment);
  return form;
}

test.beforeAll(async () => {
  process.env.DATABASE_URL ||= readEnv('DATABASE_URL');
  const { PrismaClient: Client } = await import('@prisma/client');
  db = new Client();
  // Prestation dédiée : état vide garanti, et aucun cache de notes hérité d'un autre passage.
  const category = await db.category.findFirst({ where: { active: true }, select: { id: true } });
  if (!category) throw new Error('Aucune catégorie active : lancer prisma/seed.ts.');
  await cleanup();
  service = await db.service.create({
    data: {
      name: `ZZ E2E Prestation ${stamp}`,
      slug: `zz-e2e-avis-${stamp}`,
      categoryId: category.id,
      priceFromCents: 5000,
      priceToCents: 5000,
      durationMinutes: 60,
      status: 'PUBLISHED',
      order: -100,
    },
    select: { id: true, slug: true, name: true },
  });
});

test.afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

test.beforeEach(async () => {
  await db.rateLimitBucket.deleteMany();
});

test.describe('Avis publics', () => {
  test.describe.configure({ mode: 'serial' });

  test('should show an empty state and no rating before any review', async ({ page }) => {
    await page.goto(`/coiffures/${service.slug}`);
    await expect(page.getByRole('heading', { name: 'Avis des clientes' })).toBeVisible();
    await expect(page.getByText('Aucun avis pour cette prestation')).toBeVisible();
    await expect(page.getByTestId('rating-summary')).toHaveCount(0);
    expect((await jsonLd(page)).filter((text) => text.includes('AggregateRating'))).toHaveLength(0);
  });

  test('should require a rating and publish a review immediately', async ({ page }) => {
    await page.goto(`/coiffures/${service.slug}`);
    const form = page.locator('#donner-mon-avis');
    // Note obligatoire : sans étoile choisie, le navigateur bloque l'envoi.
    await form.getByLabel('Ton prénom').fill(AUTHOR);
    await form.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(form.getByRole('status')).toHaveCount(0);

    await pickStars(page, 4);
    await form
      .getByLabel('Ton commentaire (facultatif)')
      .fill('Très belle coiffure <b>vraiment</b>');
    await form.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(form.getByRole('status')).toContainText('déjà visible');

    await page.goto(`/coiffures/${service.slug}`);
    const item = page.getByRole('article').filter({ hasText: 'Très belle coiffure' });
    await expect(item).toBeVisible();
    // Texte sans HTML, nom raccourci (prénom + initiale).
    await expect(item).toContainText('Très belle coiffure vraiment');
    await expect(item).not.toContainText('<b>');
    await expect(item).toContainText('ZZ');
    await expect(item).not.toContainText('Client vérifié');
    await expect(page.getByTestId('rating-summary')).toContainText('4,0');
    await expect(page.getByTestId('rating-summary')).toContainText('1 avis');
    expect((await jsonLd(page)).filter((text) => text.includes('AggregateRating'))).toHaveLength(1);
  });

  test('should display the average on the catalogue card', async ({ page }) => {
    await page.goto(`/coiffures?search=${encodeURIComponent(service.name)}`);
    const card = page
      .getByRole('article')
      .filter({ has: page.getByRole('link', { name: service.name }) });
    await expect(card.first()).toContainText('4,0');
    await expect(card.first()).toContainText('1 avis');
  });

  test('should silently drop a honeypot submission and rate-limit abuse', async ({ page }) => {
    const form = await submitReview(page, 'Spam', 5);
    await form.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = 'http://spam.example';
    });
    await form.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(form.getByRole('status')).toBeVisible();
    expect(await db.review.count({ where: { comment: 'Spam' } })).toBe(0);
  });

  test('should limit repeated reviews on the same service', async ({ page }) => {
    // 2 avis par jour et par IP sur une même prestation : le 3e est refusé, avec un message clair.
    for (const comment of ['Limite 1', 'Limite 2']) {
      const form = await submitReview(page, comment, 5);
      await form.getByRole('button', { name: 'Publier mon avis' }).click();
      await expect(form.getByRole('status')).toBeVisible();
    }
    const third = await submitReview(page, 'Limite 3', 5);
    await third.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(third.getByRole('alert')).toContainText('déjà donné ton avis');
    expect(await db.review.count({ where: { comment: 'Limite 3' } })).toBe(0);
  });

  test('should mark a review sent through the e-mail link as verified', async ({ page }) => {
    const token = `zz-e2e-token-${stamp}`;
    await db.review.create({
      data: {
        serviceId: service.id,
        authorName: `ZZ E2E Fatou ${stamp}`,
        token,
        tokenExpiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await page.goto(`/avis/${token}`);
    await expect(page.getByRole('heading', { name: /Ton avis sur/ })).toBeVisible();
    await expect(page.getByLabel('Ton prénom')).toHaveCount(0);
    await pickStars(page, 5);
    await page.getByLabel('Ton commentaire (facultatif)').fill('Parfait, merci');
    await page.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(page.getByRole('status')).toContainText('déjà visible');

    // Lien à usage unique.
    await page.goto(`/avis/${token}`);
    await expect(page.getByRole('heading', { name: 'Avis déjà envoyé' })).toBeVisible();

    await page.goto(`/coiffures/${service.slug}`);
    await expect(
      page.getByRole('article').filter({ hasText: 'Parfait, merci' }).getByText('Client vérifié'),
    ).toBeVisible();
  });

  test('should attach photos to a review', async ({ page }) => {
    test.skip(!S3_MOCK, 'Faux S3 absent (E2E_S3_MOCK=1) : envoi de photos non exécuté.');
    const form = await submitReview(page, 'Avec photo', 5);
    await form.locator('input[name="photos"]').setInputFiles(PNG);
    await expect(form.getByAltText('Aperçu de la photo 1')).toBeVisible();
    await form.getByRole('button', { name: 'Publier mon avis' }).click();
    await expect(form.getByRole('status')).toBeVisible();
    await page.goto(`/coiffures/${service.slug}`);
    const item = page.getByRole('article').filter({ hasText: 'Avec photo' });
    await item.getByRole('button', { name: /Agrandir la photo 1/ }).click();
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
  });

  test('should not overflow horizontally on the product page', async ({ page }) => {
    await page.goto(`/coiffures/${service.slug}`);
    await expect(page.getByRole('heading', { name: 'Avis des clientes' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Galerie publique', () => {
  test.describe.configure({ mode: 'serial' });
  const photos = [1, 2, 3].map((n) => ({
    key: '/brand/logo-mark-og.png',
    alt: `ZZ E2E Réalisation ${n} ${stamp}`,
    order: -10 + n,
  }));

  test('should hide the home section and show an empty state without photos', async ({ page }) => {
    test.skip((await db.galleryPhoto.count()) > 0, 'Des photos réelles existent déjà.');
    await page.goto('/');
    await expect(page.locator('#realisations')).toHaveCount(0);
    await page.goto('/galerie');
    await expect(page.getByText('Les réalisations arrivent bientôt')).toBeVisible();
  });

  test('should list the photos and drive the lightbox with the keyboard', async ({ page }) => {
    await db.galleryPhoto.createMany({ data: photos });
    await page.goto('/');
    await expect(page.locator('#realisations')).toBeVisible();
    await expect(page.locator('#realisations').getByRole('button')).not.toHaveCount(0);

    await page.goto('/galerie');
    const first = page.getByRole('button', { name: `Agrandir : ${photos[0]!.alt}` });
    await first.focus();
    await page.keyboard.press('Enter');
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText('Photo 1 sur', { exact: false })).toBeAttached();
    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByRole('img', { name: photos[1]!.alt })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('should not overflow horizontally', async ({ page }) => {
    await page.goto('/galerie');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Dashboard avis et galerie', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(ADMIN_EMAIL === '' || ADMIN_PASSWORD === '', 'Identifiants admin absents.');

  let admin: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'Parcours admin exécuté sur desktop uniquement (limite de connexions).',
    );
    await db.rateLimitBucket.deleteMany();
    admin = await (await browser.newContext({ timezoneId: 'Europe/Berlin' })).newPage();
    await admin.goto('/connexion?callbackUrl=/dashboard/avis');
    await admin.getByLabel('E-mail').fill(ADMIN_EMAIL);
    await admin.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await admin.getByRole('button', { name: 'Se connecter' }).click();
    await admin.waitForURL((url) => url.pathname.startsWith('/dashboard'));
  });

  test.afterAll(async () => {
    await admin?.context().close();
  });

  test('should show every detail of a review and delete it after confirmation', async () => {
    await db.review.create({
      data: {
        serviceId: service.id,
        authorName: `ZZ E2E Dashboard ${stamp}`,
        rating: 2,
        comment: 'Commentaire visible par admin',
        submittedAt: new Date(),
        photos: { create: [{ key: '/brand/logo-mark-og.png', order: 0 }] },
      },
    });
    await admin.goto('/dashboard/avis');
    const card = admin.getByRole('listitem').filter({ hasText: `ZZ E2E Dashboard ${stamp}` });
    await expect(card).toContainText('2 / 5');
    await expect(card).toContainText('Commentaire visible par admin');
    await expect(card).toContainText(service.name);
    await expect(card).toContainText('Avis libre');
    await expect(card.getByRole('button', { name: /Agrandir la photo 1/ })).toBeVisible();
    // Plus de modération : ni approuver ni rejeter.
    await expect(admin.getByRole('button', { name: /Approuver|Rejeter|Republier/ })).toHaveCount(0);

    await card.getByRole('button', { name: 'Supprimer' }).click();
    const dialog = admin.getByRole('dialog');
    await expect(dialog).toContainText('Supprimer cet avis ?');
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Supprimer' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(card).toHaveCount(0);
    expect(await db.review.count({ where: { authorName: `ZZ E2E Dashboard ${stamp}` } })).toBe(0);
  });

  test('should add a realisation from the dashboard and remove it', async () => {
    test.skip(!S3_MOCK, 'Faux S3 absent (E2E_S3_MOCK=1) : envoi de photos non exécuté.');
    await admin.goto('/dashboard/galerie');
    await admin.getByRole('button', { name: 'Ajouter des photos' }).first().click();
    const dialog = admin.getByRole('dialog');
    await dialog.locator('#gallery-file').setInputFiles(PNG);
    await dialog.getByLabel('Légende (facultatif)').fill(`ZZ E2E Upload ${stamp}`);
    await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
    const tile = admin.getByRole('listitem').filter({ hasText: `ZZ E2E Upload ${stamp}` });
    await expect(tile).toBeVisible();
    await expect(tile).toContainText('Visible');
    expect(await db.galleryPhoto.count({ where: { alt: `ZZ E2E Upload ${stamp}` } })).toBe(1);

    await tile.getByRole('button', { name: 'Supprimer' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(tile).toHaveCount(0);
  });

  test('should hide a realisation from the public page', async ({ page }) => {
    const photo = await db.galleryPhoto.create({
      data: { key: '/brand/logo-mark-og.png', alt: `ZZ E2E Masquable ${stamp}` },
    });
    await admin.goto('/dashboard/galerie');
    const tile = admin.getByRole('listitem').filter({ hasText: photo.alt });
    await tile.getByRole('button', { name: 'Masquer' }).click();
    await expect(tile).toContainText('Masquée');
    expect((await db.galleryPhoto.findUniqueOrThrow({ where: { id: photo.id } })).published).toBe(
      false,
    );
    await page.goto('/galerie');
    await expect(page.getByRole('button', { name: `Agrandir : ${photo.alt}` })).toHaveCount(0);
  });
});
