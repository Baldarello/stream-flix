/**
 * Unit tests for `frontend/e2e/utils/db-reset.js`.
 *
 * The helpers wrap Playwright Page/Worker objects, which are not
 * available inside jsdom, so the tests build lightweight fakes that
 * record every call and provide a programmable `evaluate` that can
 * be wired to either succeed or throw.
 *
 * The goal is to lock in the *contract* the rest of the e2e suite
 * depends on:
 *   - `resetIndexedDB` walks every page (and worker) in the
 *     BrowserContext, invokes `indexedDB.deleteDatabase('quix-db')`
 *     inside each, and reloads the supplied page last.
 *   - `seedIndexedDB` forwards the fixtures payload to the page
 *     evaluator and reports the number of inserted rows.
 *   - The exported database name constant is the literal `quix-db`
 *     requested in the todo.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    QUIX_DB_NAME,
    resetIndexedDB,
    seedIndexedDB,
} from '../../e2e/utils/db-reset.js';

/**
 * Build a fake Playwright Page. The returned object implements the
 * small slice of the API the helper actually uses.
 *
 * @param {object} [overrides]
 */
function makeFakePage(overrides = {}) {
    const evaluate = vi.fn(async () => undefined);
    const reload = vi.fn(async () => undefined);
    const isClosed = vi.fn(() => false);
    const page = {
        evaluate,
        reload,
        isClosed,
        context: vi.fn(),
        ...overrides,
    };
    return page;
}

function makeFakeWorker() {
    return { evaluate: vi.fn(async () => undefined) };
}

function makeFakeContext({ pages = [], workers = [] } = {}) {
    return {
        pages: vi.fn(() => pages),
        serviceWorkers: vi.fn(() => workers),
    };
}

describe('e2e/utils/db-reset', () => {
    it('exports the documented database name', () => {
        expect(QUIX_DB_NAME).toBe('quix-db');
    });

    it('resetIndexedDB throws when called without a page', async () => {
        await expect(resetIndexedDB(undefined)).rejects.toThrow(
            /requires a Playwright page/i,
        );
    });

    it('resetIndexedDB throws when the page has no context', async () => {
        const page = makeFakePage();
        await expect(resetIndexedDB(page)).rejects.toThrow(/BrowserContext/i);
    });

    it('resetIndexedDB deletes the DB in every page of the context and reloads the active page', async () => {
        const pageA = makeFakePage();
        const pageB = makeFakePage();
        const context = makeFakeContext({ pages: [pageA, pageB] });
        pageA.context.mockReturnValue(context);
        pageB.context.mockReturnValue(context);

        await resetIndexedDB(pageA);

        // The deleteDatabase call must be issued once per page in the
        // context, using the literal name from the todo spec.
        expect(pageA.evaluate).toHaveBeenCalledTimes(1);
        expect(pageB.evaluate).toHaveBeenCalledTimes(1);
        const firstArg = pageA.evaluate.mock.calls[0][0].toString();
        expect(firstArg).toContain('indexedDB.deleteDatabase');
        expect(pageA.evaluate.mock.calls[0][1]).toBe('quix-db');
        expect(pageB.evaluate.mock.calls[0][1]).toBe('quix-db');

        // The supplied page must reload at the end so the app
        // re-opens Dexie against a fresh DB.
        expect(pageA.reload).toHaveBeenCalledTimes(1);
        expect(pageB.reload).not.toHaveBeenCalled();
    });

    it('resetIndexedDB also asks active service workers to drop the DB', async () => {
        const worker = makeFakeWorker();
        const page = makeFakePage();
        const context = makeFakeContext({ pages: [page], workers: [worker] });
        page.context.mockReturnValue(context);

        await resetIndexedDB(page);

        expect(worker.evaluate).toHaveBeenCalledTimes(1);
        expect(worker.evaluate.mock.calls[0][1]).toBe('quix-db');
    });

    it('resetIndexedDB tolerates a worker that throws (e.g. cross-origin)', async () => {
        const worker = { evaluate: vi.fn(async () => { throw new Error('cross-origin'); }) };
        const page = makeFakePage();
        const context = makeFakeContext({ pages: [page], workers: [worker] });
        page.context.mockReturnValue(context);

        await expect(resetIndexedDB(page)).resolves.toBeUndefined();
        expect(page.reload).toHaveBeenCalledTimes(1);
    });

    it('resetIndexedDB tolerates a closed sibling page', async () => {
        const closedPage = makeFakePage({ isClosed: vi.fn(() => true) });
        const activePage = makeFakePage();
        const context = makeFakeContext({ pages: [closedPage, activePage] });
        activePage.context.mockReturnValue(context);
        closedPage.context.mockReturnValue(context);

        await expect(resetIndexedDB(activePage)).resolves.toBeUndefined();
        // The closed page must be skipped, the active one touched.
        expect(closedPage.evaluate).not.toHaveBeenCalled();
        expect(activePage.evaluate).toHaveBeenCalledTimes(1);
        expect(activePage.reload).toHaveBeenCalledTimes(1);
    });

    it('resetIndexedDB still reloads when context.pages() is empty', async () => {
        const page = makeFakePage();
        const context = makeFakeContext({ pages: [] });
        page.context.mockReturnValue(context);

        await resetIndexedDB(page);

        // Falls back to deleting in the supplied page only.
        expect(page.evaluate).toHaveBeenCalledTimes(1);
        expect(page.reload).toHaveBeenCalledTimes(1);
    });

    it('seedIndexedDB forwards fixtures to the page evaluator and reports the count', async () => {
        const evaluate = vi.fn(async () => ({ inserted: 3, stores: ['myList'] }));
        const page = makeFakePage({ evaluate });

        const result = await seedIndexedDB(page, {
            myList: [{ id: 1 }, { id: 2 }, { id: 3 }],
        });

        expect(evaluate).toHaveBeenCalledTimes(1);
        const [fnArg, payload] = evaluate.mock.calls[0];
        // First argument is the closure string, second the bound args.
        expect(payload).toEqual({
            dbName: 'quix-db',
            payload: { myList: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        });
        expect(typeof fnArg).toBe('function');
        expect(result).toEqual({ inserted: 3, stores: ['myList'] });
    });

    it('seedIndexedDB accepts a single object per store (not just arrays)', async () => {
        const evaluate = vi.fn(async () => ({ inserted: 1, stores: ['preferences'] }));
        const page = makeFakePage({ evaluate });

        await seedIndexedDB(page, { preferences: { key: 'theme', value: 'dark' } });

        const payload = evaluate.mock.calls[0][1];
        expect(payload.payload).toEqual({ preferences: { key: 'theme', value: 'dark' } });
    });

    it('seedIndexedDB validates its arguments', async () => {
        const page = makeFakePage();
        await expect(seedIndexedDB(page, null)).rejects.toThrow(TypeError);
        await expect(seedIndexedDB(page, 'not-an-object')).rejects.toThrow(TypeError);
        await expect(seedIndexedDB(undefined, {})).rejects.toThrow(
            /requires a Playwright page/i,
        );
    });
});
