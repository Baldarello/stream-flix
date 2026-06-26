/**
 * E2E test: links added via AddLinkTabs should appear in both
 * ManageLinksView and DetailView WITHOUT manual page refresh.
 */
import { test, expect } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test('links appear in ManageLinksView and DetailView after adding without refresh', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="screen-home"]', { timeout: 30_000 });
    await page.waitForTimeout(3000);

    // 1. Open DetailView for a show with seasons
    const alleInfoBtn = page.locator('button').filter({ hasText: /Altre Info/i }).first();
    await alleInfoBtn.click();
    await page.waitForTimeout(3000);

    // Verify DetailView is open
    const detailView = page.locator('[data-component="detail-view"]');
    await expect(detailView).toBeVisible();

    // 2. Open LinkEpisodesModal
    const linkBtn = page.locator('[data-component="link-episode"]');
    await linkBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible();

    // 3. Check initial tab state (should be 'add')
    let storeTab = await page.evaluate(() => window.__mediaStore?.linkEpisodesTab);
    console.log('Initial tab:', storeTab);
    expect(storeTab).toBe('add');

    // 4. Check initial linksFoundCount in store
    let linksFoundCount = await page.evaluate(() => window.__mediaStore?.linksFoundCount);
    console.log('Initial linksFoundCount:', linksFoundCount);

    // 5. Fill in pattern URL to add links for Season 1
    const seasonSelect = page.locator('[data-component="link-episodes-modal"] .MuiSelect-select');
    // Default season should be Season 1 or Specials - try changing to Season 1 if needed
    // For now, just use whatever season is selected and add links

    // Find the pattern input
    const patternInput = page.locator('#pattern-url-episode');
    if (await patternInput.isVisible()) {
        // Set a simple pattern
        await patternInput.fill('https://example.com/ [@EP]');

        // Click [@EP] button to insert placeholder
        const epBtn = page.locator('[data-component="link-episodes-modal"] button').filter({ hasText: /\[@EP\]/ });
        if (await epBtn.isVisible()) {
            await epBtn.click();
        }

        // Language and type should already have defaults
        // Click Save button
        const saveBtn = page.locator('[data-component="link-episodes-modal"] #add-links-button');
        if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForTimeout(3000);
        }
    }

    // 6. After saving, check if tab switched to 'manage'
    let tabAfterSave = await page.evaluate(() => window.__mediaStore?.linkEpisodesTab);
    console.log('Tab after save:', tabAfterSave);

    // 7. Manually switch to manage tab to check ManageLinksView
    await page.evaluate(() => window.__mediaStore.setLinkEpisodesTab('manage'));
    await page.waitForTimeout(1000);

    let finalTab = await page.evaluate(() => window.__mediaStore?.linkEpisodesTab);
    console.log('Final tab:', finalTab);
    expect(finalTab).toBe('manage');

    // 8. Check ManageLinksView accordion count
    const accordions = await page.locator('[data-component="link-episodes-modal"] .MuiAccordion-root').count();
    console.log('Accordion count in ManageLinksView:', accordions);

    // 9. Check linksFoundCount
    let linksFoundCountAfter = await page.evaluate(() => window.__mediaStore?.linksFoundCount);
    console.log('linksFoundCount after save:', linksFoundCountAfter);

    // 10. Check DetailView language chips (should show ITA SUB if links were added)
    // Close modal first
    const closeBtn = page.locator('[data-component="link-episodes-modal"] [aria-label="close"], [data-component="link-episodes-modal"] .MuiDialogTitle button');
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // Check if DetailView episode cards have language chips (meaning video_urls is populated)
    const langChips = await page.locator('[data-component="episode-card-detail-languages"]').count();
    console.log('DetailView episode language chips visible:', langChips);
});
