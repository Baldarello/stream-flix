/**
 * E2E: URL Routing — verify route fallback and root behavior.
 *
 * Most playback views are MobX-state-driven overlays, not URL-routed views.
 * They only mount when their MobX state flag is active (e.g. #screen-player
 * only renders when mediaStore.nowPlayingItem is set).
 *
 * What IS testable via direct URL in production:
 *   - / (root)       → home view always accessible
 *   - /search        → tested in search-view.spec.js
 *   - /preferences   → tested in preferences-nav.spec.js
 *   - /* (unknown)    → falls back to home
 *
 * What requires MobX state to be set first (skip in production):
 *   - /player  → needs nowPlayingItem (not testable without seed data)
 *   - /master  → needs isRemoteMaster + remoteSlaveState.nowPlayingItem
 *   - /slave   → needs isSmartTV + nowPlayingItem
 *   - /qr      → needs isQRScannerOpen (only via dock button, tested in qr-scanner.spec.js)
 *   - /pairing → needs isSmartTVPairingVisible
 */
import { test, expect } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('URL Routing', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', err => errors.push(err.message));
        page._testErrors = errors;
    });

    test('root URL renders home view', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1000);

        // Use section#screen-home (ViewSwitch landmark) to avoid strict-mode violation
        await expect(page.locator('section#screen-home')).toBeVisible();

        const fatalErrors = (page._testErrors || []).filter(e =>
            !e.includes('Warning') && !e.includes('ResizeObserver') && !e.includes('favicon')
        );
        expect(fatalErrors, `Console errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
    });

    test('unknown URL falls back to home view (not found handling)', async ({ page }) => {
        await page.goto(`${APP_URL}this-route-does-not-exist-xyz`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('section#screen-home', { timeout: 15_000, state: 'attached' });
        await page.waitForTimeout(1000);

        await expect(page.locator('section#screen-home')).toBeVisible();
    });

    test('home renders with floating dock present', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1000);

        // Floating dock should be present on home screen
        const dock = page.locator('#dock-actions');
        await expect(dock).toBeVisible();

        // Dock buttons should be visible
        await expect(page.locator('#dock-action-search')).toBeVisible();
        await expect(page.locator('#dock-action-notifications')).toBeVisible();
    });
});
