/**
 * Recette de la refonte du dashboard, STRICTEMENT LECTURE SEULE.
 *
 * - Toute requête non GET/HEAD est avortée au niveau du contexte (aucune mutation possible,
 *   y compris les server actions) et consignée dans `blockedMutations`.
 * - Aucun formulaire n'est soumis ; les modales sont ouvertes puis fermées sans valider.
 * - Identifiants lus dans .env.local (AUTH_ADMIN_*) ou E2E_ADMIN_* ; jamais affichés.
 *
 * Résultats détaillés : JSON + captures dans E2E_OUT (dossier scratchpad).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

const OUT = process.env.E2E_OUT ?? join(process.cwd(), 'test-results', 'dashboard-refonte');

function readEnv(name: string): string {
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

const LIST_ROUTES = [
  '/dashboard',
  '/dashboard/calendrier',
  '/dashboard/catalogue',
  '/dashboard/catalogue/prestations/nouvelle',
  '/dashboard/disponibilites',
  '/dashboard/historique',
  '/dashboard/evaluations',
  '/dashboard/reservations',
  '/dashboard/demandes',
  '/dashboard/clients',
  '/dashboard/liste-attente',
  '/dashboard/avis',
  '/dashboard/galerie',
  '/dashboard/promotions',
  '/dashboard/statistiques',
  '/dashboard/parametres',
  '/dashboard/messages',
  '/dashboard/notifications',
];

/* Fiches détail : liste d'où l'on tire le premier lien + motif du lien. */
const DETAIL_SOURCES: Array<{ list: string; re: RegExp }> = [
  {
    list: '/dashboard/catalogue',
    re: /^\/dashboard\/catalogue\/prestations\/(?!nouvelle)[^/?#]+$/,
  },
  { list: '/dashboard/reservations', re: /^\/dashboard\/reservations\/[^/?#]+$/ },
  { list: '/dashboard/demandes', re: /^\/dashboard\/demandes\/[^/?#]+$/ },
  { list: '/dashboard/evaluations', re: /^\/dashboard\/evaluations\/[^/?#]+$/ },
  { list: '/dashboard/clients', re: /^\/dashboard\/clients\/[^/?#]+$/ },
  { list: '/dashboard/messages', re: /^\/dashboard\/messages\/[^/?#]+$/ },
];

const hrefsFile = join(OUT, 'hrefs.json');
const detailHrefs = {
  get(key: string): string | undefined {
    try {
      return (JSON.parse(readFileSync(hrefsFile, 'utf8')) as Record<string, string>)[key];
    } catch {
      return undefined;
    }
  },
  set(key: string, value: string): void {
    let all: Record<string, string> = {};
    try {
      all = JSON.parse(readFileSync(hrefsFile, 'utf8')) as Record<string, string>;
    } catch {
      /* premier enregistrement */
    }
    all[key] = value;
    writeFileSync(hrefsFile, JSON.stringify(all));
  },
};
const authFile = join(OUT, 'auth.json');

type Issue = string;

function slug(route: string): string {
  return route.replace(/^\/dashboard\/?/, '').replace(/[^a-z0-9]+/gi, '_') || 'accueil';
}

async function login(page: Page): Promise<void> {
  try {
    await page.goto('/connexion?callbackUrl=/dashboard');
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), { timeout: 30_000 });
  } catch {
    // Message volontairement générique : ne jamais relayer les identifiants dans les logs.
    throw new Error('Connexion admin impossible (identifiants absents ou refusés).');
  }
}

/* Aucune mutation : tout sauf GET/HEAD est avorté et consigné. */
async function blockMutations(context: BrowserContext, blocked: string[]): Promise<void> {
  await context.route('**/*', (route) => {
    const method = route.request().method();
    if (method === 'GET' || method === 'HEAD') return route.continue();
    // Exception lecture : le calendrier charge ses rendez-vous via une server action
    // (loadCalendarData, requête en lecture seule : champs view / dateISO / timeZone uniquement).
    const body = route.request().postData() ?? '';
    const names = Array.from(body.matchAll(/name="([^"]*)"/g), (m) => m[1]!);
    if (
      new URL(route.request().url()).pathname === '/dashboard/calendrier' &&
      names.some((n) => /(^|_)timeZone$/.test(n)) &&
      names.some((n) => /(^|_)view$/.test(n)) &&
      names.every((n) => /^(_?\d+_)?(timeZone|view|dateISO)$|^_?\d+$|\$ACTION/.test(n))
    ) {
      return route.continue();
    }
    blocked.push(
      `${method} ${new URL(route.request().url()).pathname}${process.env.E2E_DEBUG ? ` ct=${route.request().headers()['content-type']?.slice(0, 40)} body=${body.slice(0, 160).replace(/\s+/g, ' ')}` : ''}`,
    );
    return route.abort('blockedbyclient');
  });
}

/* ----- mesures exécutées dans la page ----- */

const SELECTOR_FN = `
  (el) => {
    const cls = (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).slice(0, 3).join('.');
    const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (txt ? ' «' + txt + '»' : '');
  }`;

async function measureHeights(page: Page) {
  return page.evaluate(`(() => {
    const sel = ${SELECTOR_FN};
    const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const okH = (h) => [36, 40, 44].some((v) => Math.abs(h - v) <= 1);
    const buttons = Array.from(document.querySelectorAll('main a, main button, header a, header button')).filter((e) => {
      const c = e.getAttribute('class') || '';
      return c.includes('whitespace-nowrap') && c.includes('font-semibold') && c.includes('justify-center');
    });
    const fields = Array.from(document.querySelectorAll('main input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]):not([type=range]), main select, main [role=combobox], main button[aria-haspopup=listbox]'));
    const bad = [];
    let nb = 0, nf = 0;
    for (const e of buttons) { if (!visible(e)) continue; nb++; const h = e.getBoundingClientRect().height; if (!okH(h)) bad.push('bouton ' + h.toFixed(1) + 'px ' + sel(e)); }
    for (const e of fields) { if (!visible(e)) continue; nf++; const h = e.getBoundingClientRect().height; if (!okH(h)) bad.push('champ ' + h.toFixed(1) + 'px ' + sel(e)); }
    return { nb, nf, bad };
  })()`) as Promise<{ nb: number; nf: number; bad: string[] }>;
}

async function measureMisc(page: Page, isMobile: boolean) {
  return page.evaluate(
    `((isMobile) => {
    const sel = ${SELECTOR_FN};
    const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const de = document.documentElement;
    // Sur mobile, un contenu trop large fait grandir la fenêtre de mise en page (innerWidth > largeur écran) :
    // on compare donc aussi à la largeur réelle de l'écran émulé.
    const W = isMobile ? Math.min(screen.width, window.innerWidth) : window.innerWidth;
    const overflow = Math.max(de.scrollWidth - window.innerWidth, window.innerWidth - W, de.scrollWidth - W);
    const offenders = [];
    if (overflow > 0) {
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > W + 1 && offenders.length < 4) offenders.push(sel(e) + ' right=' + Math.round(r.right) + ' (écran ' + W + ')');
      }
    }
    const main = document.querySelector('main');
    const ms = main ? getComputedStyle(main) : null;
    const forbidden = Array.from(document.querySelectorAll('main a, main button')).filter((e) => /^(voir plus|voir|détails?|voir le détail|voir la fiche|voir détails?)$/i.test((e.textContent || '').trim().replace(/\\s+/g, ' ')) || /voir plus/i.test(e.textContent || '')).map(sel);
    const themeToggles = Array.from(document.querySelectorAll('button, a, [role=switch]')).filter((e) => /th[èe]me|mode (sombre|clair)|dark mode/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + (e.textContent || ''))).map(sel);
    const aside = document.querySelector('aside');
    const adminText = !!aside && /administration/i.test(aside.textContent || '');
    const iconNoName = Array.from(document.querySelectorAll('main a, main button, header a, header button')).filter((e) => {
      if (!visible(e)) return false;
      const vis = (e.innerText || '').trim();
      if (vis) return false;
      const name = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || '').trim();
      return !name;
    }).map(sel);
    const iconOnlyNoTitle = isMobile ? Array.from(document.querySelectorAll('main a, main button')).filter((e) => {
      if (!visible(e)) return false;
      if ((e.innerText || '').trim()) return false;
      return !(e.getAttribute('aria-label') || e.getAttribute('title'));
    }).map(sel) : [];
    return {
      overflow, offenders,
      theme: de.getAttribute('data-theme'),
      padL: ms ? parseFloat(ms.paddingLeft) : null,
      padR: ms ? parseFloat(ms.paddingRight) : null,
      forbidden, themeToggles, adminText, iconNoName, iconOnlyNoTitle,
      h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 60),
    };
  })(${isMobile})`,
  ) as Promise<{
    overflow: number;
    offenders: string[];
    theme: string | null;
    padL: number | null;
    padR: number | null;
    forbidden: string[];
    themeToggles: string[];
    adminText: boolean;
    iconNoName: string[];
    iconOnlyNoTitle: string[];
    h1: string;
  }>;
}

async function measurePerf(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ ttfb: number; dcl: number; load: number; lcp: number | null }>((resolve) => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        let lcp: number | null = null;
        try {
          new PerformanceObserver((list) => {
            const e = list.getEntries();
            lcp = e[e.length - 1]!.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          /* LCP non supporté */
        }
        setTimeout(
          () =>
            resolve({
              ttfb: Math.round(nav.responseStart),
              dcl: Math.round(nav.domContentLoadedEventEnd),
              load: Math.round(nav.loadEventEnd),
              lcp: lcp === null ? null : Math.round(lcp),
            }),
          300,
        );
      }),
  );
}

/* ----- modales ----- */

async function bodyOverflow(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).overflow);
}

/* Ouvre `trigger`, vérifie ✕, flou, verrou de scroll, Échap, clic sur le fond, retour du focus.
   Ne valide jamais rien. `label` identifie le déclencheur dans le rapport. */
async function checkModal(page: Page, trigger: Locator, label: string, issues: Issue[]) {
  const dialog = page.locator('[role="dialog"]').last();
  const tag = (m: string) => issues.push(`modale «${label}» : ${m}`);
  const isTrigger = (): Promise<boolean> =>
    trigger.evaluate((el) => el === document.activeElement).catch(() => false);

  await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
  await trigger.click({ timeout: 5000 });
  try {
    await dialog.waitFor({ state: 'visible', timeout: 2500 });
  } catch {
    return false; // ne s'ouvre pas en modale : pas une modale
  }

  if ((await dialog.getByRole('button', { name: 'Fermer' }).count()) < 1)
    tag('bouton ✕ « Fermer » absent');
  const blur = await dialog.evaluate((d) => {
    const bg = d.parentElement ? getComputedStyle(d.parentElement) : null;
    return bg
      ? bg.backdropFilter ||
          (bg as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter
      : 'none';
  });
  if (!blur || blur === 'none') tag(`fond non flouté (backdrop-filter=${blur})`);
  if ((await bodyOverflow(page)) !== 'hidden') tag('body overflow != hidden pendant l’ouverture');

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => tag('Échap ne ferme pas'));
  if ((await bodyOverflow(page)) === 'hidden') tag('body overflow reste hidden après fermeture');
  if (!(await isTrigger())) tag('focus non rendu au déclencheur après Échap');

  // Clic sur le fond
  await trigger.click({ timeout: 5000 });
  await dialog.waitFor({ state: 'visible', timeout: 2500 });
  await page.mouse.click(4, 4);
  await dialog.waitFor({ state: 'hidden', timeout: 1500 }).catch(async () => {
    tag('clic sur le fond ne ferme pas');
    await page.keyboard.press('Escape');
  });

  // ✕ + focus
  await trigger.click({ timeout: 5000 });
  await dialog.waitFor({ state: 'visible', timeout: 2500 });
  await dialog.getByRole('button', { name: 'Fermer' }).first().click();
  await dialog.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => tag('✕ ne ferme pas'));
  if (!(await isTrigger())) tag('focus non rendu au déclencheur après ✕');
  return true;
}

/* Marque dans le DOM les déclencheurs candidats (lecture : jamais type=submit). */
async function findTriggers(
  page: Page,
  re: string,
  max: number,
): Promise<Array<{ idx: string; name: string }>> {
  return page.evaluate(
    ({ re, max }) => {
      const rx = new RegExp(re, 'i');
      const out: Array<{ idx: string; name: string }> = [];
      const seen = new Set<string>();
      const nodes = Array.from(
        document.querySelectorAll<HTMLButtonElement>('main button, header button'),
      );
      for (const b of nodes) {
        if (b.getAttribute('type') === 'submit' || b.closest('form') || b.disabled) continue;
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (b.closest('[role=dialog]')) continue;
        const name = (
          b.getAttribute('aria-label') ||
          b.getAttribute('title') ||
          b.textContent ||
          ''
        )
          .trim()
          .replace(/\s+/g, ' ');
        if (
          !name ||
          !rx.test(name) ||
          seen.has(name) ||
          /déconnect|enregistrer|envoyer|valider/i.test(name)
        )
          continue;
        seen.add(name);
        const idx = String(out.length);
        b.setAttribute('data-qa-trigger', `${re.length}-${idx}`);
        out.push({ idx: `${re.length}-${idx}`, name });
        if (out.length >= max) break;
      }
      return out;
    },
    { re, max },
  );
}

async function modalSweep(page: Page, issues: Issue[], notes: string[]) {
  // Onglets (ex. Catégories) : on visite chacun, déclencheurs propres à chaque onglet.
  const tabNames = (await page.getByRole('tab').allTextContents()).map((t) => t.trim()).slice(0, 4);
  const tabTargets: Array<string | null> = [null, ...tabNames];
  for (const tabName of tabTargets) {
    if (tabName) {
      const tab = page.getByRole('tab').filter({ hasText: tabName }).first();
      if (
        (await tab.getAttribute('aria-selected', { timeout: 3000 }).catch(() => 'true')) === 'true'
      )
        continue;
      await tab.click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
    const open = await findTriggers(
      page,
      '^(ajouter|nouvel|nouveau|créer|importer|filtres?|modifier|éditer|plus)',
      4,
    );
    for (const t of open) {
      const opened = await checkModal(
        page,
        page.locator(`[data-qa-trigger="${t.idx}"]`),
        t.name,
        issues,
      ).catch((e: Error) => {
        issues.push(`modale «${t.name}» : exception ${e.message.split('\n')[0]}`);
        return false;
      });
      notes.push(`modale ${opened ? 'testée' : 'non ouverte'} : ${t.name}`);
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    const conf = await findTriggers(
      page,
      '(supprimer|archiver|retirer|annuler la|refuser|tout marquer|marquer)',
      2,
    );
    for (const t of conf) {
      const opened = await checkModal(
        page,
        page.locator(`[data-qa-trigger="${t.idx}"]`),
        t.name,
        issues,
      ).catch((e: Error) => {
        issues.push(`confirmation «${t.name}» : exception ${e.message.split('\n')[0]}`);
        return false;
      });
      notes.push(`confirmation ${opened ? 'testée' : 'sans modale'} : ${t.name}`);
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }
}

/* ----- test d'une route ----- */

async function auditRoute(
  page: Page,
  route: string,
  isMobile: boolean,
  projectName: string,
  blocked: string[],
) {
  const issues: Issue[] = [];
  const notes: string[] = [];
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];
  const hydration: string[] = [];
  blocked.length = 0;

  const onConsole = (m: import('@playwright/test').ConsoleMessage) => {
    const t = m.text();
    if (/hydrat|did not match|Minified React error #(418|423|425)/i.test(t))
      hydration.push(t.slice(0, 160));
    // Les requêtes avortées par ce test (mutations bloquées) produisent un échec de chargement : exclus.
    if (
      m.type() === 'error' &&
      !(blocked.length > 0 && /ERR_FAILED|blocked|Failed to fetch/i.test(t))
    ) {
      consoleErrors.push(t.slice(0, 200));
    }
  };
  const onPageError = (e: Error) => {
    if (/Minified React error #(418|423|425)/.test(e.message))
      hydration.push(e.message.slice(0, 40));
    else consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`);
  };
  const onResponse = (r: import('@playwright/test').Response) => {
    if (r.status() >= 400)
      badResponses.push(
        `${r.status()} ${r.request().method()} ${r
          .url()
          .replace(/^https?:\/\/[^/]+/, '')
          .slice(0, 120)}`,
      );
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const response = await page.goto(route, { waitUntil: 'load', timeout: 45_000 });
  const status = response?.status() ?? 0;
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  const perf = await measurePerf(page);
  if (status !== 200) issues.push(`HTTP ${status}`);
  if (new URL(page.url()).pathname !== route.split('?')[0])
    issues.push(`URL finale ${new URL(page.url()).pathname}`);

  const misc = await measureMisc(page, isMobile);
  if (misc.overflow > 0)
    issues.push(`défilement horizontal +${misc.overflow}px : ${misc.offenders.join(' | ')}`);
  if (misc.theme !== 'light') issues.push(`data-theme=${misc.theme}`);
  if (misc.themeToggles.length) issues.push(`bascule de thème : ${misc.themeToggles.join(' | ')}`);
  if (misc.adminText) issues.push('texte « Administration » dans la sidebar');
  if (misc.forbidden.length) issues.push(`libellé Voir/Détails : ${misc.forbidden.join(' | ')}`);
  if (misc.iconNoName.length)
    issues.push(`contrôle sans nom accessible : ${misc.iconNoName.slice(0, 4).join(' | ')}`);
  if (isMobile) {
    if ((misc.padL ?? 0) > 12 || (misc.padR ?? 0) > 12)
      issues.push(`marges <main> mobile ${misc.padL}/${misc.padR}px`);
    if (misc.iconOnlyNoTitle.length)
      issues.push(
        `icône seule sans aria-label/title : ${misc.iconOnlyNoTitle.slice(0, 4).join(' | ')}`,
      );
  }
  const heights = await measureHeights(page);
  if (heights.bad.length)
    issues.push(
      `hauteurs hors 36/40/48 : ${heights.bad.slice(0, 6).join(' | ')}${heights.bad.length > 6 ? ` (+${heights.bad.length - 6})` : ''}`,
    );
  notes.push(`contrôles mesurés : ${heights.nb} boutons, ${heights.nf} champs`);

  await page.screenshot({
    path: join(OUT, 'shots', `${projectName}-${slug(route)}.png`),
    fullPage: true,
  });

  // Modales (après capture pour ne pas la polluer)
  await modalSweep(page, issues, notes);

  if (hydration.length) issues.push(`hydratation : ${hydration.join(' | ')}`);
  if (consoleErrors.length)
    issues.push(`console/pageerror : ${consoleErrors.slice(0, 4).join(' | ')}`);
  if (badResponses.length)
    issues.push(`réponses 4xx/5xx : ${badResponses.slice(0, 5).join(' | ')}`);
  if (blocked.length)
    notes.push(`mutations bloquées par le test : ${[...new Set(blocked)].join(', ')}`);

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('response', onResponse);

  const record = { project: projectName, route, status, h1: misc.h1, perf, issues, notes };
  writeFileSync(
    join(OUT, 'json', `${projectName}-${slug(route)}.json`),
    JSON.stringify(record, null, 2),
  );
  return record;
}

/* ----- scénarios ----- */

test.describe('Dashboard refonte (lecture seule)', () => {
  test.setTimeout(240_000);
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Identifiants admin absents : parcours non exécuté.');

  test.use({ storageState: authFile });

  const blocked: string[] = [];

  test.beforeAll(async ({ browser }, info) => {
    mkdirSync(join(OUT, 'shots'), { recursive: true });
    mkdirSync(join(OUT, 'json'), { recursive: true });
    if (existsSync(authFile)) return; // session réutilisée (évite le rate limiting du login)
    const ctx = await browser.newContext({
      baseURL: info.project.use.baseURL,
      storageState: undefined,
    });
    const page = await ctx.newPage();
    await login(page);
    await ctx.storageState({ path: authFile });
    await ctx.close();
  });

  for (const route of LIST_ROUTES) {
    test(`route ${route}`, async ({ page, context, isMobile }, info) => {
      await blockMutations(context, blocked);
      {
        const rec = await auditRoute(page, route, !!isMobile, info.project.name, blocked);

        // Récupération des ids + cartes cliquables
        const sources = DETAIL_SOURCES.filter((s) => s.list === route);
        if (sources.length) {
          // Recharge la liste : le balayage de modales a pu changer d'onglet.
          await page.goto(route);
          await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
        }
        for (const src of sources) {
          const hrefs = await page.evaluate((reSrc) => {
            const re = new RegExp(reSrc);
            return Array.from(document.querySelectorAll<HTMLAnchorElement>('main a[href]'))
              .map((a) => a.getAttribute('href') ?? '')
              .filter((h) => re.test(h));
          }, src.re.source);
          if (hrefs[0]) {
            detailHrefs.set(`${info.project.name}:${src.list}`, hrefs[0]);
            // La carte entière mène-t-elle à la bonne fiche ? clic en marge gauche du lien.
            const link = page.locator(`main a[href="${hrefs[0]}"]`).first();
            const box = await link.boundingBox();
            if (box) {
              await link.scrollIntoViewIfNeeded();
              const b2 = (await link.boundingBox())!;
              await page.mouse.click(b2.x + 6, b2.y + b2.height / 2);
              await page
                .waitForURL((u) => u.pathname === hrefs[0], { timeout: 15_000 })
                .catch(() => {
                  rec.issues.push(
                    `clic sur la carte ne mène pas à ${hrefs[0]} (URL ${new URL(page.url()).pathname})`,
                  );
                });
            }
          } else {
            rec.notes.push('aucune fiche détail trouvée dans la liste (liste vide ?)');
          }
        }
        writeFileSync(
          join(OUT, 'json', `${info.project.name}-${slug(route)}.json`),
          JSON.stringify(rec, null, 2),
        );
        expect.soft(rec.issues, `${route}`).toEqual([]);
      }
    });
  }

  for (const src of DETAIL_SOURCES) {
    test(`fiche détail issue de ${src.list}`, async ({ page, context, isMobile }, info) => {
      const href = detailHrefs.get(`${info.project.name}:${src.list}`);
      test.skip(!href, `Aucune fiche trouvée dans ${src.list} : non exécuté.`);
      await blockMutations(context, blocked);
      {
        const rec = await auditRoute(page, href!, !!isMobile, info.project.name, blocked);
        expect.soft(rec.issues, href!).toEqual([]);
      }
    });
  }

  test('mobile : barre d’onglets, bouton Menu, fermeture ✕ et Échap', async ({
    page,
    context,
    isMobile,
  }, info) => {
    test.skip(!isMobile, 'Spécifique mobile.');
    await blockMutations(context, blocked);
    const issues: Issue[] = [];
    try {
      for (const route of ['/dashboard', '/dashboard/catalogue']) {
        await page.goto(route);
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
        const bar = page.locator('nav[aria-label="Navigation administration"]:visible');
        if ((await bar.count()) !== 1)
          issues.push(`${route} : ${await bar.count()} barre(s) d’onglets visible(s)`);
        const box = await bar.first().boundingBox();
        const vh = page.viewportSize()!.height;
        const vp = await page.evaluate(() => ({
          ih: window.innerHeight,
          sy: Math.round(window.scrollY),
          vv: Math.round(window.visualViewport?.height ?? 0),
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        if (!box || Math.abs(box.y + box.height - vh) > 1)
          issues.push(
            `${route} : barre non collée en bas (bas=${box ? Math.round(box.y + box.height) : 'n/a'} / viewport ${vh}, innerHeight=${vp.ih}, scrollY=${vp.sy}, visualVP=${vp.vv}, scrollW=${vp.sw}/${vp.iw})`,
          );
        const menu = bar.first().getByRole('button', { name: 'Menu' });
        if (!(await checkModal(page, menu, 'Menu', issues)))
          issues.push(`${route} : bouton Menu n’ouvre pas de modale`);
        await menu.click();
        const dialog = page.getByRole('dialog', { name: 'Menu' });
        const links = await dialog.getByRole('link').count();
        if (links !== 15) issues.push(`${route} : Menu liste ${links} pages (15 attendues)`);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      }
      await page.screenshot({ path: join(OUT, 'shots', `${info.project.name}-menu-closed.png`) });
      await page.goto('/dashboard');
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.screenshot({ path: join(OUT, 'shots', `${info.project.name}-menu-open.png`) });
      await page.keyboard.press('Escape');
    } finally {
      writeFileSync(
        join(OUT, 'json', `${info.project.name}-menu.json`),
        JSON.stringify({ issues }, null, 2),
      );
    }
    expect.soft(issues).toEqual([]);
  });
});
