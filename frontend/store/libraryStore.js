/**
 * LibraryStore
 *
 * Owns the user's personal library and the offline cache of catalog
 * items. This is the only store that talks directly to Dexie for
 * the library tables (myList, cachedItems, mediaLinks, episodeProgress,
 * showIntroDurations, preferredSources, selectedSeasons,
 * showFilterPreferences, episodeContextMap).
 *
 * Heavy persistence logic still lives in `mediaStore.loadPersistedData`
 * for now, which is responsible for calling `bulkImportFromDb` on this
 * store at boot time.
 */
import { makeAutoObservable } from 'mobx';

class LibraryStore {
    /** @type {number[]} Ordered list of media IDs in the user's library. */
    myList = [];
    /** @type {Map<number|string, object>} Cached catalog items (TMDB shows/movies). */
    cachedItems = new Map();
    /** @type {Map<number|string, object[]>} All video links, keyed by mediaId. */
    mediaLinks = new Map();
    /** @type {Set<number|string>} IDs of links marked invalid in the last check. */
    invalidLinkIds = new Set();
    /** @type {Map<number|string, object>} Episode watch progress. */
    episodeProgress = new Map();
    /** @type {Map<number|string, number>} Last-edited timestamps per mediaId (ms epoch). */
    libraryLastEdited = new Map();
    /** @type {Set<number|string>} Bulk-selected link IDs in the library view. */
    librarySelectedLinkIds = new Set();
    libraryBulkMode = false;
    libraryEditingLinkId = null;
    libraryEditingPreferredSourceShowId = null;
    librarySearchQuery = '';
    /** @type {Map<number|string, number>} showId -> preferred origin URL. */
    preferredSources = new Map();
    /** @type {Map<number|string, number>} showId -> selected season number. */
    selectedSeasons = new Map();
    /** @type {Map<number|string, {language: string, type: string}>} showId -> filter prefs. */
    showFilterPreferences = new Map();
    /** @type {Map<number|string, number>} showId -> custom intro duration (sec). */
    showIntroDurations = new Map();
    /** @type {Map<number|string, object>} episodeId -> {season, episode} context. */
    episodeContextMap = new Map();
    /** @type {object[]} Append-only viewing history. */
    viewingHistory = [];
    isReorderMode = false;
    invalidLinksLoading = false;
    activeLibraryTab = 0;
    linksFilterShowId = null;
    showOnlyInvalidLinks = false;

    constructor() {
        makeAutoObservable(this, {
            cachedItems: true,
            mediaLinks: true,
            invalidLinkIds: true,
            episodeProgress: true,
            libraryLastEdited: true,
            librarySelectedLinkIds: true,
            preferredSources: true,
            selectedSeasons: true,
            showFilterPreferences: true,
            showIntroDurations: true,
            episodeContextMap: true,
        });
    }

    // ===== DERIVED DATA =====

    get myListItems() {
        return this.myList.map((id) => this.cachedItems.get(id)).filter((item) => !!item);
    }

    get allUniqueLabels() {
        const labels = new Set();
        for (const links of this.mediaLinks.values()) {
            for (const link of links) {
                if (link.label) labels.add(link.label);
            }
        }
        return Array.from(labels).sort();
    }

    get continueWatchingItems() {
        const sortedProgress = Array.from(this.episodeProgress.values())
            .filter((p) => !p.watched && p.currentTime > 0)
            .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0));

        const episodesWithProgress = sortedProgress
            .map((p) => {
                const ep = this.findEpisodeById(p.episodeId);
                if (!ep) return null;
                return { ...ep, startTime: p.currentTime, progress: p };
            })
            .filter((item) => !!item);

        const showMap = new Map();
        for (const item of episodesWithProgress) {
            const showId = item.show_id;
            const existing = showMap.get(showId);
            if (!existing || (item.episode_number && existing.episode_number && item.episode_number > existing.episode_number)) {
                showMap.set(showId, item);
            }
        }
        return Array.from(showMap.values());
    }

    get shareableShows() {
        return Array.from(this.cachedItems.values()).filter(
            (item) => item.media_type === 'tv' && this.hasLinks(item.id)
        );
    }

    get showsWithLinks() {
        const showIds = new Set();
        for (const [mediaId] of this.mediaLinks.entries()) {
            for (const show of this.cachedItems.values()) {
                if (show.seasons) {
                    for (const season of show.seasons) {
                        if (season.episodes.some((e) => e.id === mediaId)) {
                            showIds.add(show.id);
                            break;
                        }
                    }
                }
                if (show.id === mediaId && show.media_type === 'movie') {
                    showIds.add(show.id);
                }
            }
        }
        return Array.from(showIds).map((id) => this.cachedItems.get(id)).filter((item) => !!item);
    }

    get libraryCounts() {
        return {
            myList: this.myListItems.length,
            continueWatching: this.continueWatchingItems.length,
            links: this.mediaLinks.size,
            invalid: this.invalidLinkIds.size,
        };
    }

    // ===== HELPERS =====

    hasLinks(mediaId) {
        const links = this.mediaLinks.get(mediaId);
        return Array.isArray(links) && links.length > 0;
    }

    findEpisodeById(episodeId) {
        for (const show of this.cachedItems.values()) {
            if (!show.seasons) continue;
            for (const season of show.seasons) {
                if (!season.episodes) continue;
                const found = season.episodes.find((e) => e.id === episodeId);
                if (found) return found;
            }
        }
        return null;
    }

    // ===== BULK IMPORT FROM DB =====
    // Called once at boot by mediaStore.loadPersistedData so that the
    // sub-store observables are populated in a single runInAction.

    bulkImportFromDb({
        myListIds = [],
        cachedItems: items = [],
        mediaLinks: links = [],
        progress = [],
        preferredSourcesData = [],
        selectedSeasonsData = [],
        showFilterPreferencesData = [],
        introDurations = [],
        episodeContext = [],
    } = {}) {
        this.myList = myListIds;
        this.cachedItems = new Map(items.map((i) => [i.id, i]));
        const linksMap = new Map();
        links.forEach((link) => {
            const arr = linksMap.get(link.mediaId) || [];
            arr.push(link);
            linksMap.set(link.mediaId, arr);
        });
        this.mediaLinks = linksMap;
        this.episodeProgress = new Map(progress.map((p) => [p.episodeId, p]));
        this.preferredSources = new Map(preferredSourcesData.map((p) => [p.showId, p.origin]));
        this.selectedSeasons = new Map(selectedSeasonsData.map((s) => [s.showId, s.seasonNumber]));
        this.showFilterPreferences = new Map(
            showFilterPreferencesData.map((p) => [p.showId, { language: p.language, type: p.type }])
        );
        this.showIntroDurations = new Map(introDurations.map((i) => [i.id, i.duration]));
        this.episodeContextMap = new Map(episodeContext.map((e) => [e.episodeId, e]));
    }
}

export const libraryStore = new LibraryStore();
