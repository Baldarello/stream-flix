// placeholder
/**
 * MediaStore (facade)
 *
 * This is the *single* store that the rest of the app still imports
 * (`import { mediaStore } from '../store/mediaStore'`). It no longer
 * holds the state itself: that responsibility is split across the
 * five thematic sub-stores:
 *
 *   - `catalogStore`       : trending, latest, top series, popular anime
 *   - `searchStore`        : search query, results, debounce
 *   - `libraryStore`       : myList, cached items, links, progress
 *   - `preferencesStore`   : language, future theme/accent prefs
 *   - `uiStore`            : snackbar, modals, notifications, debug
 *   - `playbackStore`      : now playing, selected item, origin
 *
 * The facade exposes the same public surface that the previous
 * monolithic `mediaStore` had: every state field is re-exposed as
 * a getter, every action is re-bound. This means existing
 * components and tests don't have to change.
 *
 * The only thing that *remains* in this file is the cross-cutting
 * orchestration that touches multiple sub-stores (bootstrapping
 * data, websocket handling, link validation orchestration,
 * back/forward navigation). Anything that fits a single domain
 * lives in the sub-store.
 */
import {makeAutoObservable, runInAction} from 'mobx';

import {checkLinksForShow} from '../services/linkValidator.js';
import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';
import {getSeriesDetails, getSeriesEpisodes} from '../services/apiCall';
import {it as itTranslations} from '../locales/it.js';
import {en as enTranslations} from '../locales/en.js';
import {
    addLinksToMedia as addLinksToMediaSvc,
    buildLinksForSeason,
    deleteMediaLink as deleteMediaLinkSvc,
    setPreferredSource as setPreferredSourceSvc,
} from '../services/linkService.js';
import {searchStore} from './searchStore.js';
import {libraryStore} from './libraryStore.js';
import {uiStore} from './uiStore.js';
import {playbackStore} from './playbackStore.js';
import {watchTogetherStore} from './watchTogetherStore.js';
import {syncStore} from './syncStore.js';
import {remoteStore} from './remoteStore.js';
import {preferencesStore} from './preferencesStore.js';
import {navigateTo, Routes} from '../services/navigationService.js';
import {catalogStore} from './catalogStore.js';
import {googleDriveSyncConflictStore} from './googleDriveSyncConflictStore';

const ALL_TRANSLATIONS = {it: itTranslations, en: enTranslations};

class MediaStore {
    /**
     * Public EventTarget for fine-grained subscriptions (e.g. the
     * i18n hook listens for `languagechange`). Components that
     * only need MobX observables should keep using `mobx-react`.
     */
    events = new EventTarget();

    constructor() {
        makeAutoObservable(this, {events: false});
        this._bindWebsocketEvents();
    }

    _bindWebsocketEvents() {
        websocketService.events.on('message', this.handleIncomingMessage);
        websocketService.events.on('open', this.initRemoteSession);
        websocketService.events.on('debug', this.addDebugMessage);
        websocketService.events.on('slaves-offline', this.handleSlavesOffline);
    }

    // ===== CATALOG =================================================

    get trending() {
        return catalogStore.trending;
    }

    get latestMovies() {
        return catalogStore.latestMovies;
    }

    get topSeries() {
        return catalogStore.topSeries;
    }

    get popularAnime() {
        return catalogStore.popularAnime;
    }

    get loading() {
        return catalogStore.loading;
    }

    get error() {
        return catalogStore.error;
    }

    get heroContent() {
        return catalogStore.heroContent;
    }

    get allMovies() {
        return catalogStore.allMovies;
    }

    get homePageRows() {
        return catalogStore.homePageRows;
    }

    fetchAllData = catalogStore.fetchAllData.bind(catalogStore);

    // ===== SEARCH ==================================================

    get searchQuery() {
        return searchStore.query;
    }

    get searchResults() {
        return searchStore.results;
    }

    get isSearchActive() {
        return searchStore.isActive;
    }

    get isSearching() {
        return searchStore.isSearching;
    }

    toggleSearch = searchStore.toggle.bind(searchStore);
    setSearchQuery = searchStore.setQuery.bind(searchStore);

    // ===== LIBRARY =================================================

    get myList() {
        return libraryStore.myList;
    }

    get cachedItems() {
        return libraryStore.cachedItems;
    }

    get mediaLinks() {
        return libraryStore.mediaLinks;
    }

    get invalidLinkIds() {
        return libraryStore.invalidLinkIds;
    }

    get episodeProgress() {
        return libraryStore.episodeProgress;
    }

    get preferredSources() {
        return libraryStore.preferredSources;
    }

    get selectedSeasons() {
        return libraryStore.selectedSeasons;
    }

    get showFilterPreferences() {
        return libraryStore.showFilterPreferences;
    }

    get showIntroDurations() {
        return libraryStore.showIntroDurations;
    }

    get episodeContextMap() {
        return libraryStore.episodeContextMap;
    }

    get viewingHistory() {
        return libraryStore.viewingHistory;
    }

    get isReorderMode() {
        return libraryStore.isReorderMode;
    }

    get invalidLinksLoading() {
        return libraryStore.invalidLinksLoading;
    }

    get activeLibraryTab() {
        return libraryStore.activeLibraryTab;
    }

    get linksFilterShowId() {
        return libraryStore.linksFilterShowId;
    }

    get showOnlyInvalidLinks() {
        return libraryStore.showOnlyInvalidLinks;
    }

    get librarySearchQuery() {
        return libraryStore.librarySearchQuery;
    }

    get libraryLastEdited() {
        return libraryStore.libraryLastEdited;
    }

    get librarySelectedLinkIds() {
        return libraryStore.librarySelectedLinkIds;
    }

    get libraryBulkMode() {
        return libraryStore.libraryBulkMode;
    }

    get libraryEditingLinkId() {
        return libraryStore.libraryEditingLinkId;
    }
    set libraryEditingLinkId(v) {
        libraryStore.libraryEditingLinkId = v;
    }

    openLinkEditModal = (linkId) => {
        libraryStore.libraryEditingLinkId = linkId;
    };

    closeLinkEditModal = () => {
        libraryStore.libraryEditingLinkId = null;
    };

    validateLink = async (linkId) => {
        const link = await db.mediaLinks.get(linkId);
        if (!link) return false;
        const {checkLinkValidity} = await import('../services/linkValidator.js');
        return await checkLinkValidity(link.url);
    };

    // ===== LIBRARY SELECTION ================================
    toggleLinkSelection = (linkId) => {
        if (!linkId) return;
        if (libraryStore.librarySelectedLinkIds.has(linkId)) {
            libraryStore.librarySelectedLinkIds.delete(linkId);
        } else {
            libraryStore.librarySelectedLinkIds.add(linkId);
        }
    };

    clearLinkSelection = () => {
        libraryStore.librarySelectedLinkIds.clear();
    };

    // ===== BULK LINK OPERATIONS =============================
    setBulkLinkLanguage = async (ids, language) => {
        if (!ids || ids.length === 0) return;
        await db.mediaLinks.where('id').anyOf(ids).modify({language});
    };

    setBulkLinkType = async (ids, type) => {
        if (!ids || ids.length === 0) return;
        await db.mediaLinks.where('id').anyOf(ids).modify({type});
    };

    bulkDeleteLinks = async (ids) => {
        if (!ids || ids.length === 0) return;
        await db.mediaLinks.bulkDelete(ids);
        ids.forEach((id) => libraryStore.librarySelectedLinkIds.delete(id));
        // Refresh affected mediaIds
        const uniqueMediaIds = new Set();
        for (const link of await db.mediaLinks.where('id').anyOf(ids).toArray()) {
            uniqueMediaIds.add(String(link.mediaId));
        }
        for (const mediaId of uniqueMediaIds) {
            await this.refreshLinksForMediaId(mediaId);
        }
    };

    deleteAllInvalidLinks = async () => {
        const invalidIds = Array.from(libraryStore.invalidLinkIds);
        if (invalidIds.length === 0) return;
        await db.mediaLinks.bulkDelete(invalidIds);
        libraryStore.invalidLinkIds.clear();
        // Refresh affected shows
        const uniqueShowIds = new Set();
        for (const link of await db.mediaLinks.where('id').anyOf(invalidIds).toArray()) {
            uniqueShowIds.add(String(link.mediaId));
        }
        for (const showId of uniqueShowIds) {
            await this.refreshLinksForMediaId(showId);
        }
        this.showSnackbar('notifications.invalidLinksDeleted', 'success', true, {count: invalidIds.length});
    };

    validateAllLinks = async () => {
        runInAction(() => {
            libraryStore.invalidLinksLoading = true;
        });
        try {
            const shows = Array.from(libraryStore.cachedItems.values()).filter(
                (item) => item.media_type === 'tv' || item.media_type === 'movie'
            );
            const freshInvalidIds = new Set();
            for (const show of shows) {
                const episodeIds = show.seasons?.flatMap((s) => s.episodes?.map((e) => e.id)) ?? [];
                const allIds = [String(show.id), ...episodeIds.map(String)];
                const links = await db.mediaLinks.where('mediaId').anyOf(allIds).toArray();
                if (links.length === 0) continue;
                const {checkLinksForShow} = await import('../services/linkValidator.js');
                const invalid = await checkLinksForShow(show, libraryStore.mediaLinks);
                for (const inv of invalid) {
                    if (inv.mediaId) freshInvalidIds.add(String(inv.mediaId));
                }
            }
            runInAction(() => {
                libraryStore.invalidLinkIds = freshInvalidIds;
            });
        } finally {
            runInAction(() => {
                libraryStore.invalidLinksLoading = false;
            });
        }
    };

    get libraryEditingPreferredSourceShowId() {
        return libraryStore.libraryEditingPreferredSourceShowId;
    }

    get myListItems() {
        return libraryStore.myListItems;
    }

    get allUniqueLabels() {
        return libraryStore.allUniqueLabels;
    }

    get continueWatchingItems() {
        return libraryStore.continueWatchingItems;
    }

    get shareableShows() {
        return libraryStore.shareableShows;
    }

    get showsWithLinks() {
        return libraryStore.showsWithLinks;
    }

    get libraryCounts() {
        return libraryStore.libraryCounts;
    }

    set isReorderMode(v) {
        libraryStore.isReorderMode = v;
    }

    set invalidLinksLoading(v) {
        libraryStore.invalidLinksLoading = v;
    }

    set activeLibraryTab(v) {
        libraryStore.activeLibraryTab = v;
    }

    set linksFilterShowId(v) {
        libraryStore.linksFilterShowId = v;
    }

    set showOnlyInvalidLinks(v) {
        libraryStore.showOnlyInvalidLinks = v;
    }

    set librarySearchQuery(v) {
        libraryStore.librarySearchQuery = v;
    }

    toggleReorderMode = () => {
        libraryStore.isReorderMode = !libraryStore.isReorderMode;
    };
    setShowOnlyInvalidLinks = (v) => {
        libraryStore.showOnlyInvalidLinks = v;
    };

    setLinksFilterShowId = (v) => {
        libraryStore.linksFilterShowId = v;
    };

    // ===== PREFERENCES =============================================

    get language() {
        return preferencesStore.language;
    }

    get translations() {
        return ALL_TRANSLATIONS[preferencesStore.language] || ALL_TRANSLATIONS.it;
    }

    setLanguage = (lang) => {
        preferencesStore.setLanguage(lang);
        this.events.dispatchEvent(new CustomEvent('languagechange', {detail: {language: lang}}));
    };

    // ===== UI ======================================================

    get snackbarMessage() {
        return uiStore.snackbarMessage;
    }

    get notifications() {
        return uiStore.notifications;
    }

    get isNotificationsModalOpen() {
        return uiStore.isNotificationsModalOpen;
    }

    get isDebugModeActive() {
        return uiStore.isDebugModeActive;
    }

    get debugMessages() {
        return uiStore.debugMessages;
    }

    get isProfileDrawerOpen() {
        return uiStore.isProfileDrawerOpen;
    }

    get isShareModalOpen() {
        return uiStore.isShareModalOpen;
    }

    get isImportModalOpen() {
        return uiStore.isImportModalOpen;
    }

    get isImportingLibrary() {
        return uiStore.isImportingLibrary;
    }

    get importUrl() {
        return uiStore.importUrl;
    }

    get isRevisionsModalOpen() {
        return uiStore.isRevisionsModalOpen;
    }

    get isRevisionsLoading() {
        return uiStore.isRevisionsLoading;
    }

    get revisions() {
        return uiStore.revisions;
    }

    get isLinkEpisodesModalOpen() {
        return uiStore.isLinkEpisodesModalOpen;
    }

    get linkingEpisodesForItem() {
        return uiStore.linkingEpisodesForItem;
    }

    get isLinkMovieModalOpen() {
        return uiStore.isLinkMovieModalOpen;
    }

    get linkingMovieItem() {
        return uiStore.linkingMovieItem;
    }

    get isLinkSelectionModalOpen() {
        return uiStore.isLinkSelectionModalOpen;
    }

    set isLinkSelectionModalOpen(v) {
        uiStore.isLinkSelectionModalOpen = v;
    }

    get itemForLinkSelection() {
        return uiStore.itemForLinkSelection;
    }

    set itemForLinkSelection(v) {
        uiStore.itemForLinkSelection = v;
    }

    get linksForSelection() {
        return uiStore.linksForSelection;
    }

    set linksForSelection(v) {
        uiStore.linksForSelection = v;
    }

    get linkSelectionContext() {
        return uiStore.linkSelectionContext;
    }

    set linkSelectionContext(v) {
        uiStore.linkSelectionContext = v;
    }

    get expandedLinkAccordionId() {
        return uiStore.expandedLinkAccordionId;
    }

    get isEpisodesDrawerOpen() {
        return uiStore.isEpisodesDrawerOpen;
    }

    get isEpisodeInfoModalOpen() {
        return uiStore.isEpisodeInfoModalOpen;
    }

    get episodeInfoModalData() {
        return uiStore.episodeInfoModalData;
    }

    get expandedEpisodeId() {
        return uiStore.expandedEpisodeId;
    }

    get episodeDetailsDialogOpenForEpisodeId() {
        return uiStore.episodeDetailsDialogOpenForEpisodeId;
    }

    get linkEpisodesTab() {
        return uiStore.linkEpisodesTab;
    }

    get linkEpisodesSeason() {
        return uiStore.linkEpisodesSeason;
    }

    get activeView() {
        return uiStore.activeView;
    }

    get unreadNotificationsCount() {
        return uiStore.unreadNotificationsCount;
    }

    set isDebugModeActive(v) {
        uiStore.isDebugModeActive = v;
    }

    set isProfileDrawerOpen(v) {
        uiStore.isProfileDrawerOpen = v;
    }

    showSnackbar = uiStore.showSnackbar.bind(uiStore);
    hideSnackbar = uiStore.hideSnackbar.bind(uiStore);
    addNotification = uiStore.addNotification.bind(uiStore);
    markNotificationRead = uiStore.markNotificationRead.bind(uiStore);
    markAllNotificationsRead = uiStore.markAllNotificationsRead.bind(uiStore);
    clearNotifications = uiStore.clearNotifications.bind(uiStore);
    dismissNotification = uiStore.dismissNotification.bind(uiStore);
    openNotificationsModal = uiStore.openNotificationsModal.bind(uiStore);
    closeNotificationsModal = uiStore.closeNotificationsModal.bind(uiStore);
    addDebugMessage = uiStore.addDebugMessage.bind(uiStore);
    setActiveView = uiStore.setActiveView.bind(uiStore);
    toggleProfileDrawer = uiStore.toggleProfileDrawer.bind(uiStore);
    openShareModal = uiStore.openShareModal.bind(uiStore);
    closeShareModal = uiStore.closeShareModal.bind(uiStore);
    openImportModal = uiStore.openImportModal.bind(uiStore);
    closeImportModal = uiStore.closeImportModal.bind(uiStore);
    setImportUrl = uiStore.setImportUrl.bind(uiStore);
    setIsImportingLibrary = uiStore.setIsImportingLibrary.bind(uiStore);
    openRevisionsModal = uiStore.openRevisionsModal.bind(uiStore);
    closeRevisionsModal = uiStore.closeRevisionsModal.bind(uiStore);
    setRevisions = uiStore.setRevisions.bind(uiStore);
    setRevisionsLoading = uiStore.setRevisionsLoading.bind(uiStore);
    openLinkEpisodesModal = uiStore.openLinkEpisodesModal.bind(uiStore);
    closeLinkEpisodesModal = uiStore.closeLinkEpisodesModal.bind(uiStore);
    setLinkEpisodesTab = uiStore.setLinkEpisodesTab.bind(uiStore);
    setLinkEpisodesSeason = uiStore.setLinkEpisodesSeason.bind(uiStore);
    setExpandedLinkAccordionId = uiStore.setExpandedLinkAccordionId.bind(uiStore);
    setExpandedEpisodeId = uiStore.setExpandedEpisodeId.bind(uiStore);
    openEpisodeDetails = uiStore.openEpisodeDetails.bind(uiStore);
    closeEpisodeDetails = uiStore.closeEpisodeDetails.bind(uiStore);
    openLinkMovieModal = uiStore.openLinkMovieModal.bind(uiStore);
    closeLinkMovieModal = uiStore.closeLinkMovieModal.bind(uiStore);
    openLinkSelectionModal = uiStore.openLinkSelectionModal.bind(uiStore);
    closeLinkSelectionModal = uiStore.closeLinkSelectionModal.bind(uiStore);
    openEpisodesDrawer = uiStore.openEpisodesDrawer.bind(uiStore);
    closeEpisodesDrawer = uiStore.closeEpisodesDrawer.bind(uiStore);
    openEpisodeInfoModal = uiStore.openEpisodeInfoModal.bind(uiStore);
    closeEpisodeInfoModal = uiStore.closeEpisodeInfoModal.bind(uiStore);

    // ===== PLAYBACK ================================================

    get isPlaying() {
        return playbackStore.isPlaying;
    }

    get nowPlayingItem() {
        return playbackStore.nowPlayingItem;
    }

    get nowPlayingShowDetails() {
        return playbackStore.nowPlayingShowDetails;
    }

    get playbackOriginItem() {
        return playbackStore.playbackOriginItem;
    }

    get selectedItem() {
        return playbackStore.selectedItem;
    }

    get isDetailLoading() {
        return playbackStore.isDetailLoading;
    }

    get currentShow() {
        return playbackStore.currentShow;
    }

    get currentSeasonEpisodes() {
        return playbackStore.currentSeasonEpisodes;
    }

    get nextEpisode() {
        return playbackStore.nextEpisode;
    }

    set selectedItem(v) {
        playbackStore.selectedItem = v;
    }

    set isDetailLoading(v) {
        playbackStore.isDetailLoading = v;
    }

    set playbackOriginItem(v) {
        playbackStore.playbackOriginItem = v;
    }

    set nowPlayingItem(v) {
        playbackStore.nowPlayingItem = v;
    }

    set nowPlayingShowDetails(v) {
        playbackStore.nowPlayingShowDetails = v;
    }

    set isPlaying(v) {
        playbackStore.isPlaying = v;
    }

    setNowPlaying = playbackStore.setNowPlaying.bind(playbackStore);
    stopPlayback = playbackStore.stopPlayback.bind(playbackStore);
    closeDetail = playbackStore.closeDetail.bind(playbackStore);
    _closeDetailWithoutHistory = playbackStore._closeDetail.bind(playbackStore);
    _stopPlaybackWithoutHistory = () => {
        runInAction(() => {
            if (playbackStore.playbackOriginItem) {
                playbackStore.selectedItem = playbackStore.playbackOriginItem;
                playbackStore.playbackOriginItem = null;
            }
            playbackStore.nowPlayingItem = null;
            playbackStore.nowPlayingShowDetails = null;
            playbackStore.isPlaying = false;
        });
    };

    // ===== WATCH TOGETHER (delegated) ==============================

    get watchTogetherModalOpen() {
        return watchTogetherStore.watchTogetherModalOpen;
    }

    set watchTogetherModalOpen(v) {
        watchTogetherStore.watchTogetherModalOpen = v;
    }

    get roomId() {
        return watchTogetherStore.roomId;
    }

    set roomId(v) {
        watchTogetherStore.roomId = v;
    }

    get hostId() {
        return watchTogetherStore.hostId;
    }

    set hostId(v) {
        watchTogetherStore.hostId = v;
    }

    get isHost() {
        return watchTogetherStore.isHost;
    }

    set isHost(v) {
        watchTogetherStore.isHost = v;
    }

    get participants() {
        return watchTogetherStore.participants;
    }

    set participants(v) {
        watchTogetherStore.participants = v;
    }

    get username() {
        return watchTogetherStore.username;
    }

    set username(v) {
        watchTogetherStore.username = v;
    }

    get watchTogetherError() {
        return watchTogetherStore.watchTogetherError;
    }

    set watchTogetherError(v) {
        watchTogetherStore.watchTogetherError = v;
    }

    get playbackState() {
        return watchTogetherStore.playbackState;
    }

    set playbackState(v) {
        watchTogetherStore.playbackState = v;
    }

    get chatHistory() {
        return watchTogetherStore.chatHistory;
    }

    set chatHistory(v) {
        watchTogetherStore.chatHistory = v;
    }

    get joinRoomIdFromUrl() {
        return watchTogetherStore.joinRoomIdFromUrl;
    }

    set joinRoomIdFromUrl(v) {
        watchTogetherStore.joinRoomIdFromUrl = v;
    }

    get watchTogetherSelectedItem() {
        return watchTogetherStore.watchTogetherSelectedItem;
    }

    set watchTogetherSelectedItem(v) {
        watchTogetherStore.watchTogetherSelectedItem = v;
    }

    get myClientId() {
        return watchTogetherStore.myClientId;
    }

    set myClientId(v) {
        watchTogetherStore.myClientId = v;
    }

    openWatchTogetherModal = watchTogetherStore.openWatchTogetherModal.bind(watchTogetherStore);
    closeWatchTogetherModal = watchTogetherStore.closeWatchTogetherModal.bind(watchTogetherStore);
    createRoom = watchTogetherStore.createRoom.bind(watchTogetherStore);
    joinRoom = watchTogetherStore.joinRoom.bind(watchTogetherStore);
    changeWatchTogetherMedia = watchTogetherStore.changeWatchTogetherMedia.bind(watchTogetherStore);
    changeRoomCode = watchTogetherStore.changeRoomCode.bind(watchTogetherStore);
    sendPlaybackControl = watchTogetherStore.sendPlaybackControl.bind(watchTogetherStore);
    addPlaybackListener = watchTogetherStore.addPlaybackListener.bind(watchTogetherStore);
    sendChatMessage = watchTogetherStore.sendChatMessage.bind(watchTogetherStore);
    transferHost = watchTogetherStore.transferHost.bind(watchTogetherStore);
    changeName = watchTogetherStore.changeName.bind(watchTogetherStore);
    setJoinRoomIdFromUrl = (v) => {
        watchTogetherStore.joinRoomIdFromUrl = v;
    };

    // ===== SYNC (delegated) ========================================

    get googleUser() {
        return syncStore.googleUser;
    }

    set googleUser(v) {
        syncStore.googleUser = v;
    }

    get isSyncing() {
        return syncStore.isSyncing;
    }

    set isSyncing(v) {
        syncStore.isSyncing = v;
    }

    get isReloadingData() {
        return syncStore.isReloadingData;
    }

    set isReloadingData(v) {
        syncStore.isReloadingData = v;
    }

    get isGoogleAuthLoading() {
        return syncStore.isGoogleAuthLoading;
    }

    set isGoogleAuthLoading(v) {
        syncStore.isGoogleAuthLoading = v;
    }

    get isSyncConflictModalOpen() {
        return syncStore.isSyncConflictModalOpen;
    }

    set isSyncConflictModalOpen(v) {
        syncStore.isSyncConflictModalOpen = v;
    }

    get syncConflictData() {
        return syncStore.syncConflictData;
    }

    set syncConflictData(v) {
        syncStore.syncConflictData = v;
    }

    get isProcessingSyncConflict() {
        return syncStore.isProcessingSyncConflict;
    }

    set isProcessingSyncConflict(v) {
        syncStore.isProcessingSyncConflict = v;
    }

    get isLoggedIn() {
        return !!syncStore.googleUser;
    }

    reloadAllData = syncStore.reloadAllData.bind(syncStore);
    synchronizeWithDrive = syncStore.synchronizeWithDrive.bind(syncStore);
    closeSyncConflictModal = syncStore.closeSyncConflictModal.bind(syncStore);
    mergeLocalAndRemote = syncStore.mergeLocalAndRemote.bind(syncStore);
    overwriteLocalWithRemote = syncStore.overwriteLocalWithRemote.bind(syncStore);
    overwriteRemoteWithLocal = syncStore.overwriteRemoteWithLocal.bind(syncStore);
    cancelSyncAndLogout = syncStore.cancelSyncAndLogout.bind(syncStore);
    backupToDrive = syncStore.backupToDrive.bind(syncStore);
    restoreFromDrive = syncStore.restoreFromDrive.bind(syncStore);
    triggerDebouncedBackup = syncStore.triggerDebouncedBackup.bind(syncStore);
    setGoogleUser = syncStore.setGoogleUser.bind(syncStore);

    // ===== GOOGLE DRIVE SYNC CONFLICT MODAL (delegated) ===========
    // Per-screen state for the conflict-resolution modal. Lives in a
    // dedicated mobx store (`googleDriveSyncConflictStore`) and is
    // exposed through the facade so the modal can be called without
    // props and remain observer-friendly.
    get syncConflictStep() {
        return googleDriveSyncConflictStore.step;
    }

    set syncConflictStep(v) {
        googleDriveSyncConflictStore.step = v;
    }

    get syncConflictChoices() {
        return googleDriveSyncConflictStore.choices;
    }

    set syncConflictChoices(v) {
        googleDriveSyncConflictStore.choices = v;
    }

    get syncConflictStats() {
        return googleDriveSyncConflictStore.stats;
    }

    setSyncConflictStep = googleDriveSyncConflictStore.setStep.bind(googleDriveSyncConflictStore);
    initializeSyncConflictChoices = googleDriveSyncConflictStore.initializeFromConflictData.bind(googleDriveSyncConflictStore);
    updateSyncConflictChoice = googleDriveSyncConflictStore.updateChoice.bind(googleDriveSyncConflictStore);
    toggleSyncConflictDeleteShow = googleDriveSyncConflictStore.toggleDeleteShow.bind(googleDriveSyncConflictStore);
    takeAllLocalSyncConflict = googleDriveSyncConflictStore.takeAllLocal.bind(googleDriveSyncConflictStore);
    takeAllRemoteSyncConflict = googleDriveSyncConflictStore.takeAllRemote.bind(googleDriveSyncConflictStore);
    takeAllBothSyncConflict = googleDriveSyncConflictStore.takeAllBoth.bind(googleDriveSyncConflictStore);
    markLocalOnlySyncConflictForDeletion = googleDriveSyncConflictStore.markLocalOnlyForDeletion.bind(googleDriveSyncConflictStore);
    markRemoteOnlySyncConflictForDeletion = googleDriveSyncConflictStore.markRemoteOnlyForDeletion.bind(googleDriveSyncConflictStore);
    resetSyncConflict = googleDriveSyncConflictStore.reset.bind(googleDriveSyncConflictStore);

    // ===== REMOTE (delegated) ======================================

    get isRemoteMaster() {
        return remoteStore.isRemoteMaster;
    }

    set isRemoteMaster(v) {
        remoteStore.isRemoteMaster = v;
    }

    get isRemoteMasterConnected() {
        return remoteStore.isRemoteMasterConnected;
    }

    set isRemoteMasterConnected(v) {
        remoteStore.isRemoteMasterConnected = v;
    }

    get slaveId() {
        return remoteStore.slaveId;
    }

    set slaveId(v) {
        remoteStore.slaveId = v;
    }

    get slaveShortCode() {
        return remoteStore.slaveShortCode;
    }

    set slaveShortCode(v) {
        remoteStore.slaveShortCode = v;
    }

    get hasLoadedInitialData() {
        return remoteStore.hasLoadedInitialData;
    }

    set hasLoadedInitialData(v) {
        remoteStore.hasLoadedInitialData = v;
    }

    get masterReconnectAttempts() {
        return remoteStore.masterReconnectAttempts;
    }

    set masterReconnectAttempts(v) {
        remoteStore.masterReconnectAttempts = v;
    }

    get masterReconnectTimer() {
        return remoteStore.masterReconnectTimer;
    }

    set masterReconnectTimer(v) {
        remoteStore.masterReconnectTimer = v;
    }

    get isReconnecting() {
        return remoteStore.isReconnecting;
    }

    set isReconnecting(v) {
        remoteStore.isReconnecting = v;
    }

    get remoteSlaveState() {
        return remoteStore.remoteSlaveState;
    }

    set remoteSlaveState(v) {
        remoteStore.remoteSlaveState = v;
    }

    get remoteSelectedItem() {
        return remoteStore.remoteSelectedItem;
    }

    set remoteSelectedItem(v) {
        remoteStore.remoteSelectedItem = v;
    }

    get isRemoteDetailLoading() {
        return remoteStore.isRemoteDetailLoading;
    }

    set isRemoteDetailLoading(v) {
        remoteStore.isRemoteDetailLoading = v;
    }

    get remoteAction() {
        return remoteStore.remoteAction;
    }

    set remoteAction(v) {
        remoteStore.remoteAction = v;
    }

    get remoteFullItem() {
        return remoteStore.remoteFullItem;
    }

    set remoteFullItem(v) {
        remoteStore.remoteFullItem = v;
    }

    get isRemoteFullItemLoading() {
        return remoteStore.isRemoteFullItemLoading;
    }

    set isRemoteFullItemLoading(v) {
        remoteStore.isRemoteFullItemLoading = v;
    }

    get isIntroSkippableOnSlave() {
        return remoteStore.isIntroSkippableOnSlave;
    }

    set isIntroSkippableOnSlave(v) {
        remoteStore.isIntroSkippableOnSlave = v;
    }

    get shouldAutoFullscreen() {
        return remoteStore.shouldAutoFullscreen;
    }

    set shouldAutoFullscreen(v) {
        remoteStore.shouldAutoFullscreen = v;
    }

    get knownSlaves() {
        return remoteStore.knownSlaves;
    }

    set knownSlaves(v) {
        remoteStore.knownSlaves = v;
    }

    get missedPings() {
        return remoteStore.missedPings;
    }

    set missedPings(v) {
        remoteStore.missedPings = v;
    }

    get connectionHealth() {
        return remoteStore.connectionHealth;
    }

    set connectionHealth(v) {
        remoteStore.connectionHealth = v;
    }

    get pingInterval() {
        return remoteStore.pingInterval;
    }

    set pingInterval(v) {
        remoteStore.pingInterval = v;
    }

    get lastPingTime() {
        return remoteStore.lastPingTime;
    }

    set lastPingTime(v) {
        remoteStore.lastPingTime = v;
    }

    get isMediaSyncModalOpen() {
        return remoteStore.isMediaSyncModalOpen;
    }

    set isMediaSyncModalOpen(v) {
        remoteStore.isMediaSyncModalOpen = v;
    }

    get mediaSyncTargetSlaveId() {
        return remoteStore.mediaSyncTargetSlaveId;
    }

    set mediaSyncTargetSlaveId(v) {
        remoteStore.mediaSyncTargetSlaveId = v;
    }

    get _masterUiActiveView() {
        return remoteStore._masterUiActiveView;
    }

    set _masterUiActiveView(v) {
        remoteStore._masterUiActiveView = v;
    }

    get _masterUiSelectedItem() {
        return remoteStore._masterUiSelectedItem;
    }

    set _masterUiSelectedItem(v) {
        remoteStore._masterUiSelectedItem = v;
    }

    get currentActiveView() {
        return this.isRemoteMaster ? this._masterUiActiveView : this.activeView;
    }

    get currentSelectedItem() {
        return this.isRemoteMaster ? this._masterUiSelectedItem : this.selectedItem;
    }

    connectAsRemoteMaster(...args) { return remoteStore.connectAsRemoteMaster(...args); }
    disconnectRemoteMaster(...args) { return remoteStore.disconnectRemoteMaster(...args); }
    sendRemoteCommand(...args) { return remoteStore.sendRemoteCommand(...args); }
    stopRemotePlayback(...args) { return remoteStore.stopRemotePlayback(...args); }
    startPingInterval(...args) { return remoteStore.startPingInterval(...args); }
    stopPingInterval(...args) { return remoteStore.stopPingInterval(...args); }
    openMediaSyncModal(...args) { return remoteStore.openMediaSyncModal(...args); }
    closeMediaSyncModal(...args) { return remoteStore.closeMediaSyncModal(...args); }
    handleSlaveDisconnected(...args) { return remoteStore.handleSlaveDisconnected(...args); }
    startMasterReconnectTimer(...args) { return remoteStore.startMasterReconnectTimer(...args); }
    stopMasterReconnectTimer(...args) { return remoteStore.stopMasterReconnectTimer(...args); }
    triggerAutoFullscreen(...args) { return remoteStore.triggerAutoFullscreen(...args); }
    fetchRemoteFullItem(...args) { return remoteStore.fetchRemoteFullItem(...args); }
    playRemoteItem(...args) { return remoteStore.playRemoteItem(...args); }
    syncMediaFromMaster(...args) { return remoteStore.syncMediaFromMaster(...args); }
    openQRScanner(...args) { return remoteStore.openQRScanner(...args); }
    closeQRScanner(...args) { return remoteStore.closeQRScanner(...args); }
    initRemoteSession(...args) { return remoteStore.initRemoteSession(...args); }
    handleSlavesOffline(...args) { return remoteStore.handleSlavesOffline(...args); }

    // ===== CROSS-CUTTING ORCHESTRATION ============================

    /**
     * Bootstraps the app: persists the offline cache, the user's
     * library, the language preference and the remote session. The
     * heavy lifting is delegated to the sub-stores; this method
     * only coordinates timing and reacts to errors.
     */
    loadPersistedData = async () => {
        const [
            myListItems, cachedItems, mediaLinksData, introDurations, languagePref,
            progress, preferredSourcesData, usernamePref,
            selectedSeasonsData, showFilterPreferencesData,
            remoteMasterSlaveId, episodeContext
        ] = await Promise.all([
            db.myList.orderBy('order').toArray(),
            db.cachedItems.toArray(),
            db.mediaLinks.toArray(),
            db.showIntroDurations.toArray(),
            db.preferences.get('language'),
            db.episodeProgress.toArray(),
            db.preferredSources.toArray(),
            db.preferences.get('username'),
            db.selectedSeasons.toArray(),
            db.showFilterPreferences.toArray(),
            db.preferences.get('remoteMasterForSlaveId'),
            db.episodeContext ? db.episodeContext.toArray() : Promise.resolve([]),
        ]);

        runInAction(() => {
            libraryStore.bulkImportFromDb({
                myListIds: myListItems.map((item) => item.id),
                cachedItems,
                mediaLinks: mediaLinksData,
                progress,
                preferredSourcesData,
                selectedSeasonsData,
                showFilterPreferencesData,
                introDurations,
                episodeContext,
            });
            preferencesStore.hydrateFromDb(languagePref);
            if (usernamePref?.value) watchTogetherStore.username = usernamePref.value;

            if (remoteMasterSlaveId?.value) {
                remoteStore.isRemoteMaster = true;
                remoteStore.slaveId = remoteMasterSlaveId.value;
                uiStore.showSnackbar('notifications.reconnectingAsRemote', 'info', true);
            }
        });

        await remoteStore.loadPersistedData();

        if ((remoteStore.isSmartTV && remoteStore.slaveId) || remoteStore._pendingRemoteSessionInit) {
            remoteStore.initRemoteSession();
        } else if (remoteStore.isRemoteMaster && remoteStore.slaveId) {
            remoteStore.initRemoteSession();
        } else if (remoteStore.isSmartTVPairingVisible && !remoteStore.slaveId) {
            // Smart TV pairing is visible but no slaveId - need to re-register
            remoteStore.enableSmartTVMode();
        }
    };

    async loadInvalidLinksFromDb() {
        try {
            const invalidLinks = await db.mediaLinks
                .filter((link) => link.isValid === false || link.isValid === undefined)
                .toArray();
            const invalidIds = new Set();
            invalidLinks.forEach((link) => {
                if (link.id) invalidIds.add(link.id);
            });
            runInAction(() => {
                libraryStore.invalidLinkIds = invalidIds;
            });
        } catch (error) {
            console.error('Error loading invalid links from DB:', error);
        }
    }

    async checkAndNotifyInvalidLinks(item) {
        try {
            const invalidLinks = await checkLinksForShow(item, libraryStore.mediaLinks);
            if (invalidLinks.length > 0) {
                uiStore.addNotification({
                    type: 'invalid_links',
                    title: 'notifications.invalidLinks',
                    message: 'notifications.invalidLinksDesc',
                    data: invalidLinks,
                });
            }
        } catch (error) {
            console.error('Error checking links:', error);
        }
    }

    /**
     * Persist the links the user entered in the AddLinkTabs modal
     * for a given season. Thin facade over `linkService` so the
     * modal's `onSave` contract doesn't change.
     */
    setEpisodeLinksForSeason = async (payload) => {
        const {seasonNumber, method, data, language, type, seasonName} = payload;
        const show = uiStore.linkingEpisodesForItem;
        if (!show) return false;

        const result = await buildLinksForSeason({show, seasonNumber, method, data, language, type, seasonName});
        if (result.error === 'link-count-mismatch') {
            uiStore.showSnackbar('notifications.linkCountMismatch', 'error', true, {
                linkCount: result.linkCount,
                episodeCount: result.episodeCount,
            });
            return false;
        }
        if (result.error) {
            uiStore.showSnackbar('notifications.processingError', 'error', true, {error: result.error});
            return false;
        }
        const {linksToAdd} = result;
        if (linksToAdd.length > 0) {
            try {
                const savedCount = await addLinksToMediaSvc(show.id, linksToAdd);
                // ponytail: update libraryStore.mediaLinks directly with the newly added
                // links so MobX reactivity works even if refreshLinksForShow queries
                // with mismatched episode IDs (e.g. TVMaze vs TMDB in linkingEpisodesForItem).
                runInAction(() => {
                    for (const link of linksToAdd) {
                        const key = String(link.mediaId);
                        const existing = libraryStore.mediaLinks.get(key) || [];
                        libraryStore.mediaLinks.set(key, [...existing, link]);
                    }
                    this._patchCurrentItemVideoUrls(show.id);
                });
                await this.refreshLinksForShow(show.id);
                // Switch to manage tab only AFTER the store has been updated
                uiStore.setLinkEpisodesTab('manage');
                uiStore.showSnackbar('notifications.linksAddedSuccess', 'success', true, {
                    count: savedCount,
                });
                return true;
            } catch (error) {
                console.error(error);
                uiStore.showSnackbar('notifications.processingError', 'error', true, {error: error.message});
                return false;
            }
        }
        return false;
    };

    addLinksToMedia = async (mediaId, links) => {
        try {
            await addLinksToMediaSvc(mediaId, links);
            await this.refreshLinksForMediaId(mediaId);
        } catch (error) {
            console.error('Error saving links:', error);
            uiStore.showSnackbar('notifications.savingLinksError', 'error', true);
        }
    };

    deleteMediaLink = async (linkId) => {
        await deleteMediaLinkSvc(linkId);
        // Always refresh by show ID so linkingEpisodesForItem episode IDs are used
        // (avoids episode ID mismatch when link.mediaId was an episode ID).
        const showId = uiStore.linkingEpisodesForItem?.id;
        if (showId) await this.refreshLinksForShow(showId);
    };

    updateMediaLink = async (linkId, updates) => {
        await db.mediaLinks.update(linkId, updates);
        // Always refresh by show ID so linkingEpisodesForItem episode IDs are used.
        const showId = uiStore.linkingEpisodesForItem?.id;
        if (showId) await this.refreshLinksForShow(showId);
    };
    updateLinksDomain = async (payload) => {
        const {links, newDomain} = payload;
        try {
            const updatedLinks = links.map(link => {
                const url = new URL(link.url);
                const newUrl = new URL(url.pathname + url.search, newDomain);
                return {...link, url: newUrl.toString()};
            });
            await db.mediaLinks.bulkPut(updatedLinks);
            const showId = uiStore.linkingEpisodesForItem?.id;
            if (showId) await this.refreshLinksForShow(showId);
            this.showSnackbar('notifications.linksUpdated', 'success', true, {count: updatedLinks.length});
        } catch (error) {
            this.showSnackbar('notifications.domainUpdateError', 'error', true, {error: (error).message});
        }
    }
    /**
     * Patch `currentSelectedItem` and `cachedItems` episodes so their
     * `video_urls` stays in sync with the observable `libraryStore.mediaLinks`.
     * Called after every link mutation.
     */
    _patchCurrentItemVideoUrls(showId) {
        // ponytail: patch both selectedItem (playbackStore) and currentSelectedItem
        // (remoteStore in master mode) so the UI always sees fresh video_urls.
        const targets = [this.selectedItem];
        if (this.isRemoteMaster && this.currentSelectedItem !== this.selectedItem) {
            targets.push(this.currentSelectedItem);
        }
        // Also patch linkingEpisodesForItem directly — LinkEpisodesModal reads it.
        if (uiStore.linkingEpisodesForItem?.id === showId) {
            targets.push(uiStore.linkingEpisodesForItem);
        }
        for (const item of targets) {
            if (!item || item.id !== showId || !item.seasons) continue;
            item.seasons.forEach(season => {
                (season.episodes || []).forEach(ep => {
                    ep.video_urls = libraryStore.mediaLinks.get(String(ep.id)) || [];
                    ep.video_url = ep.video_urls[0]?.url || null;
                });
            });
        }
        // Also patch cachedItems so next detail open is warm
        const cached = libraryStore.cachedItems.get(showId);
        if (cached && cached.seasons) {
            cached.seasons.forEach(season => {
                (season.episodes || []).forEach(ep => {
                    ep.video_urls = libraryStore.mediaLinks.get(String(ep.id)) || [];
                    ep.video_url = ep.video_urls[0]?.url || null;
                });
            });
        }
    }
    async refreshLinksForShow(showId) {
        // Use episode IDs from linkingEpisodesForItem (same source that
        // buildLinksForSeason used to save links) to avoid TVMaze/TMDB
        // ID mismatch when cachedItems has different episode ID systems.
        const linkingShow = uiStore.linkingEpisodesForItem?.id === showId
            ? uiStore.linkingEpisodesForItem
            : null;
        const show = libraryStore.cachedItems.get(String(showId));
        const episodeIds = linkingShow?.seasons?.flatMap((s) => s.episodes?.map((e) => e.id) ?? []) ??
            show?.seasons?.flatMap((s) => s.episodes?.map((e) => e.id) ?? []) ?? [];
        const allIds = [String(showId), ...episodeIds.map(String)];
        const allLinks = await db.mediaLinks.where('mediaId').anyOf(allIds).toArray();
        const grouped = Object.groupBy(allLinks, (link) => String(link.mediaId));
        // ponytail: assign new Map reference so MobX observer re-renders
        const newMediaLinks = new Map(libraryStore.mediaLinks);
        for (const [mediaId, links] of Object.entries(grouped)) {
            newMediaLinks.set(mediaId, links);
        }
        runInAction(() => {
            libraryStore.mediaLinks = newMediaLinks;
            this._patchCurrentItemVideoUrls(showId);
        });
    }

    async refreshLinksForMediaId(mediaId) {
        return this.refreshLinksForShow(mediaId);
    }

    // ===== LIBRARY ACTIONS (delegated to libraryStore) ==============
    // These are pure re-bindings of the actions that now live in
    // `libraryStore` so the rest of the app (which imports only
    // `mediaStore`) keeps working without changing the call sites.

    toggleMyList = libraryStore.toggleMyList.bind(libraryStore);
    reorderMyList = libraryStore.reorderMyList.bind(libraryStore);
    setMyListOrder = libraryStore.setMyListOrder.bind(libraryStore);
    removeFromContinueWatching = libraryStore.removeFromContinueWatching.bind(libraryStore);
    updateEpisodeProgress = libraryStore.updateEpisodeProgress.bind(libraryStore);
    toggleEpisodeWatchedStatus = libraryStore.toggleEpisodeWatchedStatus.bind(libraryStore);
    setShowIntroDuration = libraryStore.setShowIntroDuration.bind(libraryStore);
    setSelectedSeasonForShow = libraryStore.setSelectedSeasonForShow.bind(libraryStore);
    setShowFilterPreference = libraryStore.setShowFilterPreference.bind(libraryStore);
    getLinksForMedia = libraryStore.getLinksForMedia.bind(libraryStore);
    findEpisodeById = libraryStore.findEpisodeById.bind(libraryStore);
    hasLinks = libraryStore.hasLinks.bind(libraryStore);
    findFirstUnwatchedEpisode = libraryStore.findFirstUnwatchedEpisode.bind(libraryStore);

    // ===== CROSS-CUTTING PLAYBACK / SELECTION =======================

    /**
     * Start playback for an item. This is the central "press play"
     * entry point used by the home cards, the hero, the continue
     * watching row, the link selection modal and the watch-together
     * flow. It owns the link-resolution + preferred-source logic
     * because that spans the library (where the links live) and
     * the playback store (where the active item lives).
     *
     * Behaviour summary:
     *  - Remote master: forward the play to the slave.
     *  - The item has a single link: bind it directly and push the
     *    detail view into the browser history so back closes the player.
     *  - The item has multiple links: open the link selection modal
     *    and bail out (the modal will call back into startPlayback
     *    with the chosen link as `video_url`).
     *  - The item has no links: snackbar + early return.
     *  - The item is an episode: resolve the parent show details so
     *    the "next episode" UI in the player has the season list.
     */
    startPlayback = async (item) => {
        if (!item) return;
        if (this.isRemoteMaster) {
            this.playRemoteItem(item);
            return;
        }

        if (!item.video_url) {
            const mediaId = item.id;
            let allLinks = item.video_urls || (await this.getLinksForMedia(mediaId));
            item.video_urls = allLinks;

            if (!allLinks || allLinks.length === 0) {
                // For a TV show we may have links on the episodes but
                // not on the show itself. Fall back to the first
                // episode that has a link.
                if ('seasons' in item && item.seasons) {
                    for (const season of item.seasons) {
                        if (!season.episodes) continue;
                        for (const ep of season.episodes) {
                            const episodeLinks = await this.getLinksForMedia(ep.id);
                            if (episodeLinks.length > 0) {
                                item.video_urls = episodeLinks;
                                allLinks = episodeLinks;
                                item.show_id = item.id;
                                item.show_title = item.name || item.title || '';
                                item.season_number = season.season_number;
                                if (!item.backdrop_path && ep.still_path) {
                                    item.backdrop_path = ep.still_path;
                                }
                                break;
                            }
                        }
                        if (allLinks && allLinks.length > 0) break;
                    }
                }

                if (!allLinks || allLinks.length === 0) {
                    this.showSnackbar('notifications.noVideoLinks', 'warning', true);
                    return;
                }
            }

            let candidateLinks = allLinks;
            const showId = 'show_id' in item ? item.show_id : item.id;
            const preferredOrigin = libraryStore.preferredSources.get(showId);

            if (preferredOrigin) {
                const linksFromPreferred = (allLinks || []).filter((l) => {
                    try {
                        return new URL(l.url).origin === preferredOrigin;
                    } catch {
                        return false;
                    }
                });
                if (linksFromPreferred.length > 0) {
                    candidateLinks = linksFromPreferred;
                }
            }

            item.video_urls = candidateLinks;
            let selectedLink;
            if (candidateLinks.length === 1) {
                item.video_url = candidateLinks[0].url;
                selectedLink = candidateLinks[0];
            } else {
                // The modal/flag state lives in `uiStore` and the
                // mediaStore facade only exposes *getters* for those
                // fields. Setting them on `this` would create
                // non-observable own properties on the mediaStore
                // instance and the LinkSelectionModal would never
                // open (its getters would still read the original
                // false/null values from uiStore), which silently
                // breaks the whole "press play" flow. Delegate to
                // `uiStore.openLinkSelectionModal` so the writes
                // reach the right store and the modal actually
                // appears.
                uiStore.openLinkSelectionModal(item, candidateLinks, 'local');
                return;
            }

            if (selectedLink && showId) {
                this.setShowFilterPreference(showId, {
                    language: selectedLink.language,
                    type: selectedLink.type,
                });
            }
        }

        if (item.video_url) {
            runInAction(() => {
                if (this.selectedItem) {
                    this.playbackOriginItem = this.selectedItem;
                    this._closeDetailWithoutHistory();
                } else {
                    this.playbackOriginItem = null;
                }

                // Navigate to player using react-router
                const shouldReplace = window.history.state?.playerOpen;
                navigateTo(Routes.PLAYER, { replace: shouldReplace });

                this.nowPlayingItem = item;

                if ('show_id' in item) {
                    let showDetails = libraryStore.cachedItems.get(item.show_id) || null;
                    if (
                        !showDetails &&
                        this.selectedItem &&
                        'seasons' in this.selectedItem &&
                        this.selectedItem.id === item.show_id
                    ) {
                        showDetails = this.selectedItem;
                    }
                    this.nowPlayingShowDetails = showDetails;
                } else {
                    this.nowPlayingShowDetails = null;
                }
            });
        }
    };

    /**
     * Open a media's detail view. The `context` argument lets the
     * caller route the selection to the right sub-store:
     *  - 'detailView'    : normal detail (default; updates history).
     *  - 'watchTogether' : also load show details so the next-up
     *                       logic in the player can auto-play.
     *  - 'remoteControl' : the master UI for the SmartTV pairing.
     *  - 'cacheOnly'     : refresh the cached entry without opening
     *                       any detail view.
     */
    selectMedia = async (item, context = 'detailView') => {
        if (!item || item.id == null) return;
        if (this.isRemoteMaster && context !== 'remoteControl' && context !== 'cacheOnly') {
            runInAction(() => {
                this._masterUiSelectedItem = item;
                this.isDetailLoading = true;
            });

            this.sendRemoteCommand({command: 'select_item', item: item});

            try {
                let fullItemDetails = libraryStore.cachedItems.get(item.id) || item;
                fullItemDetails = await this._fetchAndCacheMediaDetails(item.id, fullItemDetails);
                runInAction(() => {
                    if (this._masterUiSelectedItem?.id === item.id) {
                        this._masterUiSelectedItem = fullItemDetails;
                    }
                    // ponytail: keep linkingEpisodesForItem in sync (same fix as non-master path).
                    if (uiStore.linkingEpisodesForItem?.id === item.id) {
                        uiStore.linkingEpisodesForItem = fullItemDetails;
                    }
                });
            } catch (error) {
                console.error('Failed to load details for remote master UI', error);
                this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
            } finally {
                runInAction(() => {
                    this.isDetailLoading = false;
                });
            }
            return;
        }

        switch (context) {
            case 'detailView': {
                // Navigate to home (detail view is an overlay on home)
                const shouldReplace = Boolean(this.selectedItem);
                navigateTo(Routes.HOME, { replace: shouldReplace });
                runInAction(() => {
                    this.selectedItem = item;
                    this.isDetailLoading = true;
                });
                break;
            }
            case 'watchTogether':
                runInAction(() => {
                    this.watchTogetherSelectedItem = item;
                    if (this.watchTogetherSelectedItem?.id !== item.id) {
                        this.nowPlayingItem = null;
                    }
                });
                break;
            case 'remoteControl':
                remoteStore.remoteSelectedItem = item;
                remoteStore.isRemoteDetailLoading = true;
                break;
            case 'cacheOnly':
                break;
            default:
                break;
        }

        try {
            let fullItemDetails = libraryStore.cachedItems.get(item.id) || item;
            fullItemDetails = await this._fetchAndCacheMediaDetails(item.id, fullItemDetails);

            try {
                await db.cachedItems.put(JSON.parse(JSON.stringify(fullItemDetails)));
            } catch (e) {
                console.warn('[mediaStore] failed to persist cached item', e);
            }
            runInAction(() => {
                libraryStore.cachedItems.set(item.id, fullItemDetails);
                switch (context) {
                    case 'detailView':
                        if (this.selectedItem?.id === item.id) this.selectedItem = fullItemDetails;
                        // ponytail: keep linkingEpisodesForItem in sync so
                        // LinkEpisodesModal and _patchCurrentItemVideoUrls use
                        // the same object reference (avoids TVMaze/TMDB ID mismatch).
                        if (uiStore.linkingEpisodesForItem?.id === item.id) {
                            uiStore.linkingEpisodesForItem = fullItemDetails;
                        }
                        break;
                    case 'watchTogether':
                        if (this.watchTogetherSelectedItem?.id === item.id) {
                            this.watchTogetherSelectedItem = fullItemDetails;
                        }
                        if (
                            this.roomId &&
                            !this.isHost &&
                            !this.nowPlayingItem &&
                            this.playbackState.status === 'playing'
                        ) {
                            this.startPlayback(fullItemDetails);
                        }
                        break;
                    case 'remoteControl':
                        if (remoteStore.remoteSelectedItem?.id === item.id) {
                            remoteStore.remoteSelectedItem = fullItemDetails;
                        }
                        break;
                    default:
                        break;
                }
            });
        } catch (error) {
            console.error('Failed to load details', error);
            this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
        } finally {
            runInAction(() => {
                if (context === 'detailView') this.isDetailLoading = false;
                if (context === 'remoteControl') remoteStore.isRemoteDetailLoading = false;
            });
        }
    };
    clearLinksForSeason = async (seasonNumber, showId) => {
        // Use linkingEpisodesForItem season (same episode IDs used to save links)
        // instead of cachedItems to avoid TVMaze/TMDB ID mismatch.
        const linkingShow = uiStore.linkingEpisodesForItem?.id === showId
            ? uiStore.linkingEpisodesForItem
            : null;
        const show = linkingShow || this.cachedItems.get(showId);
        if (!show) return;
        const season = show.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(ep => ep.id);
        const linksToDelete = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();
        if (linksToDelete.length > 0) {
            await db.mediaLinks.bulkDelete(linksToDelete.map(l => l.id));
            await this.refreshLinksForShow(showId);
            this.showSnackbar('notifications.allSeasonLinksDeleted', 'success', true, {
                count: linksToDelete.length,
                season: seasonNumber
            });
        } else {
            this.showSnackbar('notifications.noLinksToDelete', 'warning', true, {season: seasonNumber});
        }
    }

    clearLinksForDomain = async (showId, seasonNumber, origin) => {
        // Use linkingEpisodesForItem season (same episode IDs used to save links)
        // instead of cachedItems to avoid TVMaze/TMDB ID mismatch.
        const linkingShow = uiStore.linkingEpisodesForItem?.id === showId
            ? uiStore.linkingEpisodesForItem
            : null;
        const show = linkingShow || this.cachedItems.get(showId);
        if (!show) return;
        const season = show.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(ep => ep.id);
        const allLinks = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();

        const linksToDelete = allLinks.filter(link => {
            try {
                return new URL(link.url).origin === origin;
            } catch {
                return false;
            }
        });

        if (linksToDelete.length > 0) {
            const linkIdsToDelete = linksToDelete.map(l => l.id);
            await db.mediaLinks.bulkDelete(linkIdsToDelete);
            await this.refreshLinksForShow(showId);
            this.showSnackbar('notifications.linksFromDomainDeletedSuccess', 'success', true, {
                count: linksToDelete.length,
                domain: origin
            });
        } else {
            this.showSnackbar('notifications.noLinksToDelete', 'warning', true, {season: seasonNumber});
        }
    }
    /**
     * Hydrate the cached item with seasons, episodes and per-episode
     * links. Mirrors the previous monolithic `mediaStore` behaviour:
     *  - If the cached payload already has full seasons (with episodes)
     *    we only refresh the per-episode links.
     *  - Otherwise we hit the TMDB API for the season list and for
     *    each season's episodes, then merge in any persisted links.
     *  - Movies just get their `video_urls` array populated.
     *  - The result is written to the in-memory `cachedItems` map and
     *    to Dexie so the next reload already has the right data.
     */
    _fetchAndCacheMediaDetails = async (itemId, initialItem) => {
        let fullItemDetails = initialItem;
        const needsApiFetch =
            fullItemDetails.media_type === 'tv' &&
            (!fullItemDetails.seasons ||
                fullItemDetails.seasons.some((s) => !s.episodes || s.episodes.length === 0));

        if (needsApiFetch) {
            const apiDetails = await getSeriesDetails(itemId);
            const seasonsWithEpisodes = await Promise.all(
                (apiDetails.seasons || []).map(async (season) => {
                    const episodes = await getSeriesEpisodes(itemId, season.season_number);
                    const episodesWithLinks = await Promise.all(
                        episodes.map(async (ep) => {
                            const links = await this.getLinksForMedia(ep.id);
                            return {
                                ...ep,
                                video_urls: links,
                                video_url: links[0]?.url,
                            };
                        })
                    );
                    return {...season, episodes: episodesWithLinks};
                })
            );
            fullItemDetails = {...apiDetails, seasons: seasonsWithEpisodes};
        } else if (fullItemDetails.media_type === 'tv' && fullItemDetails.seasons) {
            const seasonsWithFreshLinks = await Promise.all(
                fullItemDetails.seasons.map(async (season) => {
                    const episodesWithLinks = await Promise.all(
                        (season.episodes || []).map(async (ep) => {
                            const links = await this.getLinksForMedia(ep.id);
                            return {
                                ...ep,
                                video_urls: links,
                                video_url: links[0]?.url,
                            };
                        })
                    );
                    return {...season, episodes: episodesWithLinks};
                })
            );
            fullItemDetails = {...fullItemDetails, seasons: seasonsWithFreshLinks};
        } else if (fullItemDetails.media_type === 'movie') {
            const links = await this.getLinksForMedia(itemId);
            fullItemDetails = {
                ...fullItemDetails,
                video_urls: links,
                video_url: links[0]?.url,
            };
        }

        try {
            await db.cachedItems.put(JSON.parse(JSON.stringify(fullItemDetails)));
        } catch (e) {
            console.warn('[mediaStore] failed to persist cached item', e);
        }
        runInAction(() => {
            libraryStore.cachedItems.set(itemId, fullItemDetails);
        });
        return fullItemDetails;
    };

    handleIncomingMessage = (event) => {
        // The websocket already routes the message to the right
        // sub-store (watchTogetherStore, remoteStore, syncStore) by
        // inspecting the message type. The only thing we need to do
        // here is keep the existing public surface intact so nothing
        // crashes if someone wires a custom listener to mediaStore.
        const data = event?.data;
        if (!data) return;
    };
}

export const mediaStore = new MediaStore();
