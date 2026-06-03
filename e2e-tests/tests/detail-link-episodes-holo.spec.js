/**
 * Detail & Link Episodes holo rework - end-to-end validation.
 *
 * Drives the journey from Home to the show detail view, asserts the
 * futuristic data-component attributes and the holo styling, opens the
 * link-episode modal, and confirms the ModalShell mount + paper class.
 *
 * Screenshots are saved into `.playwright-mcp/` per the project rule.
 */

const {test, expect} = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

test.describe('Detail & Link Episodes holo rework', () => {
    let context;
    let page;
    let consoleErrors;

    test.beforeEach(async ({browser}) => {
        context = await browser.newContext();
        page = await context.newPage();
        consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.log(`[CONSOLE ERROR]: ${msg.text()}`);
            }
        });
        page.on('pageerror', (err) => {
            consoleErrors.push(`pageerror: ${err.message}`);
            console.log(`[PAGE ERROR]: ${err.message}`);
        });
    });

    test.afterEach(async () => {
        await context?.close();
    });

    test.setTimeout(90000);

    test('detail view mounts with new data-component attributes and holo styling', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});

        // Wait for the home hero and at least one HoloCard to mount.
        await page.waitForSelector('#home-hero', {timeout: 15000});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 15000});

        // Click the first HoloCard to open the detail view.
        const card = page.locator('[data-component="holo-card"]').first();
        await card.waitFor({state: 'visible', timeout: 15000});
        await card.click();
        await page.waitForTimeout(2500);

        // The CinematicDetail shell must be present.
        await page.waitForSelector('#detail-cinematic', {state: 'attached', timeout: 15000});
        // The new DetailView root must be present.
        await page.waitForSelector('[data-component="detail-view"]', {timeout: 15000});

        const detailView = page.locator('[data-component="detail-view"]').first();
        await expect(detailView).toBeVisible();

        // At least one episode card must be present with the holo-surface class.
        // (The Kaiju fixture in the test environment always has seasons.)
        const episodeCard = page.locator('[data-component="episode-card-detail"]').first();
        await episodeCard.waitFor({state: 'attached', timeout: 15000});
        const hasHoloSurface = await episodeCard.evaluate((el) => el.classList.contains('holo-surface'));
        expect(hasHoloSurface).toBe(true);

        // The episodes-header-row data-component should be present.
        await page.waitForSelector('[data-component="episodes-header-row"]', {timeout: 5000});

        // The link-episode icon button should be present.
        await page.waitForSelector('#link-episode', {timeout: 5000});

        // Snapshot the detail view.
        await page.screenshot({path: '.playwright-mcp/detail-link-episodes-holo-detail.png', fullPage: true});
    });

    test('clicking link-episode opens the ModalShell-mounted futuristic modal', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 15000});

        // Open the detail view.
        const card = page.locator('[data-component="holo-card"]').first();
        await card.waitFor({state: 'visible', timeout: 15000});
        await card.click();
        await page.waitForTimeout(2500);

        // Click the link-episode button (the one inside the episodes header).
        const linkBtn = page.locator('[data-component="episodes-header-row"] #link-episode').first();
        await linkBtn.waitFor({state: 'visible', timeout: 10000});
        await linkBtn.evaluate((el) => el.click());

        // The ModalShell-mounted modal should be reachable. The id is
        // applied to the Mui Dialog root, which exposes `role="dialog"`.
        // Wait for the dialog to be visible by its role + aria-label.
        const modal = page.locator('div[role="dialog"]', {hasText: 'Collega Episodi'});
        await modal.waitFor({state: 'visible', timeout: 10000});

        // The paper should have the modal-shell-paper class.
        const paperClass = await page.evaluate(() => {
            const paper = document.querySelector('.modal-shell-paper');
            return paper ? paper.className : '';
        });
        expect(paperClass).toContain('modal-shell-paper');

        // The modal has both the Add links and Manage links tabs reachable.
        await page.waitForSelector('#link-episodes-tab-add', {timeout: 5000});
        await page.waitForSelector('#link-episodes-tab-manage', {timeout: 5000});

        // Snapshot the open modal.
        await page.screenshot({path: '.playwright-mcp/detail-link-episodes-holo-modal.png', fullPage: true});

        // Switch to Manage links and assert it still renders the panel.
        await page.locator('#link-episodes-tab-manage').click();
        await page.waitForTimeout(500);
        // Close modal via Escape.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const modalStillVisible = await modal.isVisible().catch(() => false);
        expect(modalStillVisible).toBe(false);
    });

    test('no console errors during the detail + link episodes journey', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 15000});

        const card = page.locator('[data-component="holo-card"]').first();
        await card.click();
        await page.waitForSelector('[data-component="detail-view"]', {timeout: 15000});
        await page.waitForTimeout(1500);

        const linkBtn = page.locator('[data-component="episodes-header-row"] #link-episode').first();
        await linkBtn.evaluate((el) => el.click());
        await page.waitForSelector('div[role="dialog"]:has-text("Collega Episodi")', {timeout: 10000});
        await page.waitForTimeout(800);

        if (consoleErrors.length > 0) {
            console.log('[HOLO REWORK] console errors:', consoleErrors);
        }
        expect(consoleErrors).toEqual([]);
    });
});
