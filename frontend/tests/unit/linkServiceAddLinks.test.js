/**
 * Regression test for the "link saved to a series doesn't appear
 * on its episodes" bug.
 *
 * Root cause: `setEpisodeLinksForSeason` builds link objects with
 * the per-episode id (`{mediaId: ep.id, ...}`) and then calls
 * `addLinksToMedia(show.id, linksToAdd)`. The service used to
 * overwrite every link's `mediaId` with the parent `show.id`, so
 * the rows were persisted against the show. The episode lookup
 * (`getLinksForMedia(ep.id)`) then saw nothing, while the snackbar
 * still claimed success.
 *
 * The fix lets `link.mediaId` win when present and only falls back
 * to the parameter for callers (like `LinkMovieModal`) that don't
 * set it themselves.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

const bulkAddMock = vi.fn().mockResolvedValue(undefined);
const putMock = vi.fn().mockResolvedValue(undefined);

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
    return { db: {
        myList: tableMock(),
        cachedItems: tableMock(),
        mediaLinks: { ...tableMock(), bulkAdd: bulkAddMock },
        episodeProgress: tableMock(),
        showIntroDurations: tableMock(),
        selectedSeasons: tableMock(),
        showFilterPreferences: tableMock(),
        preferredSources: { ...tableMock(), put: putMock },
        preferences: tableMock(),
        episodeContext: tableMock(),
    } };
});

const { addLinksToMedia, buildLinksForSeason } = await import('../../services/linkService.js');

describe('linkService.addLinksToMedia', () => {
    beforeEach(() => {
        bulkAddMock.mockClear();
        putMock.mockClear();
    });

    it('preserves the per-link mediaId when callers pass it explicitly', async () => {
        await addLinksToMedia(42, [
            { mediaId: 101, url: 'https://a.example/v1.mp4', label: 'a', language: 'it', type: 'source' },
            { mediaId: 102, url: 'https://a.example/v2.mp4', label: 'b', language: 'it', type: 'source' },
        ]);

        expect(bulkAddMock).toHaveBeenCalledTimes(1);
        const persisted = bulkAddMock.mock.calls[0][0];
        expect(persisted.map((l) => l.mediaId)).toEqual([101, 102]);
        expect(persisted.every((l) => l.url && l.label)).toBe(true);
    });

    it('falls back to the parent mediaId for callers that omit it (movie modal)', async () => {
        await addLinksToMedia(7, [
            { url: 'https://m.example/x.mp4', language: 'it', type: 'source' },
        ]);

        const persisted = bulkAddMock.mock.calls[0][0];
        expect(persisted[0].mediaId).toBe(7);
    });

    it('end-to-end: buildLinksForSeason → addLinksToMedia keeps episode ids', async () => {
        const show = {
            id: 999,
            seasons: [{
                season_number: 1,
                episode_count: 3,
                episodes: [
                    { id: 1001, episode_number: 1 },
                    { id: 1002, episode_number: 2 },
                    { id: 1003, episode_number: 3 },
                ],
            }],
        };

        const result = await buildLinksForSeason({
            show,
            seasonNumber: 1,
            method: 'list',
            data: { list: 'https://x.example/1\nhttps://x.example/2\nhttps://x.example/3' },
            language: 'it',
            type: 'source',
            seasonName: 'S1',
        });

        expect(result.error).toBeUndefined();
        await addLinksToMedia(show.id, result.linksToAdd);

        const persisted = bulkAddMock.mock.calls[0][0];
        expect(persisted.map((l) => l.mediaId)).toEqual([1001, 1002, 1003]);
    });
});