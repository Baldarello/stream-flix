/**
 * Regression tests for `syncStore.mergeLocalAndRemote`.
 *
 * The original interactive-merge path contained `new Map()()` syntax
 * (calling the result of `new Map()` as a function) which threw
 * `TypeError: (intermediate value) is not a function` as soon as the
 * user confirmed a merge in the conflict modal that had at least one
 * link or progress entry to dedupe. The tests below exercise the
 * interactive path end-to-end to make sure the merge completes without
 * throwing and that the resulting data is correct.
 *
 * The tests also verify that shows present in the conflict payload
 * but NOT in the user's per-row choices (i.e. shows that the conflict
 * modal filtered out because the user never added them to My List)
 * are still preserved in the merge result so the local cache is not
 * wiped by the import.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/googleDriveService', () => ({
    findLatestBackupFile: vi.fn(),
    readBackupFile: vi.fn(),
    writeBackupFile: vi.fn().mockResolvedValue({id: 'new-file'}),
    deleteOldBackups: vi.fn().mockResolvedValue(undefined),
}));

const importDataMock = vi.fn().mockResolvedValue(undefined);
const bulkDeleteMock = vi.fn().mockResolvedValue(undefined);
const whereAnyOfMock = vi.fn().mockReturnValue({delete: vi.fn().mockResolvedValue(undefined)});

vi.mock('../../services/db.js', () => {
    const tableMock = () => ({
        put: vi.fn().mockResolvedValue(undefined),
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
        db: {
            myList: {
                ...tableMock(),
                bulkDelete: vi.fn().mockResolvedValue(undefined),
            },
            cachedItems: {
                ...tableMock(),
                bulkDelete: vi.fn().mockResolvedValue(undefined),
            },
            mediaLinks: {
                ...tableMock(),
                where: vi.fn().mockReturnValue({anyOf: vi.fn().mockReturnValue({delete: vi.fn().mockResolvedValue(undefined)})}),
                anyOf: vi.fn().mockReturnValue({delete: vi.fn().mockResolvedValue(undefined)}),
            },
            episodeProgress: {
                ...tableMock(),
                where: vi.fn().mockReturnValue({anyOf: vi.fn().mockReturnValue({delete: vi.fn().mockResolvedValue(undefined)})}),
                anyOf: vi.fn().mockReturnValue({delete: vi.fn().mockResolvedValue(undefined)}),
            },
            preferences: {
                ...tableMock(),
                put: vi.fn().mockResolvedValue(undefined),
            },
            importData: vi.fn().mockResolvedValue(undefined),
        },
    };
});

vi.mock('../../store/mediaStore.js', () => {
    return {
        mediaStore: {
            showSnackbar: vi.fn(),
            hideSnackbar: vi.fn(),
            loadPersistedData: vi.fn().mockResolvedValue(undefined),
            fetchAllData: vi.fn().mockResolvedValue(undefined),
        },
    };
});

import { syncStore } from '../../store/syncStore.js';
import { db } from '../../services/db.js';
import * as driveService from '../../services/googleDriveService.js';

describe('syncStore.mergeLocalAndRemote (regression: new Map()() TypeError)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        syncStore.syncConflictData = null;
        syncStore.googleUser = {accessToken: 'token'};
        syncStore.isProcessingSyncConflict = false;
    });

    it('completes the interactive merge without throwing when there are duplicate links', async () => {
        // The conflict payload mirrors what `synchronizeWithDrive` would
        // build when local and remote both contain a link for the same
        // episode. The dedupe step (the broken `new Map()()`) is exercised
        // by passing at least one link.
        syncStore.syncConflictData = {
            myList: {
                local: [1, 2],
                remote: [1, 3],
            },
            shows: new Map([
                [1, {
                    local: {id: 1, name: 'Show 1', media_type: 'tv'},
                    remote: {id: 1, name: 'Show 1', media_type: 'tv'},
                }],
                [2, {
                    local: {id: 2, name: 'Show 2', media_type: 'tv'},
                    remote: null,
                }],
                [3, {
                    local: null,
                    remote: {id: 3, name: 'Show 3', media_type: 'tv'},
                }],
            ]),
            mediaLinks: {
                local: [
                    {mediaId: 1, url: 'https://example.com/a', label: 'A'},
                    {mediaId: 1, url: 'https://example.com/b', label: 'B'},
                ],
                remote: [
                    {mediaId: 1, url: 'https://example.com/a', label: 'A duplicate'},
                ],
            },
            episodeProgress: {
                local: [],
                remote: [],
            },
        };

        // The user picks "local" for everything except show 3 (which is
        // only in remote), to exercise the "remote" branch of the
        // linksAction / myListAction switch.
        const choices = [
            {id: 1, myListAction: 'local', linksAction: 'local', progressAction: 'local', deleteShow: false},
            {id: 2, myListAction: 'local', linksAction: 'local', progressAction: 'local', deleteShow: false},
            {id: 3, myListAction: 'remote', linksAction: 'remote', progressAction: 'remote', deleteShow: false},
        ];

        await expect(syncStore.mergeLocalAndRemote(choices, [])).resolves.not.toThrow();

        // The merge must have called db.importData with deduplicated links
        // (only one entry for the duplicate URL).
        expect(db.importData).toHaveBeenCalledTimes(1);
        const importArg = db.importData.mock.calls[0][0];
        // Two unique URLs for mediaId 1 ("a" and "b") - the duplicate "a"
        // from remote must have been discarded.
        const importedLinks = importArg.mediaLinks;
        const urls = importedLinks.map((l) => l.url).sort();
        expect(urls).toEqual(['https://example.com/a', 'https://example.com/b']);
    });

    it('completes the interactive merge without throwing when there are duplicate progress entries', async () => {
        syncStore.syncConflictData = {
            myList: {
                local: [1],
                remote: [1],
            },
            shows: new Map([
                [1, {
                    local: {
                        id: 1,
                        name: 'Show 1',
                        media_type: 'tv',
                        seasons: [
                            {
                                season_number: 1,
                                episodes: [{id: 100, name: 'e1'}],
                            },
                        ],
                    },
                    remote: {
                        id: 1,
                        name: 'Show 1',
                        media_type: 'tv',
                        seasons: [
                            {
                                season_number: 1,
                                episodes: [{id: 100, name: 'e1'}],
                            },
                        ],
                    },
                }],
            ]),
            mediaLinks: {
                local: [],
                remote: [],
            },
            episodeProgress: {
                local: [
                    {episodeId: 100, currentTime: 10, duration: 100, lastWatchedAt: 1000},
                ],
                remote: [
                    {episodeId: 100, currentTime: 20, duration: 100, lastWatchedAt: 2000},
                ],
            },
        };

        // "both" forces the merge code through the inner `new Map()()`
        // dedupe path for progress entries.
        const choices = [
            {id: 1, myListAction: 'both', linksAction: 'both', progressAction: 'both', deleteShow: false},
        ];

        await expect(syncStore.mergeLocalAndRemote(choices, [])).resolves.not.toThrow();

        expect(db.importData).toHaveBeenCalledTimes(1);
    });

    it('preserves shows that are in the conflict payload but absent from the user choices', async () => {
        // Simulate the "shows never configured" case: the conflict payload
        // includes a cached show (id 99) that the conflict modal filtered
        // out because it isn't in any myList and has no links/progress.
        // The merge must still keep that show in the imported data so the
        // local cache is not wiped.
        syncStore.syncConflictData = {
            myList: {
                local: [1],
                remote: [1],
            },
            shows: new Map([
                [1, {
                    local: {id: 1, name: 'Configured Show', media_type: 'tv'},
                    remote: {id: 1, name: 'Configured Show', media_type: 'tv'},
                }],
                [99, {
                    local: {id: 99, name: 'Never Configured', media_type: 'tv'},
                    remote: null,
                }],
            ]),
            mediaLinks: {
                local: [],
                remote: [],
            },
            episodeProgress: {
                local: [],
                remote: [],
            },
        };

        const choices = [
            {id: 1, myListAction: 'both', linksAction: 'both', progressAction: 'both', deleteShow: false},
        ];

        await syncStore.mergeLocalAndRemote(choices, []);

        const importArg = db.importData.mock.calls[0][0];
        const importedIds = (importArg.cachedItems || []).map((s) => s.id).sort();
        expect(importedIds).toContain(99);
        expect(importedIds).toContain(1);
    });
});

describe('syncStore.mergeLocalAndRemote (auto-merge path)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        syncStore.syncConflictData = null;
        syncStore.googleUser = {accessToken: 'token'};
        syncStore.isProcessingSyncConflict = false;
    });

    it('merges all shows automatically when no choices are provided', async () => {
        syncStore.syncConflictData = {
            myList: {
                local: [1],
                remote: [2],
            },
            shows: new Map([
                [1, {local: {id: 1, name: 'Local Show'}, remote: null}],
                [2, {local: null, remote: {id: 2, name: 'Remote Show'}}],
            ]),
            mediaLinks: {
                local: [{mediaId: 1, url: 'https://a.example', label: 'A'}],
                remote: [{mediaId: 1, url: 'https://a.example', label: 'A2'}],
            },
            episodeProgress: {
                local: [{episodeId: 100, currentTime: 10, lastWatchedAt: 1000}],
                remote: [{episodeId: 100, currentTime: 20, lastWatchedAt: 2000}],
            },
        };

        await syncStore.mergeLocalAndRemote([], []);

        expect(db.importData).toHaveBeenCalledTimes(1);
        const importArg = db.importData.mock.calls[0][0];
        // The dedupe on the auto-merge path uses the same `new Map()()`
        // and would have crashed without the fix.
        const urls = importArg.mediaLinks.map((l) => l.url);
        expect(urls).toEqual(['https://a.example']);
        // The newer remote progress must have won.
        expect(importArg.episodeProgress).toEqual([
            {episodeId: 100, currentTime: 20, lastWatchedAt: 2000},
        ]);
    });
});

// Keep an import of driveService to silence the linter about unused
// imports when this file is read in isolation.
void driveService;
