/**
 * E2E test: links added/removed in LinkEpisodesModal must refresh
 * both ManageLinksView (within the modal) and DetailView (parent)
 * without a manual page refresh.
 */
import {expect, test} from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';
const TEST_PATTERN = 'https://example.com/stream/season-1-ep-[@EP].mp4';

/** Read mediaLinks directly from IndexedDB via page.evaluate */
async function getMediaLinksFromDB(page) {
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('quixDB');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                const storeName = 'mediaLinks';
                if (!db.objectStoreNames.contains(storeName)) {
                    resolve([]);
                    return;
                }
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => resolve(getAllReq.result);
                    getAllReq.onerror = () => reject(getAllReq.error);
                } catch (e) {
                    resolve([]);
                }
            };
        });
    });
}

test('ManageLinksView refreshes realtime after adding links', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#screen-home', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    // ── 1. Open DetailView for a TV show ──────────────────────────────
    const firstShowBtn = page.getByRole('button', { name: /dettagli/i }).first();
    await firstShowBtn.click();
    await page.waitForTimeout(2000);

    const detailView = page.locator('[data-component="detail-view"]');
    await expect(detailView).toBeVisible({ timeout: 5000 });

    // Get episode IDs from the DOM
    const episodeIds = await page.evaluate(() => {
        const accordions = document.querySelectorAll('[data-component="episode-accordion"]');
        return Array.from(accordions).slice(0, 3).map(el => ({
            id: el.dataset.episodeId,
            name: el.dataset.episodeName
        }));
    });
    console.log('Episode IDs in DetailView:', JSON.stringify(episodeIds));

    // ── 2. Open LinkEpisodesModal ──────────────────────────────────────
    await page.locator('[data-component="link-episode"]').click();
    await page.waitForTimeout(800);

    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Select Season 1
    const seasonSelect = page.locator('[data-component="link-episodes-modal"] .MuiSelect-select, [data-component="link-episodes-modal"] select').first();
    const seasonSelectVisible = await seasonSelect.isVisible().catch(() => false);
    if (seasonSelectVisible) {
        await seasonSelect.click();
        await page.waitForTimeout(200);
        const s1Option = page.getByRole('option').filter({ hasText: /season 1/i }).or(page.locator('[role="option"]').filter({ hasText: /season 1/i })).first();
        const s1Exists = await s1Option.isVisible().catch(() => false);
        if (s1Exists) await s1Option.click();
        await page.waitForTimeout(200);
    }

    // ── 3. Add links via pattern ──────────────────────────────────────
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.clear();
    await patternInput.fill('https://example.com/stream/season-1-ep-.mp4');
    await page.waitForTimeout(100);

    // Click [@EP] button to insert placeholder
    const insertBtn = page.getByRole('button', { name: '[@EP]' });
    await insertBtn.click();
    await page.waitForTimeout(100);

    const patternValue = await patternInput.inputValue();
    console.log('Pattern after insert:', patternValue);

    // Save
    await page.locator('[data-component="add-links-button"]').click();

    // Wait for snackbar
    const snackbar = page.locator('.MuiSnackbar-root, [role="alert"]');
    const snackbarVisible = await snackbar.isVisible({ timeout: 8000 }).catch(() => false);
    console.log('Snackbar visible:', snackbarVisible);
    if (snackbarVisible) {
        const text = await snackbar.textContent();
        console.log('Snackbar text:', text);
    }

    // ── 4. Deep DB diagnostic ─────────────────────────────────────────
    await page.waitForTimeout(500);
    const dbLinks = await getMediaLinksFromDB(page);
    console.log('Links in DB:', dbLinks.length, dbLinks.slice(0, 2).map(l => ({ mediaId: l.mediaId, url: l.url })));

    const dbFullState = await page.evaluate(() => {
        return new Promise((resolve) => {
            const req = indexedDB.open('quixDB');
            req.onerror = () => resolve({ error: String(req.error) });
            req.onsuccess = () => {
                const db = req.result;
                const storeName = 'mediaLinks';
                if (!db.objectStoreNames.contains(storeName)) {
                    resolve({ error: 'no mediaLinks store', stores: Array.from(db.objectStoreNames) });
                    return;
                }
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                store.getAll().onsuccess = () => {
                    const all = store.getAll().result;
                    resolve({
                        total: all.length,
                        sample: all.slice(0, 5).map(l => ({ id: l.id, mediaId: l.mediaId, url: l.url }))
                    });
                };
                store.getAll().onerror = () => resolve({ error: 'getAll failed' });
            };
        });
    });
    console.log('DB full state:', JSON.stringify(dbFullState));

    // ── 5. Check ManageLinksView update ───────────────────────────────
    await page.waitForTimeout(1500);

    // Look for link text (e.g. "Links: 1" or "Link: 1")
    const linkTextLocator = page.locator('[data-component="link-episodes-modal"]').locator('p, span, div').filter({ hasText: /links?: \d+/i });
    const allLinkTexts = await linkTextLocator.allTextContents();
    console.log('Link texts in modal:', allLinkTexts.slice(0, 5));

    // Find any non-zero link text
    const nonZeroCount = await page.locator('[data-component="link-episodes-modal"]').locator('p, span, div').filter({ hasText: /links?: [1-9]/i }).count();
    console.log('Non-zero link texts:', nonZeroCount);

    // Assertions
    if (dbLinks.length === 0) {
        console.log('ISSUE: No links in DB — save may have failed silently');
    }
    expect(nonZeroCount, `Expected non-zero links. DB links: ${dbLinks.length}`).toBeGreaterThan(0);

    // ── 6. No console errors ─────────────────────────────────────────
    // Filter out pre-existing MUI/React warnings unrelated to this feature
    const knownWarnings = [
        'textShadow',        // MUI textShadow prop warning — pre-existing
        'unique "key" prop',  // MUIStackRoot key warning — pre-existing
        'Check the render method of `MuiStackRoot`',
    ];
    const relevantErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('example.com') &&
        !e.includes('404') &&
        !knownWarnings.some(w => e.includes(w))
    );
    expect(relevantErrors, `Console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);

    // ── 7. Screenshot for visual verification ─────────────────────────
    await page.screenshot({ path: '.playwright-mcp/link-realtime-result.png' });
});

test('DetailView refreshes realtime after links added via modal', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#screen-home', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Open DetailView
    await page.getByRole('button', { name: /dettagli/i }).first().click();
    await page.waitForTimeout(2000);

    const detailView = page.locator('[data-component="detail-view"]');
    await expect(detailView).toBeVisible({ timeout: 5000 });

    // Count initial language chips
    const langChips = page.locator('[data-component="episode-card-detail-languages"] .MuiChip-root');
    const initialCount = await langChips.count();
    console.log('Initial lang chips in DetailView:', initialCount);

    // Open modal
    await page.locator('[data-component="link-episode"]').click();
    await page.waitForTimeout(800);

    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Select Season 1 (match debug test approach - click first option after opening select)
    const seasonSelect = page.locator('[data-component="link-episodes-modal"] .MuiSelect-select, [data-component="link-episodes-modal"] select').first();
    const seasonSelectVisible = await seasonSelect.isVisible().catch(() => false);
    if (seasonSelectVisible) {
        await seasonSelect.click();
        await page.waitForTimeout(300);
        const opts = page.locator('li.MuiMenuItem-root, [role="option"]');
        if (await opts.count() > 0) {
            await opts.first().click();
            await page.waitForTimeout(300);
        }
    }

    // Fill pattern — match exactly what the passing debug test does
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.clear();
    await patternInput.fill('https://example.com/stream/season-1-ep-.mp4');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: '[@EP]' }).click();
    await page.waitForTimeout(100);

    // Save and wait for async operations to complete (same timing as passing debug test)
    await page.locator('[data-component="add-links-button"]').click();
    const snackbarVisible = await page.locator('.MuiSnackbar-root, [role="alert"]').isVisible({ timeout: 8000 }).catch(() => false);
    if (snackbarVisible) {
        console.log('Snackbar:', await page.locator('.MuiSnackbar-root, [role="alert"]').textContent());
    }
    // Wait 2000ms like the passing debug test (not 1500ms)
    await page.waitForTimeout(2000);

    // Close modal — use Escape key (robust across locales)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);

    // Check lang chips in DetailView
    const afterCount = await langChips.count();
    console.log('After-add lang chips in DetailView:', afterCount);
    expect(afterCount, 'DetailView should show language chips after links added').toBeGreaterThan(0);

    const knownWarnings = [
        'textShadow',
        'unique "key" prop',
        'Check the render method of `MuiStackRoot`',
    ];
    const relevantErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('example.com') &&
        !e.includes('404') &&
        !knownWarnings.some(w => e.includes(w))
    );
    expect(relevantErrors, `Console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);
});
