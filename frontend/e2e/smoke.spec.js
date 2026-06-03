/**
 * Smoke e2e test: the app loads and the home page renders the main
 * navigation tabs. This is intentionally minimal so the rest of the
 * e2e suite can be filled in incrementally.
 */
import { test, expect } from '@playwright/test';

test('home page renders the main header', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Quix/i);
    // The header always renders the brand wordmark.
    await expect(page.getByText('Quix').first()).toBeVisible();
});
