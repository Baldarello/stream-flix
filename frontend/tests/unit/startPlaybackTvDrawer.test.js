/**
 * Unit tests for mediaStore._fetchAndCacheMediaDetails — regression for the
 * TV-mode episodes-drawer bug.
 *
 * Bug: _fetchAndCacheMediaDetails built episodes from the TMDB API without
 * adding `season_number` or `show_id` to each episode object. Those fields
 * lived only on the parent season. When continue-watching resolved an
 * episode via findEpisodeById, the item had no season_number, so
 * playbackStore.currentSeasonEpisodes short-circuited on
 * `'season_number' in nowPlayingItem` → false and returned [] → the drawer
 * rendered empty in TV mode (?tv=1).
 *
 * Fix: both episode-construction blocks in _fetchAndCacheMediaDetails now
 * add `season_number: season.season_number` and `show_id: itemId` to every
 * episode, so continue-watching items carry the season_number through to
 * startPlayback and currentSeasonEpisodes resolves correctly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
        events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
        send: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    },
}));

vi.mock('../../services/navigationService.js', () => ({
    navigateTo: vi.fn(),
    Routes: { PLAYER: '/player', HOME: '/' },
}));

import { mediaStore } from '../../store/mediaStore.js';
import { libraryStore } from '../../store/libraryStore.js';
import { playbackStore } from '../../store/playbackStore.js';
import { tvStore } from '../../features/tv/tvStore.js';

describe('_fetchAndCacheMediaDetails — episodes carry season_number + show_id', () => {
    let originalFetch;

    beforeEach(() => {
        libraryStore.cachedItems = new Map();
        libraryStore.mediaLinks = new Map();
        playbackStore.nowPlayingItem = null;
        playbackStore.nowPlayingShowDetails = null;
        playbackStore.selectedItem = null;
        tvStore.screen = 'home';
        originalFetch = mediaStore._fetchAndCacheMediaDetails;
    });

    afterEach(() => {
        mediaStore._fetchAndCacheMediaDetails = originalFetch;
    });

    it('startPlayback populates nowPlayingShowDetails with episodes that have season_number', async () => {
        const episode = {
            id: 100,
            episode_number: 1,
            season_number: 1,
            show_id: 42,
            show_title: 'Test Show',
            video_url: 'https://example.com/ep1.mp4',
            video_urls: [{ url: 'https://example.com/ep1.mp4', language: 'en', type: 'sub' }],
        };

        const fakeShow = {
            id: 42,
            name: 'Test Show',
            media_type: 'tv',
            seasons: [
                {
                    id: 1,
                    season_number: 1,
                    episodes: [
                        { id: 100, episode_number: 1, season_number: 1, show_id: 42 },
                        { id: 101, episode_number: 2, season_number: 1, show_id: 42 },
                    ],
                },
            ],
        };
        const fetchSpy = vi.fn().mockResolvedValue(fakeShow);
        mediaStore._fetchAndCacheMediaDetails = fetchSpy;

        await mediaStore.startPlayback(episode);

        expect(fetchSpy, 'show details must be fetched on demand when not cached').toHaveBeenCalledWith(
            42,
            expect.objectContaining({
                id: 42,
                media_type: 'tv',
            })
        );
        expect(playbackStore.nowPlayingShowDetails, 'nowPlayingShowDetails must not be null').not.toBeNull();

        const eps = mediaStore.currentSeasonEpisodes;
        expect(eps, 'currentSeasonEpisodes must be populated so the drawer is not empty').not.toEqual([]);
        expect(eps.length).toBe(2);
        expect(
            eps.every((ep) => 'season_number' in ep),
            'every episode must have season_number'
        ).toBe(true);
    });

    it('uses cached show details when present without fetching', async () => {
        const episode = {
            id: 100,
            episode_number: 1,
            season_number: 1,
            show_id: 42,
            show_title: 'Test Show',
            video_url: 'https://example.com/ep1.mp4',
            video_urls: [{ url: 'https://example.com/ep1.mp4', language: 'en', type: 'sub' }],
        };
        const cachedShow = {
            id: 42,
            name: 'Test Show',
            media_type: 'tv',
            seasons: [
                {
                    id: 1,
                    season_number: 1,
                    episodes: [{ id: 100, episode_number: 1, season_number: 1, show_id: 42 }],
                },
            ],
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
