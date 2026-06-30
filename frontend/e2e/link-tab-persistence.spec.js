/**
 * E2E: clicking the "Manage Links" tab must NOT reset the modal to
 * the "Add Links" tab.
 *
 * Root cause this guards against: ManageLinksView calls
 * refreshLinksForShow on mount → linksRefreshVersion++ → the old
 * CinematicDetail key included linksRefreshVersion, remounting
 * DetailView (and LinkEpisodesModal inside it), which wiped the
 * modal's useRef state and reset the active tab to 'add'.
 */
import {expect, test} from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test('Manage Links tab stays active after ManageLinksView mounts', async ({page}) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#screen-home', {timeout: 30_000, state: 'attached'});
    await page.waitForTimeout(3000);

    // Open DetailView for a show with seasons
    const alleInfoBtn = page.locator('button').filter({hasText: /altre info/i}).first();
    await alleInfoBtn.click();
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-component="detail-view"]')).toBeVisible({timeout: 10_000});

    // Open LinkEpisodesModal
    const linkBtn = page.locator('[data-component="link-episode"]');
    await linkBtn.click();
    await page.waitForTimeout(1000);
    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({timeout: 5000});

    // Initial tab is 'add'
    let storeTab = await page.evaluate(() => window.__mediaStore?.linkEpisodesTab);
    expect(storeTab).toBe('add');

    // Click the "Manage Links" tab — ManageLinksView mounts and calls
    // refreshLinksForShow, which previously triggered the reset bug.
    await page.locator('#link-episodes-tab-manage').click();
    await page.waitForTimeout(2000);

    // The tab must still be 'manage' — not reset to 'add'
    storeTab = await page.evaluate(() => window.__mediaStore?.linkEpisodesTab);
    expect(storeTab).toBe('manage');

    // AddLinkTabs must NOT be visible (no pattern input)
    await expect(page.locator('#pattern-url-episode')).toBeHidden();

    const relevantErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource')
    );
    expect(relevantErrors, `Console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);
});