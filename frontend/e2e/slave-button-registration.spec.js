import {test, expect} from '@playwright/test';

/**
 * Regression test for the "slave button stays in loading" bug.
 *
 * The root cause was that `remoteStore.handleIncomingMessage` was
 * implemented but never subscribed to the WebSocket `message` event,
 * so the server reply `quix-slave-registered` (carrying the
 * `slaveId` and `shortCode`) was never processed. The UI therefore
 * saw a `null` `slaveId` and kept rendering `SlaveLoadingView`
 * instead of `SlavePairingView` (which contains the QR code and
 * the short code).
 *
 * This test reproduces the exact user flow described in the issue:
 *  1. Open the home page.
 *  2. Click the Smart TV / slave action in the floating dock.
 *  3. Wait for the QR code pairing view (not the loading view).
 *  4. Assert that a 5-character short code is shown.
 *
 * It also covers the two related TV-mode regressions:
 *  - The "QR Code" quick action in TV mode shows a real short code.
 *  - The empty-state "Sfoglia il catalogo" CTA navigates to the
 *    pairing view instead of triggering a non-functional Google sign-in.
 */
test.describe('Slave button opens the QR code pairing view', () => {
    test('clicking the slave button reveals the QR code + short code (no loading state)', async ({page, context}) => {
        // Start from a clean storage so the persisted "isConfiguredAsSlave"
        // flag from previous tests does not skip the click flow.
        await context.clearCookies();
        await page.goto('http://localhost:3002/');
        await page.evaluate(() => {
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (_e) {
                /* ignore */
            }
        });

        // Reload after clearing storage so the app boots fresh.
        await page.goto('http://localhost:3002/');
        await page.waitForLoadState('networkidle');

        // The slave button is rendered inside the floating dock.
        // We use the dedicated id so the selector is stable across
        // CSS refactors.
        const slaveBtn = page.locator('#slave-button');
        await slaveBtn.waitFor({state: 'visible', timeout: 10000});

        await slaveBtn.click();

        // The slave screen must transition out of the loading spinner
        // into the pairing view (which holds the QR code and the code).
        const codeEl = page.locator('#slave-code');
        await codeEl.waitFor({state: 'visible', timeout: 10000});

        // The short code must be a 5-character identifier, NOT the
        // `...` placeholder we used to see when the response was lost.
        const shortCode = (await codeEl.textContent())?.trim() ?? '';
        expect(shortCode).toHaveLength(5);
        expect(shortCode).not.toBe('...');
    });

    test('opening TV mode at /?tv=1 then clicking QR Code shows the pairing view with a real short code', async ({page}) => {
        await page.goto('http://localhost:3002/?tv=1');
        await page.waitForSelector('#tv-app-root', {timeout: 10000});

        // The QR Code quick action tile is part of TvQuickActionRow.
        const qrTile = page.locator('#tv-tile-qr');
        await qrTile.waitFor({state: 'visible', timeout: 10000});
        await qrTile.focus();
        await page.keyboard.press('Enter');

        // The pairing view must appear and the short code element must
        // hold a 5-character identifier (not the `------` placeholder).
        await page.waitForSelector('#tv-pairing-view', {timeout: 10000});
        const codeEl = page.locator('#tv-pairing-view .pairing-code');
        await expect(codeEl).toBeVisible();
        const code = (await codeEl.textContent())?.trim() ?? '';
        expect(code).toHaveLength(5);
        expect(code).not.toBe('------');
    });

    test('"Sfoglia il catalogo" empty-state CTA navigates to the pairing view', async ({page}) => {
        await page.goto('http://localhost:3002/?tv=1');
        await page.waitForSelector('#tv-app-root', {timeout: 10000});

        const cta = page.locator('#tv-empty-cta');
        await cta.waitFor({state: 'visible', timeout: 10000});
        await cta.focus();
        await page.keyboard.press('Enter');

        await page.waitForSelector('#tv-pairing-view', {timeout: 10000});
    });
});
