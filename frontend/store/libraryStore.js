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
import { db } from '../services/db.js';

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
        // ponytail: debug exposure for e2e testing — remove in production
        if (typeof window !== 'undefined') window.__libraryStore = this;
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
            const key = String(link.mediaId);
            const arr = linksMap.get(key) || [];
            arr.push(link);
            linksMap.set(key, arr);
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

    // ===== MUTATIONS =====
    // Plain MobX actions that mutate the sub-store state and persist the
    // change to Dexie. They were previously inlined in the monolithic
    // `mediaStore`; the actions are kept here so the store stays the
    // single source of truth for the library, while the public facade
    // (see mediaStore.js) re-exports them for backward compatibility.

    /**
     * Toggle an item in/out of the user's library. Persists the new
     * ordering and caches the catalog payload when adding a brand-new
     * item so the next "My list" view doesn't have to re-fetch it.
     */
    toggleMyList(item) {
        if (!item || item.id == null) return;
        const itemId = item.id;
        if (this.myList.includes(itemId)) {
            this.myList = this.myList.filter((id) => id !== itemId);
            db.myList.delete(itemId).catch((e) =>
                console.warn('[libraryStore] failed to delete myList entry', e)
            );
        } else {
            this.myList = [...this.myList, itemId];
            db.myList.put({ id: itemId, order: this.myList.length - 1 }).catch((e) =>
                console.warn('[libraryStore] failed to persist myList entry', e)
            );
            if (!this.cachedItems.has(itemId)) {
                this.cachedItems.set(itemId, item);
                db.cachedItems.put(item).catch((e) =>
                    console.warn('[libraryStore] failed to cache new myList item', e)
                );
            }
        }
    }

    /**
     * Drag-and-drop reorder: move the entry at `dragIndex` to `dropIndex`.
     * Persists the new ordering in one bulkPut so the next reload renders
     * the list in the right order.
     */
    async reorderMyList(dragIndex, dropIndex) {
        if (dragIndex === dropIndex) return;
        const reordered = [...this.myList];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        this.myList = reordered;
        const itemsToUpdate = reordered.map((id, index) => ({ id, order: index }));
        try {
            await db.myList.bulkPut(itemsToUpdate);
        } catch (e) {
            console.warn('[libraryStore] failed to persist reordered myList', e);
        }
    }

    /**
     * Persist an explicit ordering (e.g. produced by a drag-end handler
     * that couldn't use a simple index swap). Same persistence as
     * `reorderMyList` but accepts a full id list.
     */
    async setMyListOrder(orderedIds) {
        this.myList = [...orderedIds];
        const itemsToUpdate = orderedIds.map((id, index) => ({ id, order: index }));
        try {
            await db.myList.bulkPut(itemsToUpdate);
        } catch (e) {
            console.warn('[libraryStore] failed to persist myList order', e);
        }
    }

    /**
     * Remove an episode from "continue watching" by deleting both the
     * in-memory progress map and the Dexie row. Snackbars are owned by
     * the caller (mediaStore facade) to keep this store I/O-only.
     */
    async removeFromContinueWatching(episodeId) {
        this.episodeProgress.delete(episodeId);
        try {
            await db.episodeProgress.delete(episodeId);
        } catch (e) {
            console.warn('[libraryStore] failed to delete episodeProgress', e);
        }
    }

    /**
     * Update the watch progress for an episode. Marks the episode as
     * "watched" once more than 90% has been consumed. Persists the new
     * row only when something meaningful changed (progress advanced or
     * the watched flag flipped) to avoid spamming Dexie on every
     * `timeupdate` event.
     */
    updateEpisodeProgress(progress) {
        const { episodeId, currentTime, duration } = progress;
        if (!episodeId || !duration || duration <= 0) return;
        const watched = currentTime / duration > 0.9;
        const existing = this.episodeProgress.get(episodeId);
        if (existing && existing.currentTime >= currentTime && existing.watched === watched) {
            return;
        }
        const newProgress = {
            episodeId,
            currentTime,
            duration,
            watched,
            lastWatchedAt: Date.now(),
        };
        this.episodeProgress.set(episodeId, newProgress);
        db.episodeProgress.put(newProgress).catch((e) =>
            console.warn('[libraryStore] failed to persist episodeProgress', e)
        );
    }

    /**
     * Flip the explicit "watched" flag for an episode. Used by the
     * "mark watched" button in the episodes drawer; the inverse
     * (`!existing?.watched`) is the new state.
     */
    async toggleEpisodeWatchedStatus(episodeId) {
        const existing = this.episodeProgress.get(episodeId);
        const nextWatched = !existing?.watched;
        const newProgress = {
            episodeId,
            currentTime: nextWatched ? existing?.duration || 1 : 0,
            duration: existing?.duration || 1,
            watched: nextWatched,
            lastWatchedAt: Date.now(),
        };
        this.episodeProgress.set(episodeId, newProgress);
        try {
            await db.episodeProgress.put(newProgress);
        } catch (e) {
            console.warn('[libraryStore] failed to persist episodeProgress', e);
        }
    }

    /** Persist a custom intro duration (in seconds) for a show. */
    setShowIntroDuration(showId, duration) {
        this.showIntroDurations.set(showId, duration);
        db.showIntroDurations.put({ id: showId, duration }).catch((e) =>
            console.warn('[libraryStore] failed to persist showIntroDurations', e)
        );
    }

    /** Persist the season the user is currently viewing for a show. */
    setSelectedSeasonForShow(showId, seasonNumber) {
        this.selectedSeasons.set(showId, seasonNumber);
        db.selectedSeasons.put({ showId, seasonNumber }).catch((e) =>
            console.warn('[libraryStore] failed to persist selectedSeasons', e)
        );
    }

    /**
     * Persist the user's link filter preferences for a show (the
     * language and the type they tend to pick in the link modal).
     */
    setShowFilterPreference(showId, preference) {
        const current = this.showFilterPreferences.get(showId) || {};
        const merged = { ...current, ...preference };
        this.showFilterPreferences.set(showId, merged);
        db.showFilterPreferences.put({ showId, ...merged }).catch((e) =>
            console.warn('[libraryStore] failed to persist showFilterPreferences', e)
        );
    }

    // ===== LINK HELPERS =====
    // The action layer for the media links map: the in-memory cache
    // is authoritative for the current session; Dexie is the source
    // of truth on reload. These methods are used by both the playback
    // pipeline (startPlayback, _fetchAndCacheMediaDetails) and the
    // library UI (refresh after add/delete).

    /**
     * Read the links for a media from the in-memory map, lazily
     * populating from Dexie on first access. Returns the array of
     * link records (or an empty array).
     */
    async getLinksForMedia(mediaId) {
        if (this.mediaLinks.has(mediaId)) {
            return this.mediaLinks.get(mediaId) || [];
        }
        let links = [];
        try {
            links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
        } catch (e) {
            console.warn('[libraryStore] failed to load mediaLinks', e);
            return [];
        }
        this.mediaLinks.set(String(mediaId), links);
        return links;
    }

    /**
     * Find the first episode of a show that hasn't been watched yet
     * AND has at least one link. Returns the bare episode record.
     */
    findFirstUnwatchedEpisode(item) {
        if (!item || !item.seasons) return null;
        for (const season of item.seasons) {
            if (!season.episodes) continue;
            for (const episode of season.episodes) {
                const progress = this.episodeProgress.get(episode.id);
                if (progress?.watched) continue;
                if (this.hasLinks(episode.id)) return episode;
            }
        }
        // Fallback: any episode that has links, watched or not.
        for (const season of item.seasons) {
            if (!season.episodes) continue;
            for (const episode of season.episodes) {
                if (this.hasLinks(episode.id)) return episode;
            }
        }
        return null;
    }

    /**
     * Reload the links for a media from Dexie into the in-memory map.
     * Called after add/delete operations in the link editor.
     */
    async refreshLinksForMediaId(mediaId) {
        let links = [];
        try {
            links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
        } catch (e) {
            console.warn('[libraryStore] failed to refresh mediaLinks', e);
            return;
        }
        this.mediaLinks.set(String(mediaId), links);
    }
}

export const libraryStore = new LibraryStore();
