/**
 * Link service
 *
 * Owns the persistence of video links and the "add a season" workflows
 * that used to live directly inside `mediaStore`. Splitting these out
 * keeps the facade thin and makes the link logic testable in isolation.
 *
 * Functions in this module are pure w.r.t. the MobX store: they only
 * touch Dexie and the small `context` object (sub-stores) the caller
 * passes in, so the same code can run from the mediaStore facade, from
 * a future server-side resolver, and from unit tests.
 */
import { db } from './db.js';

const PREF_KEY_PREFIX = 'preferredSource:';

/**
 * Read the preferred source for a show from Dexie.
 * @param {number|string} showId
 * @returns {Promise<string|null>}
 */
export async function getPreferredSource(showId) {
    const rec = await db.preferredSources.get({ showId });
    return rec?.origin ?? null;
}

/**
 * Persist the preferred source origin for a show.
 * @param {number|string} showId
 * @param {string} origin
 */
export async function setPreferredSource(showId, origin) {
    await db.preferredSources.put({ showId, origin });
}

/**
 * Add the given links to the database in one transaction.
 * @param {Array<{mediaId: number|string, url: string, label?: string, language?: string, type?: string, isValid?: boolean}>} links
 */
export async function addLinksToMedia(mediaId, links) {
    const linksToAdd = links.map((link) => ({
        // Per-link mediaId wins when set (e.g. episode links built
        // by `buildLinksForSeason`), otherwise fall back to the
        // parent id passed by callers like `LinkMovieModal` that
        // attach links directly to a single movie/show.
        mediaId: link.mediaId ?? mediaId,
        url: link.url,
        label: link.label || safeHostname(link.url),
        language: link.language,
        type: link.type,
        isValid: link.isValid ?? true,
    }));

    if (linksToAdd.length > 0 && !(await getPreferredSource(mediaId))) {
        const first = safeOrigin(linksToAdd[0].url);
        if (first) {
            try {
                await setPreferredSource(mediaId, first);
            } catch (e) {
                console.warn('Could not set preferred source', e);
            }
        }
    }

    await db.mediaLinks.bulkAdd(linksToAdd);
    return linksToAdd.length;
}

/**
 * Delete a single link by id, returning the parent mediaId (if any).
 * @param {number|string} linkId
 * @returns {Promise<number|string|null>}
 */
export async function deleteMediaLink(linkId) {
    return db.transaction('rw', db.mediaLinks, async () => {
        const link = await db.mediaLinks.get(linkId);
        if (link) {
            await db.mediaLinks.delete(linkId);
            return link.mediaId;
        }
        return null;
    });
}

/**
 * Build the concrete list of links to add for a season from the
 * user-supplied payload (pattern / list / json).
 *
 * Returns either an object with the links or an object with an
 * error message. The caller (mediaStore facade) translates errors
 * into localized snackbars.
 *
 * @param {object} args
 * @param {object} args.show          Show/movie the user is editing.
 * @param {number} args.seasonNumber  Season being edited (1-based).
 * @param {'pattern'|'list'|'json'} args.method
 * @param {object} args.data          Form payload for the chosen method.
 * @param {string} args.language
 * @param {string} args.type
 * @param {string} [args.seasonName]
 */
export async function buildLinksForSeason({ show, seasonNumber, method, data, language, type, seasonName: _seasonName }) {
    const season = show.seasons?.find((s) => s.season_number === seasonNumber);
    if (!season) {
        return { error: 'season-not-found' };
    }

    const linksToAdd = [];
    switch (method) {
        case 'pattern': {
            const startEpisode = data.start || 1;
            const endEpisode = data.end || season.episode_count;
            const safeEndEpisode = Math.min(endEpisode, season.episode_count);
            let currentNumber = data.startNum ?? startEpisode;

            for (let i = startEpisode; i <= safeEndEpisode; i++) {
                const epNum = String(currentNumber).padStart(data.padding, '0');
                const ep = season.episodes.find((e) => e.episode_number === i);
                if (ep) {
                    const url = data.pattern.replace(/\[@EP\]/g, epNum);
                    linksToAdd.push({
                        mediaId: ep.id,
                        url,
                        label: data.label ? data.label.replace(/\[@EP\]/g, epNum) : safeHostname(url),
                        language,
                        type,
                    });
                    currentNumber++;
                }
            }
            break;
        }
        case 'list': {
            const urls = data.list.split('\n').filter((u) => u.trim());
            if (urls.length !== season.episode_count) {
                return { error: 'link-count-mismatch', linkCount: urls.length, episodeCount: season.episode_count };
            }
            season.episodes.forEach((ep, index) => {
                linksToAdd.push({
                    mediaId: ep.id,
                    url: urls[index],
                    label: safeHostname(urls[index]),
                    language,
                    type,
                });
            });
            break;
        }
        case 'json': {
            const parsed = JSON.parse(data.json);
            if (!Array.isArray(parsed)) throw new Error('JSON must be an array.');
            if (parsed.length !== season.episode_count) {
                return { error: 'link-count-mismatch', linkCount: parsed.length, episodeCount: season.episode_count };
            }
            season.episodes.forEach((ep, index) => {
                const item = parsed[index];
                if (typeof item === 'string') {
                    linksToAdd.push({ mediaId: ep.id, url: item, label: safeHostname(item), language, type });
                } else if (typeof item === 'object' && item.url) {
                    linksToAdd.push({
                        mediaId: ep.id,
                        url: item.url,
                        label: item.label || safeHostname(item.url),
                        language: item.language || language,
                        type: item.type || type,
                    });
                }
            });
            break;
        }
        default:
            return { error: 'unknown-method' };
    }

    return { linksToAdd };
}

// ===== internal helpers =====

function safeHostname(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

function safeOrigin(url) {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

// re-exported for tests
export { PREF_KEY_PREFIX };
