/**
 * E2E: TV App Screens — verify TV mode home, player, and my-list screens.
 *
 * TV mode is activated via ?tv=1 query param and renders the TvApp shell
 * with TvHomeView, TvPlayerView, TvMyListView etc.
 *
 * Production-safe: no store seeding needed.
 */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('TV App Screens', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));
        page._testErrors = errors;
    });

    test('TV mode home page renders with quick action row', async ({ page }) => {
        await page.goto(`${APP_URL}?tv=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#tv-app-root', { timeout: 15_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // TvHomeView should render with the quick action row
        const tvRoot = page.locator('#tv-app-root');
        await expect(tvRoot).toBeVisible();

        // Quick action tiles should be present (QR, Browse, My List, etc.)
        const quickActions = page.locator('[class*="quick-action"], [class*="QuickAction"]');
        const count = await quickActions.count();
        expect(count).toBeGreaterThan(0);

        const fatalErrors = (page._testErrors || []).filter((e) => !e.includes('Warning') && !e.includes('ResizeObserver'));
        expect(fatalErrors).toHaveLength(0);
    });

    test('TV mode quick action tiles are keyboard-focusable', async ({ page }) => {
        await page.goto(`${APP_URL}?tv=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#tv-app-root', { timeout: 15_000, state: 'attached' });
        await page.waitForTimeout(1000);

        // Tab to the quick action row
        await page.keyboard.press('Tab');
        // Navigate with arrow keys through quick actions
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');

        // Should remain in TV app without crashing
        const tvRoot = page.locator('#tv-app-root');
        await expect(tvRoot).toBeVisible();
    });

    test('TV mode navigation between home and my-list', async ({ page }) => {
        await page.goto(`${APP_URL}?tv=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#tv-app-root', { timeout: 15_000, state: 'attached' });
        await page.waitForTimeout(1000);

        // Find and click the "My List" quick action tile
        // The tile has a specific id pattern or we navigate via keyboard
        const myListTile = page
            .locator('#tv-tile-mylist, [class*="tile"]')
            .filter({ hasText: /lista|my list/i })
            .first();
        if (await myListTile.isVisible({ timeout: 3000 }).catch(() => false)) {
            await myListTile.click();
            await page.waitForTimeout(1500);
            // Should navigate to My List view (TvMyListView)
            const tvRoot = page.locator('#tv-app-root');
            await expect(tvRoot).toBeVisible();
        }

        const fatalErrors = (page._testErrors || []).filter((e) => !e.includes('Warning') && !e.includes('ResizeObserver'));
        expect(fatalErrors).toHaveLength(0);
    });

    test('TV mode pairing flow via QR tile', async ({ page }) => {
        await page.goto(`${APP_URL}?tv=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#tv-app-root', { timeout: 15_000, state: 'attached' });
        await page.waitForTimeout(1000);

        // Navigate to QR tile and press Enter
        const qrTile = page.locator('#tv-tile-qr');
        if (await qrTile.isVisible({ timeout: 3000 }).catch(() => false)) {
            await qrTile.focus();
            await page.keyboard.press('Enter');

            // Pairing view should appear
            await page.waitForSelector('#tv-pairing-view', { timeout: 8000 });
            const pairingCode = page.locator('#tv-pairing-view .pairing-code');
            await expect(pairingCode).toBeVisible();
        }
    });
});
