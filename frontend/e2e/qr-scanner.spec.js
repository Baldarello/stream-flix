/**
 * E2E: QR Scanner (MasterScreen) — open scanner, verify QR reader UI.
 *
 * Flow:
 *   1. Land on home page.
 *   2. Click the QR scanner dock button.
 *   3. Verify the QR reader container and manual code input are visible.
 *   4. Close the scanner.
 *
 * Production-safe: no store seeding needed.
 */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('QRScanner / MasterScreen', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));
        page._testErrors = errors;
    });

    test('QR scanner dock button opens the master screen', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // Click the QR scanner button in the dock
        const qrBtn = page.locator('#dock-action-qr');
        await expect(qrBtn).toBeVisible({ timeout: 5000 });
        await qrBtn.click();

        // Wait for the QR reader container to appear
        const qrContainer = page.locator('#qr-reader-container');
        await expect(qrContainer).toBeVisible({ timeout: 8000 });

        // Manual code input should also be present
        const codeInput = page.locator('#master-slave-code-input');
        await expect(codeInput).toBeVisible({ timeout: 5000 });

        const fatalErrors = (page._testErrors || []).filter((e) => !e.includes('Warning') && !e.includes('ResizeObserver'));
        expect(fatalErrors, `Console errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
    });

    test('manual code input accepts text', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        await page.locator('#dock-action-qr').click();
        await page.waitForSelector('#master-slave-code-input', { timeout: 8000 });

        const codeInput = page.locator('#master-slave-code-input');
        await codeInput.fill('ABC12');

        const value = await codeInput.inputValue();
        expect(value).toBe('ABC12');
    });

    test('connect button is present when scanner is open', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        await page.locator('#dock-action-qr').click();
        await page.waitForSelector('#connect-master-slave', { timeout: 8000 });

        const connectBtn = page.locator('#connect-master-slave');
        await expect(connectBtn).toBeVisible();
    });
});
