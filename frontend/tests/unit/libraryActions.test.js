/**
 * Tests for the new libraryStore actions and the mediaStore facade
 * bindings. The goal is to lock in the public surface that the
 * previous monolithic `mediaStore` exposed, so a future refactor
 * can't silently drop one of the action names again.
 *
 * The tests are intentionally narrow: they only cover the surface
 * contract (method exists, state mutation happens) and rely on the
 * existing Dexie setup in `tests/setup.js` to no-op the persistence
 * calls. Heavy link-resolution / playback flows are exercised by the
 * Playwright smoke test.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/db.js', () => {
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
        db: {
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
        },
    };
});

import { libraryStore } from '../../store/libraryStore.js';
import { mediaStore } from '../../store/mediaStore.js';

describe('libraryStore actions', () => {
    beforeEach(() => {
        // Reset the in-memory state so each test is independent.
        libraryStore.myList = [];
        libraryStore.cachedItems = new Map();
        libraryStore.mediaLinks = new Map();
        libraryStore.episodeProgress = new Map();
        libraryStore.showIntroDurations = new Map();
        libraryStore.selectedSeasons = new Map();
        libraryStore.showFilterPreferences = new Map();
        libraryStore.preferredSources = new Map();
    });

    it('toggleMyList adds and removes an item', () => {
        const item = {id: 1, title: 'Test Show'};
        libraryStore.toggleMyList(item);
        expect(libraryStore.myList).toEqual([1]);
        expect(libraryStore.cachedItems.get(1)).toEqual(item);

        libraryStore.toggleMyList(item);
        expect(libraryStore.myList).toEqual([]);
        expect(libraryStore.cachedItems.has(1)).toBe(true); // cached entry is kept
    });

    it('reorderMyList moves an item and updates the in-memory order', async () => {
        libraryStore.myList = [1, 2, 3];
        await libraryStore.reorderMyList(0, 2);
        expect(libraryStore.myList).toEqual([2, 3, 1]);
    });

    it('setMyListOrder replaces the list with the given ordering', async () => {
        libraryStore.myList = [1, 2, 3];
        await libraryStore.setMyListOrder([3, 1, 2]);
        expect(libraryStore.myList).toEqual([3, 1, 2]);
    });

    it('removeFromContinueWatching deletes the progress entry', async () => {
        libraryStore.episodeProgress.set(42, {episodeId: 42, currentTime: 1, duration: 10});
        await libraryStore.removeFromContinueWatching(42);
        expect(libraryStore.episodeProgress.has(42)).toBe(false);
    });

    it('updateEpisodeProgress flips the watched flag past 90%', () => {
        libraryStore.updateEpisodeProgress({episodeId: 7, currentTime: 95, duration: 100});
        const stored = libraryStore.episodeProgress.get(7);
        expect(stored.watched).toBe(true);
        expect(stored.currentTime).toBe(95);
    });

    it('toggleEpisodeWatchedStatus flips the existing flag', async () => {
        libraryStore.episodeProgress.set(7, {episodeId: 7, currentTime: 0, duration: 100, watched: false});
        await libraryStore.toggleEpisodeWatchedStatus(7);
        expect(libraryStore.episodeProgress.get(7).watched).toBe(true);
        await libraryStore.toggleEpisodeWatchedStatus(7);
        expect(libraryStore.episodeProgress.get(7).watched).toBe(false);
    });

    it('setShowIntroDuration / setSelectedSeasonForShow write to the maps', () => {
        libraryStore.setShowIntroDuration(11, 42);
        expect(libraryStore.showIntroDurations.get(11)).toBe(42);
        libraryStore.setSelectedSeasonForShow(11, 3);
        expect(libraryStore.selectedSeasons.get(11)).toBe(3);
    });

    it('setShowFilterPreference merges with the existing entry', () => {
        libraryStore.setShowFilterPreference(11, {language: 'it'});
        libraryStore.setShowFilterPreference(11, {type: 'subbed'});
        expect(libraryStore.showFilterPreferences.get(11)).toEqual({language: 'it', type: 'subbed'});
    });

    it('getLinksForMedia returns an empty array when no links exist', async () => {
        const links = await libraryStore.getLinksForMedia(999);
        expect(links).toEqual([]);
    });

    it('findFirstUnwatchedEpisode returns the first episode with a link', () => {
        const show = {
            seasons: [
                {
                    season_number: 1,
                    episodes: [
                        {id: 100, name: 'e1'},
                        {id: 101, name: 'e2'},
                    ],
                },
            ],
        };
        libraryStore.mediaLinks.set(101, [{id: 1, url: 'x', mediaId: 101}]);
        const ep = libraryStore.findFirstUnwatchedEpisode(show);
        expect(ep.id).toBe(101);
    });

    it('hasLinks returns true iff the in-memory map has entries', () => {
        expect(libraryStore.hasLinks(1)).toBe(false);
        libraryStore.mediaLinks.set(1, [{id: 1, url: 'x', mediaId: 1}]);
        expect(libraryStore.hasLinks(1)).toBe(true);
    });
});

describe('mediaStore facade bindings', () => {
    beforeEach(() => {
        libraryStore.myList = [];
        libraryStore.cachedItems = new Map();
    });

    it('re-exposes the libraryStore actions', () => {
        expect(typeof mediaStore.toggleMyList).toBe('function');
        expect(typeof mediaStore.reorderMyList).toBe('function');
        expect(typeof mediaStore.setMyListOrder).toBe('function');
        expect(typeof mediaStore.removeFromContinueWatching).toBe('function');
        expect(typeof mediaStore.updateEpisodeProgress).toBe('function');
        expect(typeof mediaStore.toggleEpisodeWatchedStatus).toBe('function');
        expect(typeof mediaStore.setShowIntroDuration).toBe('function');
        expect(typeof mediaStore.setSelectedSeasonForShow).toBe('function');
        expect(typeof mediaStore.setShowFilterPreference).toBe('function');
        expect(typeof mediaStore.getLinksForMedia).toBe('function');
        expect(typeof mediaStore.findEpisodeById).toBe('function');
        expect(typeof mediaStore.hasLinks).toBe('function');
        expect(typeof mediaStore.findFirstUnwatchedEpisode).toBe('function');
    });

    it('re-exposes the cross-cutting playback / selection actions', () => {
        expect(typeof mediaStore.startPlayback).toBe('function');
        expect(typeof mediaStore.selectMedia).toBe('function');
        expect(typeof mediaStore._fetchAndCacheMediaDetails).toBe('function');
    });

    it('facade toggleMyList delegates to libraryStore', () => {
        const item = {id: 1, title: 'X'};
        mediaStore.toggleMyList(item);
        expect(libraryStore.myList).toEqual([1]);
    });
});
