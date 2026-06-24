// Test: Links added via LinkEpisodesModal appear in DetailView without page refresh
// Verifies Task 3 of the link-store-rework plan:
// - Links added via pattern in modal are persisted
// - Manage tab shows links correctly
// - DetailView reflects new links without refresh (language chips visible)

const { test, expect } = require('@playwright/test');

test.describe('Link store rework — modal → detail sync', () => {

  test('links added via pattern in LinkEpisodesModal appear in DetailView without refresh', async ({ page }) => {
    // -------------------------------------------------------------------
    // Step 1 – Login as guest
    // -------------------------------------------------------------------
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');

    const guestBtn = page.locator('button:has-text("Guest")').first();
    await guestBtn.click();
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------------
    // Step 2 – Search for a TV show
    // -------------------------------------------------------------------
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    await searchInput.fill('Dragon Ball');
    await page.waitForTimeout(1000);

    // Click the first result card
    const firstResult = page.locator('[data-component="media-card"], [data-testid*="media-card"], a[href*="/tv/"]').first();
    await firstResult.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------------
    // Step 3 – Open Link Episodes Modal (click the link-icon button)
    // -------------------------------------------------------------------
    // Try data-component first, fall back to aria-label / text
    let linkEpisodesBtn = page.locator('[data-component="link-episodes-button"], [aria-label*="link episodes"], button:has-text("Link Episodes")').first();
    await linkEpisodesBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------
    // Step 4 – Select season 1
    // -------------------------------------------------------------------
    // Season selectors may be radio buttons, tabs, or list items
    const season1Selector = page.locator(
      '[data-component*="season"]:has-text("1"), ' +
      '[data-component*="season-tab"]:has-text("1"), ' +
      '[role="radio"]:has-text(/1/i), ' +
      'button:has-text(/season.*1/i), ' +
      '[data-component="season-1"]'
    ).first();
    await season1Selector.click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------
    // Step 5 – Fill URL pattern with [@EP] placeholder
    // -------------------------------------------------------------------
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.fill('https://example.com/episode/[@EP]');

    // -------------------------------------------------------------------
    // Step 6 – Set padding to 1
    // -------------------------------------------------------------------
    const paddingInput = page.locator(
      'input[id*="padding"], input[id*="offset"], [data-component*="padding"]'
    ).first();
    await paddingInput.fill('1');

    // -------------------------------------------------------------------
    // Step 7 – Click the add / save button
    // -------------------------------------------------------------------
    const addBtn = page.locator('#add-links-button');
    await addBtn.click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------
    // Step 8 – Wait for success snackbar or modal to settle
    // -------------------------------------------------------------------
    // Snackbar (toast) is typical for success feedback
    const snackbar = page.locator(
      '[data-component*="snackbar"], [role="status"], [role="alert"]:has-text(/success|saved|added/i), ' +
      'text=/link.*add|links.*saved|success/i'
    ).first();
    // Wait up to 4s for snackbar, then allow it to disappear
    try {
      await snackbar.waitFor({ state: 'visible', timeout: 4000 });
      await page.waitForTimeout(1500); // let snackbar show briefly
    } catch {
      // Snackbars may auto-dismiss; continue if not found
    }

    // -------------------------------------------------------------------
    // Step 9 – Switch to the "Manage" tab
    // -------------------------------------------------------------------
    const manageTab = page.locator('#link-episodes-tab-manage');
    await manageTab.click();
    await page.waitForTimeout(800);

    // -------------------------------------------------------------------
    // Step 10 – Verify links appear in Manage tab
    // -------------------------------------------------------------------
    const episodeCards = page.locator('[data-component="episode-card-detail"]');
    const episodeCount = await episodeCards.count();
    expect(episodeCount).toBeGreaterThan(0);

    // Count episode cards that have at least one link chip / URL indicator
    const cardsWithLinks = page.locator(
      '[data-component="episode-card-detail"]:has([href*="example.com"]), ' +
      '[data-component="episode-card-detail"]:has-text("example.com")'
    );
    const linkedCount = await cardsWithLinks.count();
    expect(linkedCount).toBeGreaterThan(0,
      `Expected at least 1 episode card with links in Manage tab, found ${linkedCount}`
    );

    // -------------------------------------------------------------------
    // Step 11 – Close the modal (Escape key)
    // -------------------------------------------------------------------
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Modal should be gone
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // -------------------------------------------------------------------
    // Step 12 – Verify DetailView shows language chips on episode cards
    //           (indicating links are present without a page refresh)
    // -------------------------------------------------------------------
    const languageChips = page.locator('[data-component="episode-card-detail-languages"]');
    const chipCount = await languageChips.count();
    expect(chipCount).toBeGreaterThan(0,
      `Expected language chips on episode cards in DetailView after adding links, found ${chipCount}`
    );
  });
});
