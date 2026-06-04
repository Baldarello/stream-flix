/**
 * E2E: navigation from the "La mia lista" home row to the dedicated
 * detail screen.
 *
 * Flow:
 *   1. The user lands on the home page.
 *   2. The "La mia lista" row renders a navigation icon next to the
 *      title (the OpenInNew button).
 *   3. Clicking that icon flips the active view to the dedicated
 *      "My List Detail" screen.
 *   4. The detail screen renders the back button, the new title,
 *      stats chips and the filter/sort toolbar.
 *   5. Pressing the back button returns to the home page.
 *
 * The test seeds the user library through the `?testMode=stores`
 * shortcut that the app exposes so the suite doesn't have to walk
 * the full add-to-list flow (which is exercised elsewhere).
 */
import { test, expect } from '@playwright/test';

const SEED_SHOW = {
    id: 9001,
    name: 'E2E Seeded Show',
    title: 'E2E Seeded Show',
    media_type: 'tv',
    poster_path: '/seeded-poster.jpg',
    seasons: [
        {season_number: 1, episodes: [{id: 90011, name: 'Ep 1'}]}
    ]
};

const SEED_MOVIE = {
    id: 9002,
    title: 'E2E Seeded Movie',
    name: 'E2E Seeded Movie',
    media_type: 'movie',
    poster_path: '/seeded-movie.jpg',
    video_urls: ['https://example.com/movie.mp4']
};

const seedMyList = async (page) => {
    await page.goto('/?testMode=stores');
    await page.waitForFunction(
        () => Boolean(window.__quixTest && window.__quixTest.mediaStore),
        null,
        {timeout: 10_000}
    );
    await page.evaluate((shows) => {
        const {mediaStore, remoteStore} = window.__quixTest;
        const lib = mediaStore;
        // Reset and seed two items so the detail view has something
        // to render against (and the stat chips get distinct values).
        lib.myList = [];
        for (const s of shows) {
            lib.toggleMyList(s);
        }
        // Make sure the home view is the one we land on after the
        // seeding so the navigation test starts from a clean state.
        mediaStore.setActiveView('Home');
    }, [SEED_SHOW, SEED_MOVIE]);
};

test.describe('MyList navigation', () => {
    test.beforeEach(async ({page}) => {
        await seedMyList(page);
    });

    test('clicking the open-detail icon next to "La mia lista" navigates to the dedicated screen', async ({page}) => {
        // Land on the home page (after the seeding redirect).
        await page.goto('/');
        // The row title is rendered by CinematicRow; the dedicated
        // navigation icon is the OpenInNew button with id
        // `row-view-detail` inside the misc.myList row.
        const myListRow = page.locator('#content-row-misc\\.myList');
        await expect(myListRow).toBeVisible();
        const detailButton = myListRow.locator('#row-view-detail');
        await expect(detailButton).toBeVisible();

        await detailButton.click();

        // The dedicated screen mounts with id `my-list-detail-view`.
        const detailView = page.locator('#my-list-detail-view');
        await expect(detailView).toBeVisible();
        await expect(detailView.locator('#my-list-detail-title')).toContainText(/My List|La mia lista/);
        await expect(detailView.locator('#my-list-detail-stats')).toBeVisible();
        await expect(detailView.locator('#my-list-detail-toolbar')).toBeVisible();
    });

    test('the back button on the dedicated screen returns to the home view', async ({page}) => {
        await page.goto('/');
        const myListRow = page.locator('#content-row-misc\\.myList');
        await myListRow.locator('#row-view-detail').click();

        const detailView = page.locator('#my-list-detail-view');
        await expect(detailView).toBeVisible();

        await detailView.locator('#my-list-detail-back').click();

        // After pressing back, the dedicated view is unmounted and
        // the home page is rendered again.
        await expect(page.locator('#my-list-detail-view')).toHaveCount(0);
        await expect(page.locator('#home-content-rows')).toBeVisible();
    });
});
