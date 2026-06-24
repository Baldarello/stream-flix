/**
 * @fileoverview Invariant: every top-level route in the app must expose the
 * topmost `<main>` or `<section>` landmark as a stable, named element by
 * giving it a non-empty `id` attribute.
 *
 * Why: a11y tooling (axe), smoke tests, transition timelines, deep links, and
 * end-to-end debugging all key off the root landmark id of the currently
 * visible view. A route that lands on an anonymous `<main>` (or worse, no
 * `<main>`/`<section>` at all) breaks screen-reader navigation, axe
 * landmarks, and every other invariant that assumes landmarks are named.
 *
 * The test aggregates the violations across all routes and reports them as a
 * single failure so the suite surfaces the full backlog in one run.
 */
import { test, expect } from '@playwright/test';

const SEED_MOVIE = {
    id: 91001,
    title: 'Invariant Seed Movie',
    name: 'Invariant Seed Movie',
    media_type: 'movie',
    poster_path: '/invariant-poster.jpg',
    backdrop_path: '/invariant-backdrop.jpg',
    overview: 'Synthetic item used by the ids-on-roots invariant test.',
    video_url: 'https://example.com/invariant.mp4',
    video_urls: ['https://example.com/invariant.mp4'],
};

const SEED_DETAIL_ITEM = {
    id: 91002,
    title: 'Invariant Seed Detail',
    name: 'Invariant Seed Detail',
    media_type: 'movie',
    poster_path: '/invariant-detail-poster.jpg',
    backdrop_path: '/invariant-detail-backdrop.jpg',
    overview: 'Synthetic detail item used by the ids-on-roots invariant test.',
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

/**
 * Each route declares:
 *   - name: the route id used in the failure report
 *   - navigate: drives the app into that route via the `?testMode=stores`
 *     hook exposed by `App.jsx` (stable across CSS refactors)
 *   - expectedViewKey: the `data-view-key` value the orchestrator publishes
 *     once the route is mounted. Used to confirm we actually arrived at
 *     the route before probing the DOM.
 */
const ROUTES = [
    {
        name: 'home',
        expectedViewKey: 'home',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            // Force the active view back to "Home" so a leftover active view
            // from a previous navigation cannot mask a missing home landmark.
            await page.evaluate(() => {
                window.__quixTest.mediaStore.setActiveView('Home');
            });
        },
    },
    {
        name: 'search',
        expectedViewKey: 'search',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            // The `?testMode=stores` hook only exposes mediaStore /
            // remoteStore / fxStore (see App.jsx). Drive the search
            // state through the public mediaStore action so we don't
            // poke at an unexposed store.
            await page.evaluate(() => {
                const { mediaStore } = window.__quixTest;
                mediaStore.setActiveView('Home');
                mediaStore.toggleSearch(true);
            });
        },
    },
    {
        name: 'library',
        expectedViewKey: 'home',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            await page.evaluate(() => {
                const { mediaStore } = window.__quixTest;
                mediaStore.setActiveView('Libreria');
            });
        },
    },
    {
        name: 'settings',
        expectedViewKey: 'home',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            // No dedicated settings view exists yet; the invariant still
            // requires the resulting topmost landmark to be named. The
            // current fallback is the home view, so we land on Home and
            // let the probe document the situation.
            await page.evaluate(() => {
                window.__quixTest.mediaStore.setActiveView('Home');
            });
        },
    },
    {
        name: 'detail',
        expectedViewKey: 'home',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            await page.evaluate((item) => {
                const { mediaStore } = window.__quixTest;
                mediaStore.setActiveView('Home');
                mediaStore.selectedItem = item;
            }, SEED_DETAIL_ITEM);
        },
    },
    {
        name: 'player',
        expectedViewKey: 'player',
        navigate: async (page) => {
            await page.goto(`${BASE_URL}/?testMode=stores`);
            await page.waitForFunction(
                () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
                null,
                { timeout: 15000 }
            );
            await page.evaluate((item) => {
                const { mediaStore } = window.__quixTest;
                mediaStore.setActiveView('Home');
                mediaStore.nowPlayingItem = item;
            }, SEED_MOVIE);
        },
    },
];

/**
 * Probe the rendered DOM for the topmost `<main>` or `<section>` element
 * and report its tag and id. Returns `null` id values verbatim so the
 * caller can distinguish "no landmark present" from "landmark present but
 * anonymous".
 */
const probeTopmostLandmark = `
    () => {
        const el = document.querySelector('main, section');
        if (!el) {
            return { found: false, tag: null, id: null };
        }
        return {
            found: true,
            tag: el.tagName ? el.tagName.toLowerCase() : null,
            id: el.getAttribute('id'),
        };
    }
`;

test.describe('ids-on-roots invariant', () => {
    test('every route exposes an id on the topmost <main> or <section>', async ({ page }) => {
        const missing = [];

        for (const route of ROUTES) {
            await route.navigate(page);

            // Wait for the ViewSwitch to publish the expected view key
            // (or fall back to `home` for routes that have no dedicated
            // orchestrator branch, like `settings` and `detail`).
            await page.waitForFunction(
                (key) => {
                    const branch = document.querySelector('[data-view-key]');
                    return branch && branch.getAttribute('data-view-key') === key;
                },
                route.expectedViewKey,
                { timeout: 10000 }
            ).catch(() => {
                // Don't abort the loop: the invariant check below will
                // still report the missing landmark.
            });

            const probe = await page.evaluate(new Function('return (' + probeTopmostLandmark + ')()'));

            if (!probe.found) {
                missing.push(
                    `${route.name}: no <main> or <section> element rendered at the top of the route`
                );
                continue;
            }

            if (!probe.id || probe.id.trim() === '') {
                missing.push(
                    `${route.name}: topmost <${probe.tag}> has no id attribute`
                );
            }
        }

        expect(
            missing,
            `Routes missing an id on the topmost <main>/<section>:\n` +
                missing.map((m) => `  - ${m}`).join('\n')
        ).toEqual([]);
    });
});
