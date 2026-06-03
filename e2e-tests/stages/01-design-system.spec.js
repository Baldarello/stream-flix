/**
 * Stage 1: Design system foundation.
 *
 * Validates that the cinematic / futuristic design tokens defined in
 * `frontend/styles/cinematic.css` and `frontend/index.css` are actually
 * applied at runtime:
 *  - The body and root expose the new `--neon-accent`, `--bg-void` and
 *    `--cinematic-grad` custom properties.
 *  - The legacy body classes (`theme-serietv` / `theme-film` / `theme-anime`)
 *    all map to the same unified gradient, so the visual identity is
 *    coherent regardless of the active MobX theme observable.
 *  - The Space Grotesk display font is wired into the document so hero
 *    titles render with the futuristic typography.
 *  - No console errors are emitted on the home view (smoke check).
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Stage 1 - Cinematic design system', () => {
  let context;
  let page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });
    page.__consoleErrors = consoleErrors;
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('cinematic custom properties are present on :root', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        neonAccent: cs.getPropertyValue('--neon-accent').trim(),
        neonAccentHot: cs.getPropertyValue('--neon-accent-hot').trim(),
        bgVoid: cs.getPropertyValue('--bg-void').trim(),
        bgDeep: cs.getPropertyValue('--bg-deep').trim(),
        cinematicGrad: cs.getPropertyValue('--cinematic-grad').trim(),
        holoGrad: cs.getPropertyValue('--holo-grad').trim(),
        fontDisplay: cs.getPropertyValue('--font-display').trim(),
        textPrimary: cs.getPropertyValue('--text-primary').trim()
      };
    });

    expect(tokens.neonAccent).toBe('#4cd2ff');
    expect(tokens.neonAccentHot).toBe('#7af0ff');
    expect(tokens.bgVoid.toLowerCase()).toBe('#05060d');
    expect(tokens.bgDeep.toLowerCase()).toBe('#0a0d1a');
    expect(tokens.cinematicGrad).toContain('radial-gradient');
    expect(tokens.holoGrad).toContain('linear-gradient');
    expect(tokens.fontDisplay.toLowerCase()).toContain('space grotesk');
    expect(tokens.textPrimary.toLowerCase()).toBe('#eaf2ff');
  });

  test('legacy theme body classes all map to the unified cinematic gradient', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // The activeTheme is set to 'Anime' on cold start, so the body
    // receives the 'theme-anime' class. We then programmatically rotate
    // through the other legacy classes and confirm the background remains
    // identical (because every variant now resolves to var(--cinematic-grad)).
    const snapshot = await page.evaluate(() => {
      const measure = (cls) => {
        document.body.classList.remove('theme-serietv', 'theme-film', 'theme-anime');
        document.body.classList.add(cls);
        return getComputedStyle(document.body).backgroundImage;
      };
      return {
        serietv: measure('theme-serietv'),
        film: measure('theme-film'),
        anime: measure('theme-anime')
      };
    });

    expect(snapshot.serietv).toBe(snapshot.film);
    expect(snapshot.film).toBe(snapshot.anime);
    expect(snapshot.serietv).toContain('radial-gradient');
  });

  test('home page loads with the new theme and no console errors', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    // Give the app a moment to mount the ViewSwitch branch.
    await page.waitForTimeout(800);

    const errors = page.__consoleErrors;
    if (errors && errors.length > 0) {
      console.log('[STAGE1] console errors:', errors);
    }
    expect(errors || []).toEqual([]);
  });

  test('Space Grotesk display font is loaded', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const fontReady = await page.evaluate(async () => {
      if (!document.fonts || !document.fonts.check) return false;
      // Wait briefly for the font to register.
      await document.fonts.ready;
      return document.fonts.check('700 64px "Space Grotesk"');
    });
    expect(fontReady).toBe(true);
  });
});
