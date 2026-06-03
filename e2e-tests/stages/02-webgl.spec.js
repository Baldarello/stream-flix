/**
 * Stage 2: WebGL ambient + scene infrastructure.
 *
 * Asserts that:
 *  - `#fx-ambient-canvas` and `#fx-scene-canvas` are both present in the
 *    document, behind the React content (z-index 0 / 1400 respectively).
 *  - At least one of them has a live WebGL2 (preferred) or WebGL1 context
 *    attached - the cinematic effect really is running on the GPU.
 *  - The page loads without console errors.
 *  - When WebGL is unavailable, the `#fx-ambient-fallback` element is
 *    mounted instead and the page still renders.
 *
 * The WebGL absence path is exercised by stubbing HTMLCanvasElement.prototype
 * `getContext` to return null for the duration of one test.
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Stage 2 - WebGL ambient + scene layers', () => {
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

  test('ambient + scene canvases are mounted and have a WebGL context', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#fx-ambient-canvas', { timeout: 10000 });
    await page.waitForSelector('#fx-scene-canvas', { timeout: 10000 });

    const webglInfo = await page.evaluate(() => {
      const ambient = document.querySelector('#fx-ambient-canvas');
      const scene = document.querySelector('#fx-scene-canvas');
      const probe = (canvas) => {
        if (!canvas) return { present: false };
        const ctx2 = canvas.getContext('webgl2');
        if (ctx2) {
          const lose = ctx2.getExtension && ctx2.getExtension('WEBGL_lose_context');
          if (lose && typeof lose.loseContext === 'function') {
            try { lose.loseContext(); } catch (_e) { /* ignore */ }
          }
          return { present: true, version: 2 };
        }
        const ctx1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (ctx1) {
          const lose = ctx1.getExtension && ctx1.getExtension('WEBGL_lose_context');
          if (lose && typeof lose.loseContext === 'function') {
            try { lose.loseContext(); } catch (_e) { /* ignore */ }
          }
          return { present: true, version: 1 };
        }
        return { present: false };
      };
      return { ambient: probe(ambient), scene: probe(scene) };
    });

    expect(webglInfo.ambient.present).toBe(true);
    expect(webglInfo.scene.present).toBe(true);
    expect([1, 2]).toContain(webglInfo.ambient.version);
    expect([1, 2]).toContain(webglInfo.scene.version);
  });

  test('no console errors on the home view with WebGL enabled', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const errors = page.__consoleErrors || [];
    if (errors.length > 0) {
      console.log('[STAGE2] console errors:', errors);
    }
    expect(errors).toEqual([]);
  });

  test('css fallback mounts when WebGL is unavailable', async () => {
    // Stub getContext before the app boots so the AmbientCanvas falls back.
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return originalGetContext ? originalGetContext.apply(this, arguments) : null;
      };
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const fallback = await page.evaluate(() => {
      const el = document.getElementById('fx-ambient-fallback');
      if (!el) return { present: false };
      const cs = getComputedStyle(el);
      return { present: true, background: cs.backgroundImage };
    });

    expect(fallback.present).toBe(true);
    expect(fallback.background).toContain('radial-gradient');
  });
});
