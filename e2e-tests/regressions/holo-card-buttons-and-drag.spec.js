/**
 * Regression: HoloCard buttons are clickable and the row is drag-and-drop
 * reorderable.
 *
 * Two related bugs in `frontend/components/layout/HoloCard.jsx`:
 *   1. Clicking the add-to-list / reorder buttons always opens the card
 *      detail view (click bubbles to the root, plus the 3D tilt moves the
 *      button hit-area out from under the cursor between mousedown and
 *      mouseup).
 *   2. Holding the left mouse button on a "La mia lista" card selects the
 *      text in blue (no `user-select: none`, no `draggable` attribute) –
 *      there is no HTML5 drag-and-drop reordering wired up.
 */

const {test, expect} = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

// Returns the list of card-ids currently rendered inside the
// "La mia lista" row (the only row that supports drag-and-drop).
const readMyListCardIds = async (page) =>
    page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-component="cinematic-row"]'));
        for (const row of rows) {
            const titleEl = row.querySelector('[data-testid="row-title"]');
            if (!titleEl) continue;
            const text = (titleEl.textContent || '').trim().toLowerCase();
            if (text.includes('mia lista') || text.includes('my list')) {
                const cards = Array.from(row.querySelectorAll('[data-component="holo-card"]'));
                return cards.map((c) => c.getAttribute('data-card-id'));
            }
        }
        return null;
    });

// Returns a card-ids list for the first non-mylist row that has
// at least one card. Used to seed "La mia lista" with a second
// item via the add-to-list button.
const readFirstNonMyListRowFirstCardId = async (page) =>
    page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-component="cinematic-row"]'));
        for (const row of rows) {
            const titleEl = row.querySelector('[data-testid="row-title"]');
            if (!titleEl) continue;
            const text = (titleEl.textContent || '').trim().toLowerCase();
            if (text.includes('mia lista') || text.includes('my list')) continue;
            const cards = Array.from(row.querySelectorAll('[data-component="holo-card"]'));
            if (cards.length === 0) continue;
            return cards[0].getAttribute('data-card-id');
        }
        return null;
    });

// Clicks the .add-to-list-btn of the card with the given id
// using a realistic press (mousedown -> tiny drift -> mouseup)
// to exercise the same code path that was buggy in production.
const clickAddToListForCard = async (page, cardId) => {
    const card = page.locator(`[data-card-id="${cardId}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(200);
    const btn = await card.locator('.add-to-list-btn').elementHandle();
    if (!btn) return false;
    const box = await btn.boundingBox();
    if (!box) return false;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 4, cy + 4, {steps: 5});
    await page.mouse.up();
    await page.waitForTimeout(400);
    return true;
};

test.describe('Regression - HoloCard buttons + drag-and-drop', () => {
    let context;
    let page;

    test.beforeEach(async ({browser}) => {
        context = await browser.newContext();
        page = await context.newPage();
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
        page.__consoleErrors = errors;
    });

    test.afterEach(async () => {
        await context?.close();
    });

    test('Pressing the add-to-list button with cursor drift does NOT open the detail view', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 10000});

        // Hover the first card to reveal the action button.
        const firstCard = page.locator('[data-component="holo-card"]').first();
        await firstCard.hover();
        await page.waitForTimeout(200);

        // The detail view must not be attached yet.
        expect(await page.$('#detail-cinematic')).toBeNull();

        // Locate the add-to-list button and compute its center.
        const btnHandle = await firstCard.locator('.add-to-list-btn').elementHandle();
        expect(btnHandle).not.toBeNull();
        const box = await btnHandle.boundingBox();
        expect(box).not.toBeNull();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        // Realistic press: move into the button, press, drift a few pixels
        // (mimicking human inaccuracy), then release. The 3D tilt handler
        // is bound to `mousemove` on the card root, so any drift between
        // mousedown and mouseup will move the inner transform and pull the
        // button hit area out from under the cursor.
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 4, cy + 4, {steps: 5});
        await page.mouse.up();

        // Wait a small amount and then assert: detail view must NOT be attached.
        await page.waitForTimeout(400);
        const detail = await page.$('#detail-cinematic');
        expect(detail).toBeNull();
    });

    test('Drag-and-drop reorders cards in the "La mia lista" row', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 10000});

        // Read the current "La mia lista" contents. The row is only
        // rendered when the user has at least one item, so an empty
        // list means we get `null` here.
        let myListIds = await readMyListCardIds(page);

        // Always try to seed "La mia lista" with at least 2 distinct
        // items. The test always adds (or attempts to add) two items
        // from other rows via the add-to-list button, then waits for
        // the row to appear. This keeps the test self-contained and
        // independent of any pre-existing state in IndexedDB.
        const seed1 = await readFirstNonMyListRowFirstCardId(page);
        // Find a second candidate that is different from seed1.
        const seed2 = await page.evaluate((exclude) => {
            const rows = Array.from(document.querySelectorAll('[data-component="cinematic-row"]'));
            for (const row of rows) {
                const titleEl = row.querySelector('[data-testid="row-title"]');
                if (!titleEl) continue;
                const text = (titleEl.textContent || '').trim().toLowerCase();
                if (text.includes('mia lista') || text.includes('my list')) continue;
                const cards = Array.from(row.querySelectorAll('[data-component="holo-card"]'));
                for (const c of cards) {
                    const id = c.getAttribute('data-card-id');
                    if (id && String(id) !== String(exclude)) return id;
                }
            }
            return null;
        }, seed1);

        if (!seed1 || !seed2) {
            test.skip(true, 'Not enough candidate cards to seed "La mia lista"');
            return;
        }

        // If the list doesn't already contain both seeds, click the
        // add-to-list button for whichever is missing.
        const have1 = myListIds && myListIds.includes(String(seed1));
        const have2 = myListIds && myListIds.includes(String(seed2));

        if (!have1) {
            const ok = await clickAddToListForCard(page, seed1);
            expect(ok).toBe(true);
            await page.waitForTimeout(400);
        }
        if (!have2) {
            const ok = await clickAddToListForCard(page, seed2);
            expect(ok).toBe(true);
            await page.waitForTimeout(400);
        }

        // Re-read the myList row.
        myListIds = await readMyListCardIds(page);
        if (!myListIds || myListIds.length < 2) {
            test.skip(true, 'Could not populate "La mia lista" with 2+ cards');
            return;
        }

        // Read the order of the first two card-ids in myList before the drag.
        const beforeOrder = myListIds.slice(0, 2);
        expect(beforeOrder[0]).not.toEqual(beforeOrder[1]);

        // Drag and drop. We use HTML5 dataTransfer-based dispatch (the only
        // reliable way for native HTML5 DnD in Playwright).
        await page.evaluate(([src, tgt]) => {
            const srcEl = document.querySelector(`[data-card-id="${src}"]`);
            const tgtEl = document.querySelector(`[data-card-id="${tgt}"]`);
            if (!srcEl || !tgtEl) return;
            const dt = new DataTransfer();
            srcEl.dispatchEvent(new DragEvent('dragstart', {bubbles: true, cancelable: true, dataTransfer: dt}));
            tgtEl.dispatchEvent(new DragEvent('dragenter', {bubbles: true, cancelable: true, dataTransfer: dt}));
            tgtEl.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: dt}));
            tgtEl.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt}));
            srcEl.dispatchEvent(new DragEvent('dragend', {bubbles: true, cancelable: true, dataTransfer: dt}));
        }, beforeOrder);

        await page.waitForTimeout(500);

        // Read the order after the drag.
        const afterOrder = await readMyListCardIds(page);
        expect(afterOrder).not.toBeNull();
        expect(afterOrder.length).toBeGreaterThanOrEqual(beforeOrder.length);
        expect(afterOrder[0]).toEqual(beforeOrder[1]);
        expect(afterOrder[1]).toEqual(beforeOrder[0]);
    });

    test('Clicking the card body (not a button) still opens the detail view', async () => {
        // Regression guard: the click-bubble fix must not break the happy path.
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 10000});

        const firstCard = await page.$('[data-component="holo-card"]');
        expect(firstCard).not.toBeNull();
        await firstCard.click();

        // The detail view should mount.
        await page.waitForSelector('#detail-cinematic', {state: 'attached', timeout: 10000});
    });

    test('No console errors during the button and drag flows', async () => {
        await page.goto(BASE_URL, {waitUntil: 'networkidle'});
        await page.waitForSelector('[data-component="holo-card"]', {timeout: 10000});

        // Flow 1: press the add-to-list button with cursor drift.
        const firstCard = page.locator('[data-component="holo-card"]').first();
        await firstCard.hover();
        await page.waitForTimeout(200);
        const btnHandle = await firstCard.locator('.add-to-list-btn').elementHandle();
        const box = await btnHandle.boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx + 4, cy + 4, {steps: 5});
        await page.mouse.up();
        await page.waitForTimeout(400);

        // Flow 2: drag-and-drop between the first two cards in "La mia lista".
        const ids = await readMyListCardIds(page);
        if (ids && ids.length >= 2 && ids[0] && ids[1]) {
            await page.evaluate(([src, tgt]) => {
                const srcEl = document.querySelector(`[data-card-id="${src}"]`);
                const tgtEl = document.querySelector(`[data-card-id="${tgt}"]`);
                if (!srcEl || !tgtEl) return;
                const dt = new DataTransfer();
                srcEl.dispatchEvent(new DragEvent('dragstart', {bubbles: true, cancelable: true, dataTransfer: dt}));
                tgtEl.dispatchEvent(new DragEvent('dragenter', {bubbles: true, cancelable: true, dataTransfer: dt}));
                tgtEl.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: dt}));
                tgtEl.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt}));
                srcEl.dispatchEvent(new DragEvent('dragend', {bubbles: true, cancelable: true, dataTransfer: dt}));
            }, ids.slice(0, 2));
            await page.waitForTimeout(500);
        }

        // No real console errors. Filter the known mobx-react-lite double-observer warning.
        const errors = page.__consoleErrors || [];
        if (errors.length) console.log('[HOLO-BUTTONS-DRAG] errors:', errors);
        const realErrors = errors.filter((e) => !/observer on a function component/.test(e));
        expect(realErrors).toEqual([]);
    });
});
