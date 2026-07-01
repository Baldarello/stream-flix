/**
 * Regression tests for the Google Drive sync conflict store.
 *
 * Original bug: the conflict store showed every entry in `cachedItems`
 * (i.e. every show the user had ever browsed, even ones they had never
 * added to My List) in the "what to keep" chooser, which the user
 * complained about as "shows I never configured". The fix is to only
 * surface shows that are referenced by the My List, by media links or
 * by episode progress on either side of the conflict.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { googleDriveSyncConflictStore } from '../../store/googleDriveSyncConflictStore.js';

const buildShowsMap = (entries) => {
    const m = new Map();
    entries.forEach(([id, payload]) => {
        m.set(id, payload);
    });
    return m;
};

const resetStore = () => {
    googleDriveSyncConflictStore.reset();
};

describe('googleDriveSyncConflictStore.initializeFromConflictData', () => {
    beforeEach(resetStore);

    it('does not surface shows that the user never added to My List and that have no links or progress', () => {
        // Show 99 was "browsed" (cached on disk) but never added to My List
        // on either side and has no media links / progress. The conflict
        // modal must not include it.
        const shows = buildShowsMap([
            [
                1,
                {
                    local: { id: 1, name: 'Configured Show', media_type: 'tv' },
                    remote: { id: 1, name: 'Configured Show', media_type: 'tv' },
                },
            ],
            [
                99,
                {
                    local: { id: 99, name: 'Never Configured', media_type: 'tv' },
                    remote: null,
                },
            ],
        ]);

        const conflictData = {
            myList: {
                local: [1],
                remote: [1],
            },
            shows,
            mediaLinks: {
                local: [],
                remote: [],
            },
            episodeProgress: {
                local: [],
                remote: [],
            },
        };

        googleDriveSyncConflictStore.initializeFromConflictData(conflictData);

        const ids = googleDriveSyncConflictStore.choices.map((c) => c.id);
        expect(ids).toContain(1);
        expect(ids).not.toContain(99);
    });

    it('surfaces shows that are in the local My List even if they have no links/progress', () => {
        const shows = buildShowsMap([
            [
                10,
                {
                    local: { id: 10, name: 'Only Local', media_type: 'tv' },
                    remote: null,
                },
            ],
        ]);

        const conflictData = {
            myList: {
                local: [10],
                remote: [],
            },
            shows,
            mediaLinks: { local: [], remote: [] },
            episodeProgress: { local: [], remote: [] },
        };

        googleDriveSyncConflictStore.initializeFromConflictData(conflictData);

        const ids = googleDriveSyncConflictStore.choices.map((c) => c.id);
        expect(ids).toEqual([10]);
    });

    it('surfaces shows that have media links even when not in any My List', () => {
        // The user has previously watched show 7 (cached) and has a link
        // for it on the local side. Even though it's not in My List, the
        // link is a piece of user data that must not be silently dropped,
        // so the show should appear in the conflict modal.
        const shows = buildShowsMap([
            [
                7,
                {
                    local: { id: 7, name: 'Watched Once', media_type: 'tv' },
                    remote: null,
                },
            ],
        ]);

        const conflictData = {
            myList: {
                local: [],
                remote: [],
            },
            shows,
            mediaLinks: {
                local: [{ mediaId: 7, url: 'https://example.com/x', label: 'X' }],
                remote: [],
            },
            episodeProgress: { local: [], remote: [] },
        };

        googleDriveSyncConflictStore.initializeFromConflictData(conflictData);

        const ids = googleDriveSyncConflictStore.choices.map((c) => c.id);
        expect(ids).toEqual([7]);
    });

    it('surfaces shows that have episode progress even when not in any My List', () => {
        const shows = buildShowsMap([
            [
                5,
                {
                    local: {
                        id: 5,
                        name: 'Show With Progress',
                        media_type: 'tv',
                        seasons: [
                            {
                                season_number: 1,
                                episodes: [{ id: 500, name: 'e1' }],
                            },
                        ],
                    },
                    remote: null,
                },
            ],
        ]);

        const conflictData = {
            myList: {
                local: [],
                remote: [],
            },
            shows,
            mediaLinks: { local: [], remote: [] },
            episodeProgress: {
                local: [{ episodeId: 500, currentTime: 42, duration: 100 }],
                remote: [],
            },
        };

        googleDriveSyncConflictStore.initializeFromConflictData(conflictData);

        const ids = googleDriveSyncConflictStore.choices.map((c) => c.id);
        expect(ids).toEqual([5]);
    });

    it('supports conflict data that exposes shows as a plain object (not a Map)', () => {
        // Some call sites / tests pass conflict data as a plain object
        // keyed by id. The store must accept both shapes.
        const conflictData = {
            myList: {
                local: [1],
                remote: [],
            },
            shows: {
                1: { local: { id: 1, name: 'Local Only', media_type: 'tv' }, remote: null },
                2: { local: { id: 2, name: 'Never Added', media_type: 'tv' }, remote: null },
            },
            mediaLinks: { local: [], remote: [] },
            episodeProgress: { local: [], remote: [] },
        };

        googleDriveSyncConflictStore.initializeFromConflictData(conflictData);

        const ids = googleDriveSyncConflictStore.choices.map((c) => c.id);
        expect(ids).toContain(1);
        expect(ids).not.toContain(2);
    });
});
