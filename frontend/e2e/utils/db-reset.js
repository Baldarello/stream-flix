/**
 * e2e utilities for resetting and seeding the application's IndexedDB
 * (Dexie-backed) store between Playwright tests.
 *
 * Exposes two helpers:
 *
 *   await resetIndexedDB(page)
 *     - Calls `indexedDB.deleteDatabase('quix-db')` in every page
 *       and active service worker belonging to the supplied page's
 *       BrowserContext, then reloads the supplied page so the app
 *       boots with a clean DB.
 *
 *   await seedIndexedDB(page, fixtures)
 *     - Opens the `quix-db` IndexedDB database and bulk-inserts the
 *       provided fixtures. `fixtures` is a plain object keyed by
 *       object-store name, e.g.
 *
 *         await seedIndexedDB(page, {
 *             myList: [{ id: 1, order: 0 }, { id: 2, order: 1 }],
 *             cachedItems: [{ id: 99, name: 'Seed Movie' }],
 *         });
 *
 *       Each store value may also be a single object instead of an
 *       array. Items are inserted with `objectStore.put` so callers
 *       can re-seed the same row id without throwing on duplicates.
 *
 * The helpers intentionally avoid importing the application code
 * (Dexie, services/db.js) because tests must work even when the app
 * bundle is broken or has not yet loaded.
 */

export const QUIX_DB_NAME = 'quix-db';

/**
 * Delete `quix-db` from the given page and every other page /
 * service worker that belongs to the same BrowserContext, then
 * reload the supplied page so the app boots with a clean DB.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page
 *   currently being driven. Its context is used to discover sibling
 *   tabs and service workers.
 * @returns {Promise<void>} Resolves once the delete requests settle
 *   and the page has finished reloading.
 */
export async function resetIndexedDB(page) {
    if (!page) {
        throw new Error('resetIndexedDB requires a Playwright page instance');
    }
    const context = page.context();
    if (!context) {
        throw new Error('resetIndexedDB requires a page bound to a BrowserContext');
    }

    // Collect every page that currently belongs to the context. The
    // caller may be driving one tab but a previous test may have left
    // others open, and all of them hold a reference to the same
    // IndexedDB database on the same origin.
    const pages = context.pages();
    const targets = pages.length > 0 ? pages : [page];

    await Promise.all(targets.map((p) => deleteDatabaseInPage(p).catch(() => undefined)));

    // Service workers keep their own database connection alive even
    // when the page is hidden, so the delete request can stay
    // "blocked" until they are terminated. Walk the active service
    // workers and ask them to drop the DB too.
    if (typeof context.serviceWorkers === 'function') {
        const workers = context.serviceWorkers();
        await Promise.all(workers.map((w) => deleteDatabaseInWorker(w).catch(() => undefined)));
    }

    // Reload the supplied page so the app re-runs its Dexie open
    // path against the freshly deleted (or soon-to-be-recreated)
    // database.
    await page.reload({ waitUntil: 'domcontentloaded' });
}

/**
 * Bulk-insert the supplied rows into the matching object stores of
 * `quix-db`. Existing rows with the same primary key are overwritten.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, object|object[]>} fixtures
 * @returns {Promise<{ inserted: number, stores: string[] }>}
 */
export async function seedIndexedDB(page, fixtures) {
    if (!page) {
        throw new Error('seedIndexedDB requires a Playwright page instance');
    }
    if (!fixtures || typeof fixtures !== 'object') {
        throw new TypeError('seedIndexedDB requires a fixtures object');
    }

    return await page.evaluate(
        async ({ dbName, payload }) => {
            const result = { inserted: 0, stores: [] };

            // Open (creating if missing) the target DB. We don't pin
            // a version because the application may not have opened
            // it yet on this origin during early-stage tests.
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName);
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve(req.result);
                req.onblocked = () => reject(new Error(`Opening ${dbName} is blocked by another connection`));
            });

            try {
                const storeNames = Array.from(db.objectStoreNames);
                const tx = db.transaction(storeNames, 'readwrite');
                const results = [];

                for (const [name, value] of Object.entries(payload)) {
                    if (!storeNames.includes(name)) {
                        results.push({ name, error: `object store "${name}" not present` });
                        continue;
                    }
                    const items = Array.isArray(value) ? value : [value];
                    if (items.length === 0) {
                        continue;
                    }
                    const store = tx.objectStore(name);
                    for (const item of items) {
                        store.put(item);
                        result.inserted += 1;
                    }
                    result.stores.push(name);
                }

                await new Promise((resolve, reject) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error || new Error('seed tx aborted'));
                });

                for (const r of results) {
                    if (r.error) {
                        throw new Error(r.error);
                    }
                }
            } finally {
                db.close();
            }

            return result;
        },
        { dbName: QUIX_DB_NAME, payload: fixtures }
    );
}

/**
 * Run `indexedDB.deleteDatabase('quix-db')` inside a single page.
 * Resolves when the request settles (success, error or blocked) so
 * a stuck connection in another tab does not hang the helper.
 *
 * @param {import('@playwright/test').Page} target
 */
async function deleteDatabaseInPage(target) {
    if (target.isClosed()) {
        return;
    }
    await target.evaluate(
        (dbName) =>
            new Promise((resolve) => {
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };
                try {
                    const req = indexedDB.deleteDatabase(dbName);
                    req.onsuccess = finish;
                    req.onerror = finish;
                    req.onblocked = finish;
                } catch (_e) {
                    finish();
                }
                // Belt and suspenders: cap the wait so a stuck
                // connection cannot freeze the test runner.
                setTimeout(finish, 2000);
            }),
        QUIX_DB_NAME
    );
}

/**
 * Service workers are a separate execution context, so the same
 * `indexedDB.deleteDatabase` call has to be replayed inside each of
 * them. The Playwright Worker API exposes `evaluate` for that.
 *
 * @param {import('@playwright/test').Worker} worker
 */
async function deleteDatabaseInWorker(worker) {
    try {
        await worker.evaluate(
            (dbName) =>
                new Promise((resolve) => {
                    let settled = false;
                    const finish = () => {
                        if (settled) return;
                        settled = true;
                        resolve();
                    };
                    try {
                        const req = indexedDB.deleteDatabase(dbName);
                        req.onsuccess = finish;
                        req.onerror = finish;
                        req.onblocked = finish;
                    } catch (_e) {
                        finish();
                    }
                    setTimeout(finish, 2000);
                }),
            QUIX_DB_NAME
        );
    } catch (_e) {
        // Some worker contexts do not expose `evaluate` (e.g. they
        // belong to a different origin) — treat that as a no-op
        // because the page-level delete will be enough.
    }
}
