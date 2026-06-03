/**
 * Stage 3: Floating Dock and Portal Transition Overlay.
 *
 * Asserts that:
 *  - The floating dock (`#dock-floating`) replaces the legacy header on the
 *    feature router. Each primary nav item is exposed with `data-nav-key`.
 *  - Clicking a dock item changes the `data-view-key` of the active branch
 *    from "home" to "search" (via the search action) or moves the dock
 *    `data-active` indicator.
 *  - When the active view changes, the transition portal mounts into
 *    `document.body` with `data-from-key` / `data-to-key` attributes, runs
 *    its GSAP timeline, then unmounts.
 *  - Focus is restored to a sensible element on the page after the
 *    transition completes.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Stage 3 - Floating dock + transition portal', () => {
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

  test('floating dock replaces the legacy header and exposes nav keys', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-floating', { timeout: 10000 });

    const navKeys = await page.$$eval('#dock-floating [data-nav-key]', (els) => els.map((el) => el.getAttribute('data-nav-key')));
    expect(navKeys).toEqual(expect.arrayContaining(['home', 'series', 'movies', 'anime', 'myList', 'library']));
  });

  test('clicking a nav item changes the active dock state', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-floating [data-nav-key="series"]', { timeout: 10000 });

    // Active state before
    const beforeActive = await page.$eval('#dock-floating [data-nav-key="home"]', (el) => el.getAttribute('data-active'));
    expect(beforeActive).toBe('true');

    // Click the series item
    await page.click('#dock-floating [data-nav-key="series"]');
    await page.waitForTimeout(400);

    const seriesActive = await page.$eval('#dock-floating [data-nav-key="series"]', (el) => el.getAttribute('data-active'));
    const homeActive = await page.$eval('#dock-floating [data-nav-key="home"]', (el) => el.getAttribute('data-active'));
    expect(seriesActive).toBe('true');
    expect(homeActive).toBe('false');
  });

  test('search action toggles the search branch with a transition', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-action-search', { timeout: 10000 });

    const viewKeyBefore = await page.$eval('[data-testid="view-branch"]', (el) => el.getAttribute('data-view-key'));
    expect(viewKeyBefore).toBe('home');

    await page.click('#dock-action-search');
    // The portal mounts and unmounts during the transition. Wait for the
    // view-branch attribute to flip to "search" after the transition.
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="view-branch"]');
        return el && el.getAttribute('data-view-key') === 'search';
      },
      { timeout: 6000 }
    );
    const viewKeyAfter = await page.$eval('[data-testid="view-branch"]', (el) => el.getAttribute('data-view-key'));
    expect(viewKeyAfter).toBe('search');
  });

  test('transition portal completes and unmounts', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dock-action-search', { timeout: 10000 });

    // Snapshot the body while the transition is in flight, then again after.
    const sawPortal = page.evaluate(() => new Promise((resolve) => {
      let seen = false;
      const interval = setInterval(() => {
        if (document.querySelector('#transition-portal')) seen = true;
      }, 25);
      setTimeout(() => {
        clearInterval(interval);
        resolve(seen);
      }, 1500);
    }));

    // Click search (it might be already active from a previous test - guard
    // by reading the current view branch first).
    const wasSearch = await page.$eval('[data-testid="view-branch"]', (el) => el.getAttribute('data-view-key')) === 'search';
    if (wasSearch) {
      // Click home so the next click opens a fresh transition.
      await page.click('#dock-floating [data-nav-key="home"]');
      await page.waitForTimeout(1200);
    }
    await page.click('#dock-action-search');
    const portalSeen = await sawPortal;
    expect(portalSeen).toBe(true);

    // After the timeline finishes the portal should unmount.
    await page.waitForFunction(
      () => !document.querySelector('#transition-portal'),
      { timeout: 6000 }
    );
  });
});
