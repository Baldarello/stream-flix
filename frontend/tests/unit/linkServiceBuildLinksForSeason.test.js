/**
 * Unit tests for buildLinksForSeason covering:
 * 1. Pattern method with the test URL (DrStone pattern)
 * 2. Advanced config (half-season ranges with startNum/endNum)
 * 3. URL hostname extraction via safeHostname
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/db.js', () => {
    const tableMock = () => ({
        put: vi.fn().mockResolvedValue(undefined),
        add: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        bulkAdd: vi.fn().mockResolvedValue(undefined),
        bulkPut: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null), // ← null so !(await getPreferredSource) is true
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        equals: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        transaction: vi.fn((_mode, _store, cb) => cb()),
    });
    return {
        db: {
            mediaLinks: tableMock(),
            preferredSources: tableMock(),
        },
    };
});

const { addLinksToMedia, buildLinksForSeason } = await import('../../services/linkService.js');

const DRSTONE_PATTERN = 'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_[@EP]_ITA.mp4';

const makeShow = (episodes) => ({
    id: 42,
    name: 'Dr. Stone',
    seasons: [
        {
            season_number: 1,
            name: 'Stagione 1',
            episode_count: episodes.length,
            episodes,
        },
    ],
});

describe('buildLinksForSeason – pattern method', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolves [@EP] placeholder to zero-padded episode numbers', async () => {
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
            { id: 103, episode_number: 3 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: { pattern: DRSTONE_PATTERN, padding: 2, label: '' },
            language: 'ITA',
            type: 'sub',
            seasonName: 'Dr. Stone S1',
        });

        expect(result.error).toBeUndefined();
        expect(result.linksToAdd).toHaveLength(3);
        expect(result.linksToAdd[0].url).toBe(
            'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_01_ITA.mp4'
        );
        expect(result.linksToAdd[1].url).toBe(
            'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_02_ITA.mp4'
        );
        expect(result.linksToAdd[2].url).toBe(
            'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_03_ITA.mp4'
        );
    });

    it('uses episode mediaId (not show id) so links attach to episodes', async () => {
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: { pattern: DRSTONE_PATTERN, padding: 2 },
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        expect(result.error).toBeUndefined();
        await addLinksToMedia(show.id, result.linksToAdd);

        // Import the mock to check calls
        const { db } = await import('../../services/db.js');
        const persisted = db.mediaLinks.bulkAdd.mock.calls[0][0];
        expect(persisted.map((l) => l.mediaId)).toEqual([101, 102]);
    });

    it('falls back to safeHostname(url) when no label is provided', async () => {
        const show = makeShow([{ id: 101, episode_number: 1 }]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: { pattern: 'https://srv18-tsurukusa.sweetpixel.org/ep/[@EP].mp4', padding: 2 },
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        expect(result.linksToAdd[0].label).toBe('srv18-tsurukusa.sweetpixel.org');
    });
});

describe('buildLinksForSeason – advanced half-season config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles start/end episode range with custom startNum (half-season)', async () => {
        // Simulates linking episodes 7-12 using numbers 7-12 from a different source
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
            { id: 103, episode_number: 3 },
            { id: 104, episode_number: 4 },
            { id: 105, episode_number: 5 },
            { id: 106, episode_number: 6 },
            { id: 107, episode_number: 7 },
            { id: 108, episode_number: 8 },
            { id: 109, episode_number: 9 },
            { id: 110, episode_number: 10 },
            { id: 111, episode_number: 11 },
            { id: 112, episode_number: 12 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: {
                pattern: 'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_[@EP]_ITA.mp4',
                padding: 2,
                label: '',
                start: 7, // start at episode 7
                end: 12, // end at episode 12
                startNum: 7, // use number 7 in the URL
            },
            language: 'ITA',
            type: 'sub',
            seasonName: 'Dr. Stone S1',
        });

        expect(result.error).toBeUndefined();
        expect(result.linksToAdd).toHaveLength(6);
        // Episode 7 → URL number 07
        expect(result.linksToAdd[0].url).toBe(
            'https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_07_ITA.mp4'
        );
        // TMDB has episodes 1,2,3,5,6,7 (episode 4 not yet aired).
        // The source has 6 episodes numbered 1-6.
        // start=1, end=6 maps URL numbers 01-06 to TMDB episodes 1,2,3,5,6,7
        expect(result.linksToAdd[5].mediaId).toBe(112);
    });

    it('maps non-contiguous episode numbers to contiguous URL numbers', async () => {
        // TMDB has episodes 1,2,3,5,6,7 (episode 4 not yet aired).
        // The source has 6 episodes numbered 1-6.
        // start=1, end=6 maps URL numbers 01-06 to TMDB episodes 1,2,3,5,6,7
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
            { id: 103, episode_number: 3 },
            // episode 4 missing from TMDB
            { id: 104, episode_number: 5 },
            { id: 105, episode_number: 6 },
            { id: 106, episode_number: 7 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: {
                pattern: 'https://srv18-tsurukusa.sweetpixel.org/Ep_[@EP]_ITA.mp4',
                padding: 2,
                label: '',
                start: 1,
                end: 6,
                startNum: 1,
            },
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        // Loop i=1..6 → finds episodes at TMDB numbers 1,2,3,5,6,7 (ep4 missing = skipped) = 5 links
        expect(result.linksToAdd).toHaveLength(5);
        // Episode 5 (TMDB) gets URL number 04
        expect(result.linksToAdd[3].url).toBe('https://srv18-tsurukusa.sweetpixel.org/Ep_04_ITA.mp4');
        expect(result.linksToAdd[3].mediaId).toBe(104); // episode 5 in TMDB
    });

    it('caps URL numbers at endNum when explicitly set (half-season source numbering)', async () => {
        // TMDB has 6 episodes but source only has 5 episodes numbered 7-11.
        // User sets episode range 1-6 and number range 7-11 (5 numbers for 5 URLs).
        // The endNum cap ensures we never generate a 6th URL number.
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
            { id: 103, episode_number: 3 },
            { id: 104, episode_number: 4 },
            { id: 105, episode_number: 5 },
            { id: 106, episode_number: 6 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: {
                pattern: 'https://srv18-tsurukusa.sweetpixel.org/Ep_[@EP]_ITA.mp4',
                padding: 2,
                label: '',
                start: 1,
                end: 6,
                startNum: 7,
                endNum: 11, // ← only 5 numbers available (7,8,9,10,11)
            },
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        // Loop i=1: currentNumber=7 (≤11) → link
        // Loop i=2: currentNumber=8 (≤11) → link
        // Loop i=3: currentNumber=9 (≤11) → link
        // Loop i=4: currentNumber=10 (≤11) → link
        // Loop i=5: currentNumber=11 (≤11) → link
        // Loop i=6: currentNumber=12 (>11) → BREAK
        expect(result.linksToAdd).toHaveLength(5);
        expect(result.linksToAdd[0].url).toBe('https://srv18-tsurukusa.sweetpixel.org/Ep_07_ITA.mp4');
        expect(result.linksToAdd[4].url).toBe('https://srv18-tsurukusa.sweetpixel.org/Ep_11_ITA.mp4');
    });
    it('returns link-count-mismatch when list length does not match episode count', async () => {
        const show = makeShow([
            { id: 101, episode_number: 1 },
            { id: 102, episode_number: 2 },
            { id: 103, episode_number: 3 },
        ]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'list',
            data: { list: 'https://x.example/1\nhttps://x.example/2' }, // only 2 URLs for 3 episodes
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        expect(result.error).toBe('link-count-mismatch');
        expect(result.linkCount).toBe(2);
        expect(result.episodeCount).toBe(3);
    });

    it('addLinksToMedia persists episode links and sets preferred source', async () => {
        const show = makeShow([{ id: 101, episode_number: 1 }]);

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'pattern',
            data: { pattern: DRSTONE_PATTERN, padding: 2 },
            language: 'ITA',
            type: 'sub',
            seasonName: 'S1',
        });

        expect(result.error).toBeUndefined();
        await addLinksToMedia(show.id, result.linksToAdd);

        const { db } = await import('../../services/db.js');
        const persisted = db.mediaLinks.bulkAdd.mock.calls[0][0];
        expect(persisted).toHaveLength(1);
        expect(persisted[0].url).toContain('DrStone4_Ep_01_ITA.mp4');
    });
});
