/**
 * P4.10, tests de bout en bout du back-office catalogue.
 *
 * Parcours couverts :
 * - accès protégé : un visiteur non connecté est renvoyé vers /connexion ;
 * - connexion administrateur ;
 * - création, publication et suppression d'une catégorie et d'une prestation ;
 * - visibilité de la prestation publiée sur le site public ;
 * - enregistrement et persistance des règles de compatibilité ;
 * - ajout d'une question capillaire ;
 * - contrôle du débordement horizontal sur mobile.
 *
 * Les identifiants admin sont lus depuis l'environnement (E2E_ADMIN_EMAIL,
 * E2E_ADMIN_PASSWORD). Sans ces variables, les parcours authentifiés sont
 * marqués « non exécutés » au lieu d'échouer silencieusement.
 *
 * Nettoyage : les données créées portent le préfixe « ZZ E2E » et sont
 * supprimées après le test, y compris en cas d'échec.
 */

import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { selectOption } from './helpers/fields';

const stamp = Date.now().toString(36);
const categoryName = `ZZ E2E Catégorie ${stamp}`;
const categorySlug = `zz-e2e-categorie-${stamp}`;
const serviceName = `ZZ E2E Tresses ${stamp}`;
const serviceSlug = `zz-e2e-tresses-${stamp}`;
const questionLabel = 'Quelle est la longueur actuelle de vos cheveux ?';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

function readEnvValue(name: string): string | undefined {
  try {
    const content = readFileSync('.env.local', 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"]*)"?\\s*$`));
      if (match?.[1]) return match[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function cleanupDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = readEnvValue('DATABASE_URL') ?? '';
  }
  if (!process.env.DATABASE_URL) return;

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    await db.service.deleteMany({ where: { slug: { startsWith: 'zz-e2e-' } } });
    await db.category.deleteMany({ where: { slug: { startsWith: 'zz-e2e-' } } });
  } finally {
    await db.$disconnect();
  }
}

async function login(page: Page): Promise<void> {
  await page.goto('/connexion?callbackUrl=/dashboard/catalogue');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Attendre une vraie navigation authentifiée : l'URL de /connexion contient
  // elle aussi « /dashboard » dans son paramètre callbackUrl.
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'));
  await expect(page.getByRole('heading', { name: 'Catalogue', exact: true })).toBeVisible();
}

async function openCategoriesTab(page: Page): Promise<void> {
  await page.goto('/dashboard/catalogue');
  await page.getByRole('tab', { name: /Catégories/ }).click();
}

test.describe('Back-office catalogue', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    await cleanupDatabase();
  });

  test('should redirect an unauthenticated visitor to the login page', async ({ page }) => {
    await page.goto('/dashboard/catalogue');
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.getByRole('heading', { name: 'Espace administrateur' })).toBeVisible();
  });

  test('should create, publish, persist rules and clean up a service', async ({ page }) => {
    test.setTimeout(150_000);
    test.skip(
      ADMIN_EMAIL === '' || ADMIN_PASSWORD === '',
      'E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD absents : parcours authentifié non exécuté.',
    );

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await login(page);

    // ----- Catégorie -----
    await openCategoriesTab(page);
    await page.getByRole('button', { name: 'Nouvelle catégorie' }).click();
    const categoryDialog = page.getByRole('dialog', { name: 'Nouvelle catégorie' });
    await categoryDialog.getByLabel(/^Nom/).fill(categoryName);
    await expect(categoryDialog.getByLabel(/^Slug/)).toHaveValue(categorySlug);
    await categoryDialog.getByRole('button', { name: 'Créer la catégorie' }).click();
    await expect(categoryDialog).toBeHidden();
    await expect(page.getByText(categoryName, { exact: true })).toBeVisible();

    // ----- Prestation -----
    await page.getByRole('tab', { name: /Prestations/ }).click();
    await page.getByRole('link', { name: 'Nouvelle prestation' }).click();
    await page.waitForURL(/\/prestations\/nouvelle$/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard\/catalogue\/prestations\/nouvelle$/);

    await page.getByLabel(/^Nom de la prestation/).fill(serviceName);
    await expect(page.getByLabel(/^Slug/)).toHaveValue(serviceSlug);
    await page
      .getByLabel(/^Description/)
      .fill('Prestation créée par le test de non-régression P4.10.');
    await selectOption(page, /^Catégorie/, { label: categoryName });
    await page.getByLabel(/^Prix \(FCFA\)/).fill('65');
    await page.getByLabel(/^Durée \(minutes\)/).fill('180');
    await page.getByRole('button', { name: 'Créer la prestation' }).click();

    await expect(page).toHaveURL(/\/dashboard\/catalogue\/prestations\/(?!nouvelle$)[^/]+$/, {
      timeout: 30_000,
    });
    const detailUrl = page.url();
    await expect(page.getByRole('heading', { level: 1, name: serviceName })).toBeVisible();

    // ----- Publication et présence publique -----
    await page.getByRole('button', { name: 'Publier' }).click();
    await expect(page.getByText('Statut de la prestation mis à jour.')).toBeVisible();
    await expect(page.getByText('Publié', { exact: true })).toBeVisible();

    await page.goto(`/coiffures?search=${encodeURIComponent(serviceName)}`);
    await expect(page.getByText(serviceName).first()).toBeVisible();

    // ----- Liste admin : recherche et filtre -----
    await page.goto('/dashboard/catalogue');
    await page.getByLabel('Rechercher').fill(serviceName);
    // La recherche est appliquée automatiquement (plus de bouton « Filtrer »).
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByRole('link', { name: serviceName })).toBeVisible();

    // ----- Options payantes -----
    await page.goto(detailUrl);
    await page.getByRole('tab', { name: /Options/ }).click();
    await page.getByRole('button', { name: 'Ajouter une option' }).click();
    const optionDialog = page.getByRole('dialog', { name: 'Nouvelle option' });
    await optionDialog.getByLabel(/^Nom de l'option/).fill('Soin profond');
    await optionDialog.getByLabel(/^Prix \(FCFA\)/).fill('10');
    await optionDialog.getByRole('button', { name: "Ajouter l'option" }).click();
    await expect(optionDialog).toBeHidden();
    await expect(page.getByText('Soin profond', { exact: true })).toBeVisible();

    // ----- Photos (exécuté quand un stockage S3/R2 est configuré) -----
    if (process.env.E2E_UPLOAD === '1') {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      await page.getByRole('tab', { name: /Photos/ }).click();
      const photosPanel = page.getByRole('tabpanel');
      await photosPanel.getByLabel(/^Photo \(JPEG/).setInputFiles({
        name: 'preuve-e2e.png',
        mimeType: 'image/png',
        buffer: png,
      });
      await photosPanel
        .getByLabel(/^Texte alternatif/)
        .fill('Photo de démonstration du test P4.10');
      await page.getByRole('button', { name: 'Envoyer la photo' }).click();
      await expect(page.getByText('Photo ajoutée.')).toBeVisible();
      await expect(photosPanel.getByText('Principale')).toBeVisible();

      const uploadedImage = photosPanel.locator('img').first();
      await expect(uploadedImage).toBeVisible();
      // Attendre la fin réelle du chargement de l'URL signée (le réseau R2
      // n'est pas instantané) avant de vérifier les dimensions natives.
      await expect
        .poll(
          () =>
            uploadedImage.evaluate(
              (element) =>
                (element as HTMLImageElement).complete &&
                (element as HTMLImageElement).naturalWidth > 0,
            ),
          { timeout: 20_000 },
        )
        .toBe(true);
      const naturalWidth = await uploadedImage.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      );
      expect(naturalWidth, "L'URL signée de la photo doit réellement se charger.").toBeGreaterThan(
        0,
      );

      await page.screenshot({
        path: 'tests/e2e/screenshots/dashboard-photos-desktop.png',
        fullPage: true,
        caret: 'initial',
      });

      // Texte alternatif modifiable.
      await photosPanel.getByRole('button', { name: 'Texte alternatif' }).click();
      const altDialog = page.getByRole('dialog', { name: 'Texte alternatif de la photo' });
      await altDialog.getByLabel(/^Texte alternatif/).fill('Photo principale de test P4.10');
      await altDialog.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(altDialog).toBeHidden();
      await expect(photosPanel.getByText('Photo principale de test P4.10')).toBeVisible();

      // Suppression de la photo et du fichier stocké.
      await photosPanel.getByRole('button', { name: 'Supprimer' }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /^(Supprimer|Confirmer)$/ })
        .click();
      await expect(photosPanel.getByText(/Aucune photo/)).toBeVisible();
    }

    // ----- Modification de la prestation -----
    await page.getByRole('tab', { name: 'Informations' }).click();
    await page.getByLabel(/^Prix \(FCFA\)/).fill('70');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Prestation enregistrée.')).toBeVisible();
    await page.reload();
    await expect(page.getByText(/À partir de 70/)).toBeVisible();

    // ----- Règles de compatibilité -----
    await page.getByRole('tab', { name: 'Compatibilité' }).click();
    await page.getByLabel('Cheveux longs').check();
    await page.getByLabel(/Les locs sont incompatibles/).check();
    await selectOption(page, 'Photo de la cliente', { label: 'Photo obligatoire' });
    await page
      .getByLabel('Message si la prestation est incompatible')
      .fill('Cette prestation demande une longueur suffisante.');
    await page.getByRole('button', { name: 'Enregistrer les règles' }).click();
    await expect(page.getByText('Règles de compatibilité enregistrées.')).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: 'Compatibilité' }).click();
    await expect(page.getByLabel('Cheveux longs')).toBeChecked();
    await expect(page.getByLabel(/Les locs sont incompatibles/)).toBeChecked();
    await expect(page.getByLabel('Photo de la cliente')).toContainText('Photo obligatoire');

    // ----- Questions capillaires -----
    await page.getByRole('tab', { name: /Questions/ }).click();
    await page.getByRole('button', { name: 'Ajouter une question' }).click();
    const questionDialog = page.getByRole('dialog', { name: 'Nouvelle question' });
    await questionDialog.getByLabel(/^Clé technique/).fill('longueur_actuelle');
    await questionDialog.getByLabel(/^Question posée/).fill(questionLabel);
    await questionDialog.getByRole('button', { name: 'Ajouter la question' }).click();
    await expect(questionDialog).toBeHidden();
    await expect(page.getByText(questionLabel, { exact: true })).toBeVisible();

    // ----- Captures et contrôle mobile -----
    await page.screenshot({
      path: 'tests/e2e/screenshots/dashboard-prestation-desktop.png',
      fullPage: true,
      caret: 'initial',
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/catalogue');
    await expect(page.getByRole('heading', { name: 'Catalogue', exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'tests/e2e/screenshots/dashboard-catalogue-mobile.png',
      fullPage: true,
      caret: 'initial',
    });

    // ----- Nettoyage par l'interface -----
    await page.goto(detailUrl);
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^(Supprimer|Confirmer)$/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/catalogue$/);

    await openCategoriesTab(page);
    const categoryRow = page.getByRole('listitem').filter({ hasText: categoryName });
    await categoryRow.getByRole('button', { name: 'Supprimer' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^(Supprimer|Confirmer)$/ })
      .click();
    await expect(page.getByText(categoryName, { exact: true })).toBeHidden();

    expect(pageErrors, `Erreurs JavaScript : ${pageErrors.join(' | ')}`).toEqual([]);
    if (consoleErrors.length > 0) {
      console.log(`Erreurs console observées (non bloquantes) : ${consoleErrors.join(' | ')}`);
    }
  });
});
