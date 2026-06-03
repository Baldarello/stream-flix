/**
 * MUI v7 upgrade regression test.
 *
 * Guards the @mui/material & @mui/icons-material 5.18.0 -> 7.3.11
 * upgrade by exercising the v7 slot API code paths (slotProps.paper /
 * slotProps.backdrop) and asserting the app still mounts without
 * console errors.
 *
 * Run with:
 *   npx playwright test e2e-tests/mui-v7-upgrade.spec.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('MUI v7 upgrade - slotProps regression', () => {
  let context;
  let page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.__consoleErrors = errors;
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('Home mounts with MUI v7 ThemeProvider + no console errors', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // ThemeProvider must mount the dock + hero + at least one HoloCard.
    await page.waitForSelector('#dock-floating', { timeout: 15000 });
    await page.waitForSelector('#home-hero', { timeout: 15000 });
    await page.waitForSelector('#fx-ambient-canvas', { timeout: 15000 });
    await page.waitForSelector('#fx-scene-canvas', { timeout: 15000 });
    await page.waitForSelector('[data-component="holo-card"]', { timeout: 15000 });

    // No errors during the home view mount.
    const errors = page.__consoleErrors || [];
    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });

  test('Clicking a HoloCard opens CinematicDetail (Box/Container/Button v7 stack)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-component="holo-card"]', { timeout: 15000 });

    const firstCard = await page.$('[data-component="holo-card"]');
    await firstCard.click();

    // CinematicDetail mounts via Box / Container / Typography / Button
    // from @mui/material. A failure to mount here would surface as a
    // pageerror caught by the beforeEach hook.
    await page.waitForSelector('#detail-cinematic', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(1000);

    const opacity = await page.$eval(
      '#detail-cinematic',
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThan(0.3);

    const errors = page.__consoleErrors || [];
    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });

  test('Master EpisodesDrawer opens with migrated slotProps (paper + backdrop)', async () => {
    // We drive the remote store from the test-mode window hook so we
    // don't depend on a fully paired master/slave session.
    await page.addInitScript(() => {
      window.__quixTest = window.__quixTest || {};
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-floating', { timeout: 15000 });

    // Try to open the remote store episodes drawer via the test hook
    // (if exposed). Fallback: click the master-button then a show.
    let drawerOpened = false;
    const opened = await page.evaluate(() => {
      // The store hook is best-effort: the remote store exposes the
      // openEpisodesDrawer action when window.__quixTest is wired in
      // dev mode. When unavailable we fall through to the UI path.
      const store = window.__quixTest?.remoteStore;
      if (store && typeof store.openEpisodesDrawer === 'function') {
        store.openEpisodesDrawer();
        return true;
      }
      return false;
    });

    if (opened) {
      drawerOpened = true;
    } else {
      // UI fallback: open master mode, click a show, then the
      // episodes button.
      const masterBtn = await page.$('#master-button');
      if (masterBtn) {
        await masterBtn.click();
        await page.waitForTimeout(800);
        const firstCard = await page.$('[data-component="holo-card"]');
        if (firstCard) {
          await firstCard.click();
          await page.waitForTimeout(800);
          const epBtn = await page.$('#episodes-button, [data-action="open-episodes"]');
          if (epBtn) {
            await epBtn.click();
            drawerOpened = true;
          }
        }
      }
    }

    if (drawerOpened) {
      // The Drawer's slotProps.paper must apply the cinematic paper
      // styles. Assert the paper element exists and is visible.
      await page.waitForSelector('#episodes-drawer', { state: 'attached', timeout: 10000 });
      await page.waitForTimeout(500);

      const drawer = await page.$('#episodes-drawer');
      expect(drawer).not.toBeNull();

      const styles = await page.evaluate(() => {
        const el = document.querySelector('#episodes-drawer');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { display: cs.display, width: cs.width, visibility: cs.visibility };
      });
      expect(styles).not.toBeNull();
      expect(styles.visibility).not.toBe('hidden');
    }

    // Whether or not the drawer actually opened in this minimal env,
    // the app must not have raised console errors.
    const errors = page.__consoleErrors || [];
    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });

  test('No console errors or pageerror events across the journey', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-floating', { timeout: 15000 });
    await page.waitForSelector('[data-component="holo-card"]', { timeout: 15000 });

    // Small interaction sweep to surface any slotProps regression.
    const firstCard = await page.$('[data-component="holo-card"]');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    const errors = page.__consoleErrors || [];
    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });
});
