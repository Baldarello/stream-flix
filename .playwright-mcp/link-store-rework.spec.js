// Test: Links added via LinkEpisodesModal appear in DetailView without page refresh
// Bug fix: _patchCurrentItemVideoUrls patches currentSelectedItem episodes so
// DetailView (which reads episode.video_urls) updates reactively without refresh.

const { test, expect } = require('@playwright/test');

test.describe('Link store rework — reactive sync', () => {

  test('DetailView shows language chips after saving links without page refresh', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // -------------------------------------------------------------------
    // Step 1 – Open app and search for a show
    // -------------------------------------------------------------------
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.locator('#dock-action-search').click();
    await page.waitForTimeout(300);
    await page.locator('#dock-search').fill('Dragon Ball');
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------------
    // Step 2 – Open the show detail view
    // -------------------------------------------------------------------
    await page.locator('[data-component="holo-card"]').first().click();
    await page.waitForSelector('[data-component="detail-view"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------------
    // Step 3 – Open Link Episodes Modal and save links
    // -------------------------------------------------------------------
    await page.locator('[data-component="link-episode"]').first().click();
    await page.waitForSelector('[data-component="link-episodes-modal"]', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Fill URL pattern with [@EP] placeholder
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.waitFor({ state: 'visible', timeout: 5000 });
    await patternInput.fill('https://example.com/episode/[@EP]');
    await page.waitForTimeout(300);

    // Save
    await page.locator('#add-links-button').click();

    // Verify success snackbar
    await page.waitForSelector('.MuiSnackbar-root', { timeout: 10000 });
    const snackbar = await page.locator('.MuiSnackbar-root').innerText();
    expect(snackbar).toMatch(/10 link/i);

    // -------------------------------------------------------------------
    // Step 4 – Close modal WITHOUT page refresh
    // -------------------------------------------------------------------
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await expect(page.locator('[data-component="link-episodes-modal"]')).not.toBeVisible({ timeout: 3000 });

    // -------------------------------------------------------------------
    // Step 5 – Verify DetailView shows language chips WITHOUT refresh
    // This is the core fix: _patchCurrentItemVideoUrls patches
    // currentSelectedItem episodes' video_urls reactively, so
    // DetailView (which reads episode.video_urls) updates immediately.
    // Previously this required a manual page refresh.
    // -------------------------------------------------------------------
    const languageChips = page.locator('[data-component="episode-card-detail-languages"]');
    const chipCount = await languageChips.count();
    expect(chipCount).toBeGreaterThan(0,
      `Expected language chips on episode cards in DetailView WITHOUT page refresh, found ${chipCount}`
    );

    // Verify no console errors
    expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
  });
});
