/**
 * Google Drive sync conflict modal - holo rework end-to-end validation.
 *
 * Mounts the upgraded modal with a synthetic `syncConflictData`
 * fixture, asserts the new ModalShell paper, data-component
 * attributes, the overview → choose step navigation, the bulk-action
 * buttons and the "no console errors" contract.
 *
 * Screenshots are saved to `frontend/.playwright-mcp/` per the
 * project rule.
 */

const {test, expect} = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

const buildFixture = () => ({
    myList: {
        local: [101, 102],
        remote: [101, 103]
    },
    mediaLinks: {
        local: [
            {mediaId: 101, url: 'https://example.com/local-101.m3u8', label: 'L1', language: 'ITA', type: 'sub'}
        ],
        remote: [
            {mediaId: 101, url: 'https://example.com/remote-101.m3u8', label: 'R1', language: 'ITA', type: 'sub'},
            {mediaId: 103, url: 'https://example.com/remote-103.m3u8', label: 'R3', language: 'ITA', type: 'sub'}
        ]
    },
    episodeProgress: {
        local: [
            {episodeId: 'ep-101-s1e1', watched: true}
        ],
        remote: [
            {episodeId: 'ep-101-s1e1', watched: true},
            {episodeId: 'ep-103-s1e1', watched: true}
        ]
    },
    shows: new Map([
        [101, {
            local: {id: 101, name: 'Show A', media_type: 'tv', seasons: []},
            remote: {id: 101, name: 'Show A', media_type: 'tv', seasons: []}
        }],
        [102, {
            local: {id: 102, name: 'Show B', media_type: 'movie', seasons: []},
            remote: null
        }],
        [103, {
            local: null,
            remote: {id: 103, name: 'Show C', media_type: 'tv', seasons: []}
        }]
    ])
});

test.describe('Google Drive sync conflict modal - holo rework', () => {
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

    test('overview step mounts with ModalShell + new data-component attributes', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('#home-hero', {timeout: 15000});

        // Expose a dev-only fixture injector on the window so the test
        // can mount the modal without a real Google Drive sync flow.
        await page.evaluate((fixture) => {
            window.__openSyncConflictModal = (data) => {
                const mod = window.__mediaStore;
                if (!mod) return false;
                mod.syncConflictData = data;
                mod.isSyncConflictModalOpen = true;
                window.__syncConflictCancelCalls = 0;
                const origCancel = mod.cancelSyncAndLogout;
                if (!window.__cancelWrapped) {
                    mod.cancelSyncAndLogout = function () {
                        window.__syncConflictCancelCalls = (window.__syncConflictCancelCalls || 0) + 1;
                        if (typeof origCancel === 'function') return origCancel.apply(this, arguments);
                    };
                    window.__cancelWrapped = true;
                }
                return true;
            };
            window.__openSyncConflictModal(fixture);
        }, buildFixture());

        // The modal must mount inside the ModalShell.
        const modal = page.locator('#google-drive-sync-conflict-modal');
        await modal.waitFor({state: 'visible', timeout: 15000});
        await expect(modal).toHaveAttribute('data-component', 'google-drive-sync-conflict-modal');

        // The ModalShell paper must carry the modal-shell-paper class.
        const paper = page.locator('.modal-shell-paper');
        await paper.first().waitFor({state: 'visible', timeout: 15000});

        // Overview step must render.
        await page.waitForSelector('#sync-conflict-overview-step', {timeout: 10000});
        await page.waitForSelector('#sync-conflict-stats', {timeout: 10000});
        await page.waitForSelector('#sync-conflict-bulk-actions', {timeout: 10000});
        await page.waitForSelector('#sync-conflict-action-panel', {timeout: 10000});

        // Stats chips must expose the new HoloChip ids.
        await page.waitForSelector('#sync-conflict-stat-total', {timeout: 5000});

        // Overview snapshot.
        await page.screenshot({path: 'frontend/.playwright-mcp/google-drive-sync-conflict-holo-overview.png', fullPage: true});
    });

    test('continue navigates to choose step and back to overview', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('#home-hero', {timeout: 15000});

        await page.evaluate((fixture) => {
            window.__openSyncConflictModal = (data) => {
                const mod = window.__mediaStore;
                if (!mod) return false;
                mod.syncConflictData = data;
                mod.isSyncConflictModalOpen = true;
                return true;
            };
            window.__openSyncConflictModal(fixture);
        }, buildFixture());

        await page.waitForSelector('#sync-conflict-overview-step', {timeout: 10000});
        const modal = page.locator('#google-drive-sync-conflict-modal');
        await modal.waitFor({state: 'visible', timeout: 15000});

        // Click "Continua e scegli per ogni show".
        const continueButton = page.locator('#sync-conflict-action-continue');
        await continueButton.click();

        // Choose step must be visible.
        await page.waitForSelector('#sync-conflict-choose-step', {timeout: 10000});
        // At least one choice row must be visible.
        const firstRow = page.locator('[data-component="sync-conflict-choice-row"]').first();
        await firstRow.waitFor({state: 'visible', timeout: 10000});

        // Snapshot the choose step.
        await page.screenshot({path: 'frontend/.playwright-mcp/google-drive-sync-conflict-holo-choose.png', fullPage: true});

        // Click "Indietro" → back to overview.
        const backButton = page.locator('#sync-conflict-action-back');
        await backButton.click();
        await page.waitForSelector('#sync-conflict-overview-step', {timeout: 10000});
    });

    test('cancel CTA fires onCancel callback', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('#home-hero', {timeout: 15000});

        await page.evaluate((fixture) => {
            window.__syncConflictCancelCalls = 0;
            window.__openSyncConflictModal = (data) => {
                const mod = window.__mediaStore;
                if (!mod) return false;
                mod.syncConflictData = data;
                mod.isSyncConflictModalOpen = true;
                const origCancel = mod.cancelSyncAndLogout;
                if (!window.__cancelWrapped) {
                    mod.cancelSyncAndLogout = function () {
                        window.__syncConflictCancelCalls = (window.__syncConflictCancelCalls || 0) + 1;
                        if (typeof origCancel === 'function') return origCancel.apply(this, arguments);
                    };
                    window.__cancelWrapped = true;
                }
                return true;
            };
            window.__openSyncConflictModal(fixture);
        }, buildFixture());

        await page.waitForSelector('#sync-conflict-overview-step', {timeout: 10000});
        const cancelButton = page.locator('#sync-conflict-action-cancel');
        await cancelButton.click();

        const calls = await page.evaluate(() => window.__syncConflictCancelCalls || 0);
        expect(calls).toBeGreaterThanOrEqual(1);
    });

    test.afterAll(async () => {
        expect(consoleErrors || []).toEqual([]);
    });
});
