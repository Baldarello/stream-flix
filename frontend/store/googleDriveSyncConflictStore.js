/**
 * @fileoverview GoogleDriveSyncConflictStore
 *
 * Mobx store that owns the local state of the Google Drive sync conflict
 * modal. It is intentionally separate from `syncStore` (which orchestrates
 * the actual sync engine) and from `mediaStore` (the global megastore) so
 * the modal's `step` / `choices` / bulk-action mutations live in a screen
 * store, following the project rule "Don't use useState, create mobx
 * stores named after main Screen".
 *
 * The store reads the current conflict payload from `mediaStore.getSyncConflictData()`
 * (which is in turn delegated to `syncStore.syncConflictData`). The modal
 * hydrates `choices` via `initializeFromConflictData(conflictData)` whenever
 * the upstream `syncConflictData` changes or when the modal re-opens.
 */
import {makeAutoObservable} from 'mobx';

class GoogleDriveSyncConflictStore {
    /**
     * Active modal step.
     * - 'overview' shows the high-level summary + bulk actions.
     * - 'choose' shows the per-show chooser grid.
     *
     * @type {'overview' | 'choose'}
     */
    step = 'overview';

    /**
     * Editable copy of the conflict payload projected into per-show rows.
     * Each row carries the same shape the legacy useState-based modal used
     * to build: id, title, mediaType, myListAction, linksAction,
     * progressAction, deleteShow, plus the local/remote counts used by the
     * per-row summary chips.
     *
     * @type {Choice[]}
     */
    choices = [];

    constructor() {
        makeAutoObservable(this, {}, {autoBind: true});
    }

    // ===== COMPUTED =====

    /**
     * Aggregate counters used by the overview chips and the choose-step
     * header. All counts derive from the current `choices` so they update
     * the moment the user mutates a row.
     *
     * @returns {{
     *   total: number,
     *   withConflicts: number,
     *   localOnly: number,
     *   remoteOnly: number,
     *   toDelete: number
     * }}
     */
    get stats() {
        if (!this.choices.length) {
            return {total: 0, withConflicts: 0, localOnly: 0, remoteOnly: 0, toDelete: 0};
        }

        const withConflicts = this.choices.filter(c =>
            c.myListAction === 'both' || c.linksAction === 'both' || c.progressAction === 'both'
        ).length;
        const localOnly = this.choices.filter(c =>
            c.myListAction === 'local' && c.linksAction === 'local' && c.progressAction === 'local'
        ).length;
        const remoteOnly = this.choices.filter(c =>
            c.myListAction === 'remote' && c.linksAction === 'remote' && c.progressAction === 'remote'
        ).length;
        const toDelete = this.choices.filter(c => c.deleteShow).length;

        return {total: this.choices.length, withConflicts, localOnly, remoteOnly, toDelete};
    }

    // ===== ACTIONS =====

    setStep(step) {
        this.step = step;
    }

    /**
     * Build a fresh `choices` array from the upstream conflict payload. The
     * projection mirrors the logic that previously lived inside the modal
     * component's `useMemo` block so the visible behaviour is unchanged.
     *
     * Each candidate id is filtered so that we only surface shows that
     * the user has actually configured (i.e. added to My List, or that
     * have a media link / episode progress entry on either side of the
     * conflict). Shows that are only present as "browsed" cached items
     * are intentionally dropped: they aren't a real conflict and would
     * only clutter the modal with rows the user has never set up.
     *
     * @param {object | null | undefined} conflictData
     */
    initializeFromConflictData(conflictData) {
        if (!conflictData) {
            this.choices = [];
            return;
        }

        // Coerce every id to a number up-front. The My List arrays may
        // carry numeric ids while a plain-object `shows` payload exposes
        // string keys, which would otherwise produce duplicate rows for
        // the same show (e.g. `1` and `'1'` both ending up in the same
        // Set before the dedupe in `result.push({id: Number(id)})`).
        const toIdKey = (rawId) => {
            const n = Number(rawId);
            return Number.isFinite(n) ? n : null;
        };

        const myListLocalIds = (conflictData.myList?.local || [])
            .map(toIdKey)
            .filter((id) => id !== null);
        const myListRemoteIds = (conflictData.myList?.remote || [])
            .map(toIdKey)
            .filter((id) => id !== null);
        const myListLocalIdSet = new Set(myListLocalIds);
        const myListRemoteIdSet = new Set(myListRemoteIds);

        // Normalize the candidate show ids. We always start from the
        // union of My List ids + shows-map ids; the filter step below
        // drops the ones that have no real conflict / user data.
        const candidateIds = new Set();
        myListLocalIds.forEach((id) => candidateIds.add(id));
        myListRemoteIds.forEach((id) => candidateIds.add(id));
        if (conflictData.shows) {
            if (typeof conflictData.shows.forEach === 'function') {
                conflictData.shows.forEach((_, id) => {
                    const n = toIdKey(id);
                    if (n !== null) candidateIds.add(n);
                });
            } else {
                Object.keys(conflictData.shows).forEach((id) => {
                    const n = toIdKey(id);
                    if (n !== null) candidateIds.add(n);
                });
            }
        }

        const mediaLinksLocal = conflictData.mediaLinks?.local || [];
        const mediaLinksRemote = conflictData.mediaLinks?.remote || [];
        const episodeProgressLocal = conflictData.episodeProgress?.local || [];
        const episodeProgressRemote = conflictData.episodeProgress?.remote || [];

        const result = [];
        candidateIds.forEach(id => {
            const showEntry = (typeof conflictData.shows?.get === 'function')
                ? conflictData.shows.get(id)
                : conflictData.shows?.[id];
            const localShow = showEntry?.local;
            const remoteShow = showEntry?.remote;

            const localLinks = mediaLinksLocal.filter(l => {
                if (localShow?.seasons) {
                    return localShow.seasons.some(s => s.episodes.some(e => e.id === l.mediaId));
                }
                return l.mediaId === id;
            });
            const remoteLinks = mediaLinksRemote.filter(l => {
                if (remoteShow?.seasons) {
                    return remoteShow.seasons.some(s => s.episodes.some(e => e.id === l.mediaId));
                }
                return l.mediaId === id;
            });

            const localProgress = episodeProgressLocal.filter(p => {
                if (!localShow?.seasons) return false;
                return localShow.seasons.some(s => s.episodes.some(e => e.id === p.episodeId));
            });
            const remoteProgress = episodeProgressRemote.filter(p => {
                if (!remoteShow?.seasons) return false;
                return remoteShow.seasons.some(s => s.episodes.some(e => e.id === p.episodeId));
            });

            const localInList = myListLocalIdSet.has(id);
            const remoteInList = myListRemoteIdSet.has(id);

            let myListAction = 'none';
            if (localInList && remoteInList) myListAction = 'both';
            else if (localInList) myListAction = 'local';
            else if (remoteInList) myListAction = 'remote';

            let linksAction = 'both';
            if (localLinks.length > 0 && remoteLinks.length === 0) linksAction = 'local';
            else if (remoteLinks.length > 0 && localLinks.length === 0) linksAction = 'remote';

            let progressAction = 'both';
            if (localProgress.length > 0 && remoteProgress.length === 0) progressAction = 'local';
            else if (remoteProgress.length > 0 && localProgress.length === 0) progressAction = 'remote';

            // Drop shows that the user has never configured: not in either
            // My List, and no media links or episode progress on either
            // side. They are noise in the conflict modal and would only
            // generate empty / meaningless "no conflict" rows.
            const hasAnyUserData =
                myListAction !== 'none' ||
                localLinks.length > 0 ||
                remoteLinks.length > 0 ||
                localProgress.length > 0 ||
                remoteProgress.length > 0;
            if (!hasAnyUserData) {
                return;
            }

            result.push({
                id,
                title: localShow?.name || localShow?.title || remoteShow?.name || remoteShow?.title || `Show #${id}`,
                mediaType: localShow?.media_type || remoteShow?.media_type || 'tv',
                myListAction,
                linksAction,
                progressAction,
                deleteShow: false,
                localLinkCount: localLinks.length,
                remoteLinkCount: remoteLinks.length,
                localProgressCount: localProgress.length,
                remoteProgressCount: remoteProgress.length,
            });
        });

        this.choices = result.sort((a, b) => {
            const aHasConflict = a.myListAction === 'both' || a.linksAction === 'both' || a.progressAction === 'both';
            const bHasConflict = b.myListAction === 'both' || b.linksAction === 'both' || b.progressAction === 'both';
            if (aHasConflict && !bHasConflict) return -1;
            if (!aHasConflict && bHasConflict) return 1;
            return a.title.localeCompare(b.title);
        });
    }

    /**
     * Update a single field on a single row. Used by the per-row `Select`
     * controls (myList/links/progress) and by the delete checkbox.
     */
    updateChoice(id, field, value) {
        this.choices = this.choices.map(c => (
            c.id === id ? {...c, [field]: value} : c
        ));
    }

    toggleDeleteShow(id) {
        this.choices = this.choices.map(c => (
            c.id === id ? {...c, deleteShow: !c.deleteShow} : c
        ));
    }

    /**
     * Bulk action: prefer local for every show. Shows that have no local
     * contribution (i.e. myListAction === 'none' or 'remote' alone) get
     * 'none' for myList, mirroring the legacy implementation.
     */
    takeAllLocal() {
        this.choices = this.choices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'local' || s.myListAction === 'both' ? 'local' : 'none',
            linksAction: 'local',
            progressAction: 'local',
        }));
    }

    /**
     * Bulk action: prefer remote for every show, mirroring the legacy
     * implementation.
     */
    takeAllRemote() {
        this.choices = this.choices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'remote' || s.myListAction === 'both' ? 'remote' : 'none',
            linksAction: 'remote',
            progressAction: 'remote',
        }));
    }

    /**
     * Bulk action: keep everything from both sides. Shows that originally
     * had no myList contribution keep 'none' for myList, mirrors the
     * legacy implementation.
     */
    takeAllBoth() {
        this.choices = this.choices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'none' ? 'none' : 'both',
            linksAction: 'both',
            progressAction: 'both',
        }));
    }

    /**
     * Bulk action: flag every "local-only" row for deletion. A show is
     * considered local-only when all three of its actions are 'local'.
     */
    markLocalOnlyForDeletion() {
        this.choices = this.choices.map(s => {
            const isLocalOnly =
                s.myListAction === 'local' &&
                s.linksAction === 'local' &&
                s.progressAction === 'local';
            return {...s, deleteShow: isLocalOnly};
        });
    }

    /**
     * Bulk action: flag every "remote-only" row for deletion. Mirror of
     * `markLocalOnlyForDeletion`.
     */
    markRemoteOnlyForDeletion() {
        this.choices = this.choices.map(s => {
            const isRemoteOnly =
                s.myListAction === 'remote' &&
                s.linksAction === 'remote' &&
                s.progressAction === 'remote';
            return {...s, deleteShow: isRemoteOnly};
        });
    }

    /**
     * Reset the store to its initial state. Called by the modal on close
     * so a subsequent conflict re-hydrates from scratch.
     */
    reset() {
        this.step = 'overview';
        this.choices = [];
    }
}

export const googleDriveSyncConflictStore = new GoogleDriveSyncConflictStore();
