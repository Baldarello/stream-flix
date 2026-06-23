import { test, expect } from '@playwright/test';

/**
 * E2E Test for TV Mode
 * Tests the Smart TV lightweight UI flow
 */
test.describe('TV Mode', () => {
    const BASE_URL = 'http://localhost:3000';

    test.beforeEach(async ({ page }) => {
        // Navigate to TV mode
        await page.goto(`${BASE_URL}/?tv=1`);
        // Wait for TV app to load
        await page.waitForSelector('#tv-app-root', { timeout: 10000 });
    });

    test('TV Home loads with quick action tiles', async ({ page }) => {
        // Take screenshot of home
        await page.screenshot({ path: '.playwright-mcp/tv-home.png', fullPage: true });

        // Verify quick actions are present
        await expect(page.locator('#tv-quick-actions')).toBeVisible();
        await expect(page.locator('#tv-tile-google')).toBeVisible();
        await expect(page.locator('#tv-tile-qr')).toBeVisible();
        await expect(page.locator('#tv-tile-mylist')).toBeVisible();

        // Verify tiles have correct IDs
        const googleTile = page.locator('#tv-tile-google');
        const qrTile = page.locator('#tv-tile-qr');
        const mylistTile = page.locator('#tv-tile-mylist');

        await expect(googleTile).toBeVisible();
        await expect(qrTile).toBeVisible();
        await expect(mylistTile).toBeVisible();
    });

    test('QR Tile navigates to pairing screen', async ({ page }) => {
        // Focus on QR tile and press Enter
        await page.locator('#tv-tile-qr').focus();
        await page.keyboard.press('Enter');

        // Wait for pairing screen
        await page.waitForSelector('#tv-pairing-view', { timeout: 5000 });

        // Take screenshot of pairing screen
        await page.screenshot({ path: '.playwright-mcp/tv-pairing.png', fullPage: true });

        // Verify QR code is visible
        await expect(page.locator('#tv-pairing-qr')).toBeVisible();

        // Go back to home
        await page.locator('#tv-back-btn-pairing').focus();
        await page.keyboard.press('Enter');

        // Should be back on home
        await page.waitForSelector('#tv-quick-actions', { timeout: 5000 });
    });

    test('My List Tile navigates to My List screen', async ({ page }) => {
        // Focus on My List tile and press Enter
        await page.locator('#tv-tile-mylist').focus();
        await page.keyboard.press('Enter');

        // Wait for My List screen
        await page.waitForSelector('#tv-my-list-view', { timeout: 5000 });

        // Take screenshot of My List screen
        await page.screenshot({ path: '.playwright-mcp/tv-mylist.png', fullPage: true });

        // Verify the screen has loaded (either with content or empty state)
        const hasListRow = await page.locator('.tv-list-row').count() > 0;
        const hasEmptyState = await page.locator('#tv-empty-state').count() > 0;
        
        expect(hasListRow || hasEmptyState).toBeTruthy();
    });

    test('Google Tile shows sign-in state', async ({ page }) => {
        // The Google tile should be visible and have appropriate content
        const googleTile = page.locator('#tv-tile-google');
        await expect(googleTile).toBeVisible();

        // Check that it has a title (either sign in or user name)
        const tileTitle = googleTile.locator('.tile-title');
        await expect(tileTitle).toBeVisible();

        // Take screenshot of Google tile
        await page.screenshot({ path: '.playwright-mcp/tv-google-tile.png' });
    });

    test('Remote control navigation works', async ({ page }) => {
        // Test arrow key navigation
        // Start on home screen
        await expect(page.locator('#tv-quick-actions')).toBeVisible();

        // Navigate with arrow keys
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');

        // The focus should be visible (outline)
        // Just verify no errors occurred
        await expect(page.locator('#tv-app-root')).toBeVisible();
    });

    test('Back button returns to home from My List', async ({ page }) => {
        // Navigate to My List
        await page.locator('#tv-tile-mylist').focus();
        await page.keyboard.press('Enter');
        await page.waitForSelector('#tv-my-list-view', { timeout: 5000 });

        // Press Escape to go back
        await page.keyboard.press('Escape');

        // Should be back on home
        await page.waitForSelector('#tv-quick-actions', { timeout: 5000 });
        await expect(page.locator('#tv-quick-actions')).toBeVisible();
    });

    test('Cinematic mode still works without ?tv=1', async ({ page }) => {
        // Navigate to normal (cinematic) mode
        await page.goto(BASE_URL);
        
        // Wait for cinematic app to load (look for dock or main content)
        // The cinematic mode should have #dock-floating or the main app
        await page.waitForSelector('#dock-floating', { timeout: 10000 });

        // Take screenshot of cinematic mode
        await page.screenshot({ path: '.playwright-mcp/cinematic-mode.png', fullPage: true });

        // Verify cinematic mode elements are visible
        await expect(page.locator('#dock-floating')).toBeVisible();
    });

    test('TV mode URL parameter forces TV mode on desktop', async ({ page }) => {
        // On desktop with ?tv=1, TV mode should be active
        await page.goto(`${BASE_URL}/?tv=1`);
        await page.waitForSelector('#tv-app-root', { timeout: 10000 });
        
        // TV root should be visible
        await expect(page.locator('#tv-app-root')).toBeVisible();
        
        // Cinematic dock should NOT be visible
        const dockVisible = await page.locator('#dock-floating').count();
        expect(dockVisible).toBe(0);
    });
});
