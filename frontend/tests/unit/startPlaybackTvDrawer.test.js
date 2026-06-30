/**
 * Unit tests for mediaStore.startPlayback — regression for the TV-mode
 * episodes-drawer bug.
 *
 * Bug: when playback is launched directly (TV mode `?tv=1`, continue-watching
 * row) without first opening the detail view, `libraryStore.cachedItems`
 * never holds the show details and `selectedItem` is null, so
 * `playbackStore.nowPlayingShowDetails` stayed null and the episodes drawer
 * rendered empty (currentSeasonEpisodes === []).
 *
 * Fix: startPlayback now fetches show details on demand via
 * `_fetchAndCacheMediaDetails` when neither cachedItems nor selectedItem
 * provide them, so the drawer (and next-episode logic) has seasons/episodes.
 *
 * We override `mediaStore._fetchAndCacheMediaDetails` directly because the
 * store is a MobX observable proxy that resists vi.spyOn, and because mocking
 * `apiCall` does not reliably prevent real fetches in this setup.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

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

vi.mock('../../services/apiCall.js', () => ({
    getSeriesDetails: vi.fn(),
    getSeriesEpisodes: vi.fn(),
}));

vi.mock('../../services/linkService.js', () => ({
    addLinksToMedia: vi.fn(),
    buildLinksForSeason: vi.fn(),
    deleteMediaLink: vi.fn(),
    setPreferredSource: vi.fn(),
}));

vi.mock('../../services/linkValidator.js', () => ({
    checkLinksForShow: vi.fn().mockResolvedValue([]),
    checkLinkValidity: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../services/websocketService.js', () => ({
    websocketService: {
        events: {on: vi.fn(), off: vi.fn(), emit: vi.fn()},
        send: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    },
}));

vi.mock('../../services/navigationService.js', () => ({
    navigateTo: vi.fn(),
    Routes: {PLAYER: '/player', HOME: '/'},
}));

// --- Imports after mocks ----------------------------------------------------

import {mediaStore} from '../../store/mediaStore.js';
import {libraryStore} from '../../store/libraryStore.js';
import {playbackStore} from '../../store/playbackStore.js';
import {tvStore} from '../../features/tv/tvStore.js';

describe('startPlayback — TV mode episodes drawer regression', () => {
    let originalFetch;

    beforeEach(() => {
        libraryStore.myList = [];
        libraryStore.cachedItems = new Map();
        libraryStore.mediaLinks = new Map();
        libraryStore.episodeProgress = new Map();
        libraryStore.showIntroDurations = new Map();
        libraryStore.selectedSeasons = new Map();
        libraryStore.showFilterPreferences = new Map();
        libraryStore.preferredSources = new Map();
        playbackStore.nowPlayingItem = null;
        playbackStore.nowPlayingShowDetails = null;
        playbackStore.selectedItem = null;
        playbackStore.playbackOriginItem = null;
        tvStore.screen = 'home';
        originalFetch = mediaStore._fetchAndCacheMediaDetails;
    });

    afterEach(() => {
        mediaStore._fetchAndCacheMediaDetails = originalFetch;
    });

    it('fetches show details on demand so the episodes drawer is populated in TV mode', async () => {
        const episode = {
            id: 100,
            episode_number: 1,
            season_number: 1,
            show_id: 42,
            show_title: 'Test Show',
            backdrop_path: '/bg.jpg',
            video_url: 'https://example.com/ep1.mp4',
            video_urls: [{url: 'https://example.com/ep1.mp4', language: 'en', type: 'sub'}],
        };

        const fakeShow = {
            id: 42,
            name: 'Test Show',
            media_type: 'tv',
            seasons: [{
                id: 1, season_number: 1, name: 'Season 1', episodes: [
                    {id: 100, name: 'Pilot', episode_number: 1, season_number: 1},
                    {id: 101, name: 'Cat', episode_number: 2, season_number: 1},
                ]
            }],
        };
        const fetchSpy = vi.fn().mockResolvedValue(fakeShow);
        mediaStore._fetchAndCacheMediaDetails = fetchSpy;

        await mediaStore.startPlayback(episode);

        expect(fetchSpy, 'show details must be fetched on demand when not cached').toHaveBeenCalledWith(42, expect.objectContaining({
            id: 42,
            media_type: 'tv'
        }));
        expect(playbackStore.nowPlayingShowDetails, 'nowPlayingShowDetails must not be null in TV direct-launch path').not.toBeNull();
        expect(playbackStore.nowPlayingShowDetails?.seasons?.length).toBeGreaterThan(0);

        const eps = mediaStore.currentSeasonEpisodes;
        expect(eps, 'currentSeasonEpisodes must be populated so the drawer is not empty').not.toEqual([]);
        expect(eps.length).toBe(2);
    });

    it('uses cached show details when present (normal detail-view path) without fetching', async () => {
        const episode = {
            id: 100,
            episode_number: 1,
            season_number: 1,
            show_id: 42,
            show_title: 'Test Show',
            video_url: 'https://example.com/ep1.mp4',
            video_urls: [{url: 'https://example.com/ep1.mp4', language: 'en', type: 'sub'}],
        };
        const cachedShow = {
            id: 42,
            name: 'Test Show',
            media_type: 'tv',
            seasons: [{
                id: 1,
                season_number: 1,
                name: 'Season 1',
                episodes: [{id: 100, episode_number: 1, season_number: 1}]
            }],
        };
        libraryStore.cachedItems.set(42, cachedShow);

        const fetchSpy = vi.fn();
        mediaStore._fetchAndCacheMediaDetails = fetchSpy;

        await mediaStore.startPlayback(episode);

        expect(fetchSpy, 'no API fetch when show is already cached').not.toHaveBeenCalled();
        expect(playbackStore.nowPlayingShowDetails?.id).toBe(42);
        expect(mediaStore.currentSeasonEpisodes.length).toBe(1);
    });
});