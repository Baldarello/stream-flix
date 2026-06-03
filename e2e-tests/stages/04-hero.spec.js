/**
 * Stage 4: Cinematic Hero.
 *
 * Asserts that:
 *  - The cinematic hero (#hero-cinematic via the legacy #home-hero prop)
 *    is mounted with the futuristic typography and data-component.
 *  - The title is rendered as char-by-char kinetic spans.
 *  - The play CTA navigates to the player view OR shows a "no video links"
 *    snackbar (the headless environment has no real TMDB links).
 *  - The "More Info" CTA either opens the detail view (close button
 *    visible) or shows a snackbar warning if details fail to load.
 *  - The page is console-error-free.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Stage 4 - Cinematic hero', () => {
  let context;
  let page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.__consoleErrors = errors;
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('cinematic hero is mounted with kinetic title spans', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#home-hero', { timeout: 10000 });

    const isCinematic = await page.$eval('#home-hero', (el) => el.getAttribute('data-component'));
    expect(isCinematic).toBe('cinematic-hero');

    const titleText = await page.$eval('#home-hero h1', (el) => el.textContent.trim());
    expect(titleText.length).toBeGreaterThan(0);

    const charCount = await page.$$eval('#home-hero .kinetic-char', (els) => els.length);
    expect(charCount).toBeGreaterThan(0);
  });

  test('hero play CTA triggers a playback action', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#hero-cta-play', { timeout: 10000 });

    // Click the play CTA. In a real environment with links this would
    // flip the view to "player". In the headless test environment there
    // are no TMDB links, so mediaStore.startPlayback() shows a snackbar
    // warning and the view stays on "home". Either outcome proves the
    // action was triggered.
    await page.click('#hero-cta-play');
    const outcome = await page.evaluate(async () => {
      // Give the action a moment to resolve.
      await new Promise((r) => setTimeout(r, 1500));
      const branch = document.querySelector('[data-testid="view-branch"]');
      const branchKey = branch ? branch.getAttribute('data-view-key') : null;
      // NotificationSnackbar renders under a Mui Snackbar root with a
      // role="alert" element. Look for any visible toast / alert.
      const toast = document.querySelector('.MuiSnackbar-root [role="alert"], .MuiAlert-root, [data-testid="snackbar"]');
      return { branchKey, toastPresent: !!toast };
    });

    // Either the view flipped to "player" or a toast appeared.
    const triggered = outcome.branchKey === 'player' || outcome.toastPresent;
    expect(triggered).toBe(true);
  });

  test('hero "More Info" CTA opens the detail view (or a toast)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#hero-cta-more', { timeout: 10000 });

    await page.click('#hero-cta-more');
    const outcome = await page.evaluate(async () => {
      await new Promise((r) => setTimeout(r, 2000));
      // The detail view exposes a close button with this stable id.
      const closeBtn = document.querySelector('#master-remote-detail-close-button');
      const toast = document.querySelector('.MuiSnackbar-root [role="alert"], .MuiAlert-root, [data-testid="snackbar"]');
      return { closeBtnPresent: !!closeBtn, toastPresent: !!toast };
    });

    const triggered = outcome.closeBtnPresent || outcome.toastPresent;
    expect(triggered).toBe(true);
  });

  test('no console errors on the cinematic hero', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#home-hero', { timeout: 10000 });
    await page.waitForTimeout(800);
    const errors = page.__consoleErrors || [];
    if (errors.length > 0) console.log('[STAGE4] console errors:', errors);
    expect(errors).toEqual([]);
  });
});
