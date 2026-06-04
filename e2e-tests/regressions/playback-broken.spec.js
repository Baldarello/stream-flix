/**
 * Regression: starting local playback from a card no longer works.
 *
 * Steps:
 *  1. Open the app
 *  2. Click the hero's Play button (the central entry-point for
 *     `mediaStore.startPlayback(heroContent)`)
 *  3. The hero content has multiple sources, so the link selection
 *     modal must appear, OR the player must mount (if a single source)
 *  4. Pick a source in the modal
 *  5. The local player view must mount (`data-view-key="player"`)
 *     and the video element must be present
 *
 * Bug: the new `startPlayback` orchestrator in `mediaStore.js` was
 * assigning `this.linksForSelection = ...` / `this.isLinkSelectionModalOpen = true`
 * directly on the `mediaStore` instance. The store only exposes
 * *getters* for those fields (delegated to `uiStore`), so the writes
 * never reached the ui store and the modal never opened — breaking
 * playback for any content that has more than one source.
 */
const {test, expect} = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

test.describe('Local playback regression', () => {
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
            }
        });
        page.on('pageerror', (err) => {
            consoleErrors.push(`pageerror: ${err.message}`);
        });
    });

    test.afterEach(async () => {
        await context?.close();
    });

    test('startPlayback opens the link selection modal when the item has multiple sources', async () => {
        // The bug only manifested when the user picked a content that
        // had multiple sources. In the e2e fixture the hero always
        // points at a TV show from the catalog which may or may not
        // have links persisted yet, so we drive the store directly
        // through the `?testMode=stores` hook.
        await page.goto(BASE_URL + '/?testMode=stores', {waitUntil: 'networkidle'});
        await page.waitForFunction(() => !!window.__quixTest, {timeout: 15000});

        // Seed a fake media item with multiple links.
        await page.evaluate(async () => {
            const {mediaStore} = window.__quixTest;
            // Use a known good show id (Breaking Bad, 1396) and
            // inject two distinct sources. The store is fully
            // constructed at this point, so writing through the
            // public surface is enough.
            const item = {
                id: 1396,
                title: 'Breaking Bad',
                media_type: 'tv',
                name: 'Breaking Bad',
                video_urls: [
                    {id: 1, url: 'https://example.com/source1.mp4', language: 'it', type: 'sub', label: 'Source 1'},
                    {id: 2, url: 'https://example.com/source2.mp4', language: 'en', type: 'sub', label: 'Source 2'},
                ],
            };
            await mediaStore.startPlayback(item);
        });

        // The link selection modal must be open and `itemForLinkSelection`
        // must point at our item.
        await page.waitForFunction(() => {
            const s = window.__quixTest;
            return s && s.mediaStore.isLinkSelectionModalOpen === true;
        }, {timeout: 5000});

        const finalState = await page.evaluate(() => {
            const s = window.__quixTest;
            return {
                isLinkSelectionModalOpen: s.mediaStore.isLinkSelectionModalOpen,
                linksForSelectionCount: (s.mediaStore.linksForSelection || []).length,
                nowPlayingItem: !!s.mediaStore.nowPlayingItem,
            };
        });
        console.log('Final state after startPlayback with multi-source:', JSON.stringify(finalState, null, 2));

        expect(finalState.isLinkSelectionModalOpen).toBe(true);
        expect(finalState.linksForSelectionCount).toBe(2);
        // Player should not have started yet (waiting on the user to pick a source).
        expect(finalState.nowPlayingItem).toBe(false);
    });

    test('startPlayback mounts the player directly when the item has a single source', async () => {
        await page.goto(BASE_URL + '/?testMode=stores', {waitUntil: 'networkidle'});
        await page.waitForFunction(() => !!window.__quixTest, {timeout: 15000});

        // Seed a fake media item with a single source and start playback.
        await page.evaluate(async () => {
            const {mediaStore} = window.__quixTest;
            const item = {
                id: 999999,
                title: 'Single Source Movie',
                media_type: 'movie',
                video_urls: [
                    {id: 99, url: 'https://example.com/only-source.mp4', language: 'it', type: 'sub', label: 'Only Source'},
                ],
            };
            await mediaStore.startPlayback(item);
        });

        // The modal must NOT be open, and the player must mount.
        await page.waitForSelector('[data-view-key="player"]', {timeout: 10000});
        const state = await page.evaluate(() => {
            const s = window.__quixTest;
            return {
                isLinkSelectionModalOpen: s.mediaStore.isLinkSelectionModalOpen,
                nowPlayingItem: !!s.mediaStore.nowPlayingItem,
            };
        });
        console.log('Final state after startPlayback with single source:', JSON.stringify(state, null, 2));

        expect(state.isLinkSelectionModalOpen).toBe(false);
        expect(state.nowPlayingItem).toBe(true);
    });
});
