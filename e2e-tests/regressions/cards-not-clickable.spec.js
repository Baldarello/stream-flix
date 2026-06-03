/**
 * Regression: Home cards are not interactive (no detail view opens).
 *
 * Root cause: CinematicDetail applies GSAP `transform: scale()` and
 * `filter: blur()` to its root Box, which creates a containing block.
 * The child DetailView uses `position: fixed; inset: 0`, so it is
 * constrained to the parent's 0×0 box and rendered invisible.
 *
 * Repro:
 *   1. Load the home page
 *   2. Click a `holo-card`
 *   3. CinematicDetail mounts (#detail-cinematic is attached)
 *   4. But its inner content (DetailView) has no visible box
 *
 * This test asserts the actual rendered geometry: the detail view's
 * visible content must have non-zero size after the morph-in animation
 * settles.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Regression - home cards are interactive', () => {
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

  test('Clicking a card mounts CinematicDetail with a non-zero visible box', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-component="holo-card"]', { timeout: 10000 });

    // Click the first card.
    const firstCard = await page.$('[data-component="holo-card"]');
    expect(firstCard).not.toBeNull();
    await firstCard.click();

    // CinematicDetail should mount.
    await page.waitForSelector('#detail-cinematic', { state: 'attached', timeout: 10000 });

    // Wait for the GSAP morph-in to settle.
    await page.waitForTimeout(1300);

    // The detail shell should be opaque.
    const opacity = await page.$eval(
      '#detail-cinematic',
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThan(0.5);

    // The detail view's inner content (DetailView root) must occupy a
    // meaningful portion of the viewport. If transform/filter create
    // a containing block around DetailView, its `position: fixed;
    // inset: 0` collapses to 0×0 and this assertion fails.
    const detailMetrics = await page.evaluate(() => {
      // DetailView renders its root as a Box with position: fixed.
      // It is the FIRST fixed-positioned child of #detail-cinematic.
      const shell = document.querySelector('#detail-cinematic');
      if (!shell) return null;
      const fixedChildren = Array.from(shell.querySelectorAll('*')).filter((el) => {
        const style = getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'absolute';
      });
      if (fixedChildren.length === 0) return null;
      // The DetailView root is the largest positioned descendant.
      const largest = fixedChildren.reduce((acc, el) => {
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        return !acc || area > acc.area ? { el, area, rect: r } : acc;
      }, null);
      return {
        width: largest.rect.width,
        height: largest.rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
    expect(detailMetrics).not.toBeNull();
    // Compare inside the Node-side assertion via the captured viewport.
    expect(detailMetrics.width).toBeGreaterThan(detailMetrics.viewportWidth * 0.5);
    expect(detailMetrics.height).toBeGreaterThan(detailMetrics.viewportHeight * 0.5);
  });

  test('Home page has no console errors after the card click flow', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-component="holo-card"]', { timeout: 10000 });
    const firstCard = await page.$('[data-component="holo-card"]');
    await firstCard.click();
    await page.waitForSelector('#detail-cinematic', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(800);

    // No console errors (React #31 mobx double-observer, etc).
    const errors = page.__consoleErrors || [];
    if (errors.length) console.log('[CARDS-NOT-CLICKABLE] errors:', errors);
    // Mobx-react-lite double-observer is allowed (handled separately).
    const realErrors = errors.filter((e) => !/observer on a function component/.test(e));
    expect(realErrors).toEqual([]);
  });
});
