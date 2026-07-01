/**
 * Vitest setup file. Runs before every test file.
 * - Provides a fetch stub (jsdom does not implement it by default).
 * - Polyfills TextEncoder/TextDecoder for libraries that expect them.
 * - Stubs out the IndexedDB-backed Dexie `db` import with an
 *   in-memory no-op so store actions can be unit-tested without
 *   a real browser database.
 */
import { TextDecoder, TextEncoder } from 'node:util';
import { vi } from 'vitest';

if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
    globalThis.TextDecoder = TextDecoder;
}

// Minimal fetch stub so importing modules that reference fetch at top-level
// does not throw in jsdom.
if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = async () => {
        throw new Error('fetch is not implemented in the test environment; mock it explicitly.');
    };
}

// Each test file is expected to mock `services/db` with
// `vi.mock('../../services/db.js', ...)` from its own top of file so
// the mock path is always resolved relative to the test file (which
// is what Vitest expects for hoisted `vi.mock` calls in ESM mode).
//
// We also expose a tiny helper for build chainable table mocks.
globalThis.__createMockDbTables = () => {
    const tableMock = () => ({
        put: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        bulkAdd: vi.fn().mockResolvedValue(undefined),
        bulkPut: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        transaction: vi.fn((_mode, _store, cb) => cb()),
    });
    return {
        myList: tableMock(),
        cachedItems: tableMock(),
        mediaLinks: tableMock(),
        episodeProgress: tableMock(),
        showIntroDurations: tableMock(),
        selectedSeasons: tableMock(),
        showFilterPreferences: tableMock(),
        preferredSources: tableMock(),
        preferences: tableMock(),
        episodeContext: tableMock(),
    };
};
