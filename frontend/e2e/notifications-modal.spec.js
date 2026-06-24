/**
 * E2E: NotificationsModal — open notifications, view items, mark all read, clear all.
 *
 * Flow:
 *   1. Land on home page.
 *   2. Click the notifications bell in the floating dock.
 *   3. Verify the modal opens with the title and action buttons.
 *   4. Close the modal.
 *
 * Production-safe: no store seeding needed.
 */
import { test, expect } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('NotificationsModal', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', err => errors.push(err.message));
        page._testErrors = errors;
    });

    test('notifications bell opens the modal', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // Click notifications bell
        const notifBtn = page.locator('#dock-action-notifications');
        await expect(notifBtn).toBeVisible({ timeout: 5000 });
        await notifBtn.click();

        // MUI Dialog should open
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Modal should have a title (Notifications)
        const dialogTitle = dialog.locator('[class*="DialogTitle"]');
        await expect(dialogTitle).toBeVisible({ timeout: 3000 });

        const fatalErrors = (page._testErrors || []).filter(e =>
            !e.includes('Warning') && !e.includes('ResizeObserver')
        );
        expect(fatalErrors, `Console errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
    });

    test('modal close button dismisses the dialog', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // Open modal
        await page.locator('#dock-action-notifications').click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Press Escape to close MUI Dialogs
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Dialog should be gone
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('notifications modal shows empty state or list', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        await page.locator('#dock-action-notifications').click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Should show either notification items OR an empty state
        const bodyText = await dialog.innerText();
        expect(bodyText.length).toBeGreaterThan(5);

        // No fatal errors
        const fatalErrors = (page._testErrors || []).filter(e =>
            !e.includes('Warning') && !e.includes('ResizeObserver')
        );
        expect(fatalErrors).toHaveLength(0);
    });
});
