import {computed, makeAutoObservable, observable, runInAction} from 'mobx';
import Dexie from 'dexie';
import type {
    Episode,
    EpisodeProgress,
    MediaItem,
    MediaLink,
    PlayableItem,
    Revision,
    ViewingHistoryItem
} from '../types.ts';
import {checkLinksForShow, checkLinkValidity, type InvalidLinkInfo} from '../services/linkValidator';
import type {AlertColor} from '@mui/material';
import {
    getLatestMovies,
    getPopularAnime,
    getSeriesDetails,
    getSeriesEpisodes,
    getTopRatedSeries,
    getTrending,
    searchShow
} from '../services/apiCall';
import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';
import {isSmartTV as detectSmartTV} from '../utils/device.ts';
import {it} from '../locales/it.ts';
import {en} from '../locales/en.ts';
import {remoteStore} from './remoteStore';
import {watchTogetherStore} from './watchTogetherStore';
import {syncStore} from './syncStore';

export type ActiveView = 'Home' | 'Serie TV' | 'Film' | 'Anime' | 'La mia lista' | 'Libreria';
export type ThemeName = 'SerieTV' | 'Film' | 'Anime';
export type Language = 'it' | 'en';

const allTranslations = {it, en};

// Types for sharing functionality
type SharedLibraryData = {
    version: number;
    shows: SharedShowData[];
};

type SharedShowData = {
    tmdbId: number;
    links: SharedEpisodeLink[];
};

type SharedEpisodeLink = {
    seasonNumber: number;
    episodeNumber: number;
    url: string;
    label: string;
    language: string;
    type: 'sub' | 'dub';
};

class MediaStore {
    // ===== CORE STATE =====
    trending: MediaItem[] = [];
    latestMovies: MediaItem[] = [];
    topSeries: MediaItem[] = [];
    popularAnime: MediaItem[] = [];
    loading = true;
    error: string | null = null;
    
    @observable selectedItem: MediaItem | null = null;
    private playbackOriginItem: MediaItem | null = null;
    isDetailLoading = false;
    
    myList: number[] = [];
    isPlaying = false;
    nowPlayingItem: PlayableItem | null = null;
    nowPlayingShowDetails: MediaItem | null = null;
    @observable activeView: ActiveView = 'Home';
    viewingHistory: ViewingHistoryItem[] = [];
    cachedItems: Map<number, MediaItem> = new Map();
    episodeProgress: Map<number, EpisodeProgress> = new Map();
    preferredSources: Map<number, string> = new Map();
    preferredLabels: string[] = [];
    selectedSeasons: Map<number, number> = new Map();
    showFilterPreferences: Map<number, { language?: string; type?: 'sub' | 'dub'; }> = new Map();
    
    // Search State
    searchQuery = '';
    searchResults: MediaItem[] = [];
    isSearchActive = false;
    isSearching = false;
    private searchDebounceTimer: number | null = null;
    
    // Links State
    mediaLinks: Map<number, MediaLink[]> = new Map();
    invalidLinkIds: Set<number> = new Set();
    invalidLinksLoading = false;
    
    // Library State
    activeLibraryTab = 0;
    linksFilterShowId: number | null = null;
    showOnlyInvalidLinks = false;
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem: MediaItem | null = null;
    isLinkMovieModalOpen = false;
    linkingMovieItem: MediaItem | null = null;
    isLinkSelectionModalOpen = false;
    itemForLinkSelection: PlayableItem | null = null;
    linksForSelection: MediaLink[] = [];
    linkSelectionContext: 'local' | 'remote' = 'local';
    expandedLinkAccordionId: number | false = false;
    
    // Player Drawers State
    isEpisodesDrawerOpen = false;
    isEpisodeInfoModalOpen = false;
    episodeInfoModalData: {
        episode: Episode;
        seasonNumber: number;
        uniqueLanguages: { lang: string; type: string }[];
    } | null = null;
    
    // Profile & QR State
    isProfileDrawerOpen = false;
    
    // Sharing State
    isShareModalOpen = false;
    isImportModalOpen = false;
    isImportingLibrary = false;
    importUrl: string | null = null;
    
    // Revisions State
    isRevisionsModalOpen = false;
    isRevisionsLoading = false;
    revisions: Revision[] = [];
    private episodeContextMap: Map<number, {
        show: string | undefined;
        s: number;
        e: number;
        epName: string;
    }> = new Map();
    
    // Custom Intro Durations
    showIntroDurations: Map<number, number> = new Map();
    
    // Theme & Translation State
    activeTheme: ThemeName = 'Anime';
    language: Language = 'it';
    
    // Snackbar State
    snackbarMessage: {
        message: string,
        severity: AlertColor,
        action?: { label: string, onClick: () => void },
        isTranslationKey?: boolean,
        translationValues?: Record<string, any>
    } | null = null;
    
    // Notifications State
    notifications: Array<{
        id: string;
        type: 'invalid_links';
        title: string;
        message: string;
        data: InvalidLinkInfo[];
        read: boolean;
        createdAt: number;
    }> = [];
    isNotificationsModalOpen = false;
    
    // Debug Mode State
    isDebugModeActive = false;
    debugMessages: string[] = [];

    // ===== WATCH TOGETHER STATE (delegated from watchTogetherStore) =====
    // These are exposed for components that access watchTogether state through mediaStore
    get watchTogetherModalOpen() { return watchTogetherStore.watchTogetherModalOpen; }
    set watchTogetherModalOpen(v) { watchTogetherStore.watchTogetherModalOpen = v; }
    get roomId() { return watchTogetherStore.roomId; }
    set roomId(v) { watchTogetherStore.roomId = v; }
    get hostId() { return watchTogetherStore.hostId; }
    set hostId(v) { watchTogetherStore.hostId = v; }
    get isHost() { return watchTogetherStore.isHost; }
    set isHost(v) { watchTogetherStore.isHost = v; }
    get participants() { return watchTogetherStore.participants; }
    set participants(v) { watchTogetherStore.participants = v; }
    get username() { return watchTogetherStore.username; }
    set username(v) { watchTogetherStore.username = v; }
    get watchTogetherError() { return watchTogetherStore.watchTogetherError; }
    set watchTogetherError(v) { watchTogetherStore.watchTogetherError = v; }
    get playbackState() { return watchTogetherStore.playbackState; }
    set playbackState(v) { watchTogetherStore.playbackState = v; }
    get chatHistory() { return watchTogetherStore.chatHistory; }
    set chatHistory(v) { watchTogetherStore.chatHistory = v; }
    get joinRoomIdFromUrl() { return watchTogetherStore.joinRoomIdFromUrl; }
    set joinRoomIdFromUrl(v) { watchTogetherStore.joinRoomIdFromUrl = v; }
    get watchTogetherSelectedItem() { return watchTogetherStore.watchTogetherSelectedItem; }
    set watchTogetherSelectedItem(v) { watchTogetherStore.watchTogetherSelectedItem = v; }
    get myClientId() { return watchTogetherStore.myClientId; }
    set myClientId(v) { watchTogetherStore.myClientId = v; }
    // WatchTogether methods delegated
    openWatchTogetherModal = watchTogetherStore.openWatchTogetherModal;
    closeWatchTogetherModal = watchTogetherStore.closeWatchTogetherModal;
    createRoom = watchTogetherStore.createRoom;
    joinRoom = watchTogetherStore.joinRoom;
    changeWatchTogetherMedia = watchTogetherStore.changeWatchTogetherMedia;
    changeRoomCode = watchTogetherStore.changeRoomCode;
    sendPlaybackControl = watchTogetherStore.sendPlaybackControl;
    addPlaybackListener = watchTogetherStore.addPlaybackListener;
    sendChatMessage = watchTogetherStore.sendChatMessage;
    transferHost = watchTogetherStore.transferHost;
    changeName = watchTogetherStore.changeName;

    // ===== SYNC STORE STATE (delegated from syncStore) =====
    // These are exposed for components that access sync state through mediaStore
    get googleUser() { return syncStore.googleUser; }
    set googleUser(v) { syncStore.googleUser = v; }
    get isSyncing() { return syncStore.isSyncing; }
    set isSyncing(v) { syncStore.isSyncing = v; }
    get isReloadingData() { return syncStore.isReloadingData; }
    set isReloadingData(v) { syncStore.isReloadingData = v; }
    get isGoogleAuthLoading() { return syncStore.isGoogleAuthLoading; }
    set isGoogleAuthLoading(v) { syncStore.isGoogleAuthLoading = v; }
    get isSyncConflictModalOpen() { return syncStore.isSyncConflictModalOpen; }
    set isSyncConflictModalOpen(v) { syncStore.isSyncConflictModalOpen = v; }
    get syncConflictData() { return syncStore.syncConflictData; }
    set syncConflictData(v) { syncStore.syncConflictData = v; }
    get isProcessingSyncConflict() { return syncStore.isProcessingSyncConflict; }
    set isProcessingSyncConflict(v) { syncStore.isProcessingSyncConflict = v; }
    // SyncStore methods delegated
    reloadAllData = syncStore.reloadAllData;
    synchronizeWithDrive = syncStore.synchronizeWithDrive;
    closeSyncConflictModal = syncStore.closeSyncConflictModal;
    mergeLocalAndRemote = syncStore.mergeLocalAndRemote;
    overwriteLocalWithRemote = syncStore.overwriteLocalWithRemote;
    overwriteRemoteWithLocal = syncStore.overwriteRemoteWithLocal;
    cancelSyncAndLogout = syncStore.cancelSyncAndLogout;
    backupToDrive = syncStore.backupToDrive;
    restoreFromDrive = syncStore.restoreFromDrive;
    triggerDebouncedBackup = syncStore.triggerDebouncedBackup;
    setGoogleUser = syncStore.setGoogleUser;

    // ===== REMOTE STORE STATE (delegated from remoteStore) =====
    // These are exposed for components that access remote state through mediaStore
    get isRemoteMaster() { return remoteStore.isRemoteMaster; }
    set isRemoteMaster(v) { remoteStore.isRemoteMaster = v; }
    get isRemoteMasterConnected() { return remoteStore.isRemoteMasterConnected; }
    set isRemoteMasterConnected(v) { remoteStore.isRemoteMasterConnected = v; }
    get slaveId() { return remoteStore.slaveId; }
    set slaveId(v) { remoteStore.slaveId = v; }
    get slaveShortCode() { return remoteStore.slaveShortCode; }
    set slaveShortCode(v) { remoteStore.slaveShortCode = v; }
    get hasLoadedInitialData() { return remoteStore.hasLoadedInitialData; }
    set hasLoadedInitialData(v) { remoteStore.hasLoadedInitialData = v; }
    get masterReconnectAttempts() { return remoteStore.masterReconnectAttempts; }
    set masterReconnectAttempts(v) { remoteStore.masterReconnectAttempts = v; }
    get masterReconnectTimer() { return remoteStore.masterReconnectTimer; }
    set masterReconnectTimer(v) { remoteStore.masterReconnectTimer = v; }
    get isReconnecting() { return remoteStore.isReconnecting; }
    set isReconnecting(v) { remoteStore.isReconnecting = v; }
    get remoteSlaveState() { return remoteStore.remoteSlaveState; }
    set remoteSlaveState(v) { remoteStore.remoteSlaveState = v; }
    get remoteSelectedItem() { return remoteStore.remoteSelectedItem; }
    set remoteSelectedItem(v) { remoteStore.remoteSelectedItem = v; }
    get isRemoteDetailLoading() { return remoteStore.isRemoteDetailLoading; }
    set isRemoteDetailLoading(v) { remoteStore.isRemoteDetailLoading = v; }
    get remoteAction() { return remoteStore.remoteAction; }
    set remoteAction(v) { remoteStore.remoteAction = v; }
    get remoteFullItem() { return remoteStore.remoteFullItem; }
    set remoteFullItem(v) { remoteStore.remoteFullItem = v; }
    get isRemoteFullItemLoading() { return remoteStore.isRemoteFullItemLoading; }
    set isRemoteFullItemLoading(v) { remoteStore.isRemoteFullItemLoading = v; }
    get isIntroSkippableOnSlave() { return remoteStore.isIntroSkippableOnSlave; }
    set isIntroSkippableOnSlave(v) { remoteStore.isIntroSkippableOnSlave = v; }
    get shouldAutoFullscreen() { return remoteStore.shouldAutoFullscreen; }
    set shouldAutoFullscreen(v) { remoteStore.shouldAutoFullscreen = v; }
    get knownSlaves() { return remoteStore.knownSlaves; }
    set knownSlaves(v) { remoteStore.knownSlaves = v; }
    get missedPings() { return remoteStore.missedPings; }
    set missedPings(v) { remoteStore.missedPings = v; }
    get connectionHealth() { return remoteStore.connectionHealth; }
    set connectionHealth(v) { remoteStore.connectionHealth = v; }
    get pingInterval() { return remoteStore.pingInterval; }
    set pingInterval(v) { remoteStore.pingInterval = v; }
    get lastPingTime() { return remoteStore.lastPingTime; }
    set lastPingTime(v) { remoteStore.lastPingTime = v; }
    get isMediaSyncModalOpen() { return remoteStore.isMediaSyncModalOpen; }
    set isMediaSyncModalOpen(v) { remoteStore.isMediaSyncModalOpen = v; }
    get mediaSyncTargetSlaveId() { return remoteStore.mediaSyncTargetSlaveId; }
    set mediaSyncTargetSlaveId(v) { remoteStore.mediaSyncTargetSlaveId = v; }
    get _masterUiActiveView() { return remoteStore._masterUiActiveView; }
    set _masterUiActiveView(v) { remoteStore._masterUiActiveView = v; }
    get _masterUiSelectedItem() { return remoteStore._masterUiSelectedItem; }
    set _masterUiSelectedItem(v) { remoteStore._masterUiSelectedItem = v; }
    get isSmartTV() { return remoteStore.isSmartTV; }
    set isSmartTV(v) { remoteStore.isSmartTV = v; }
    get isSmartTVPairingVisible() { return remoteStore.isSmartTVPairingVisible; }
    set isSmartTVPairingVisible(v) { remoteStore.isSmartTVPairingVisible = v; }
    get isQRScannerOpen() { return remoteStore.isQRScannerOpen; }
    set isQRScannerOpen(v) { remoteStore.isQRScannerOpen = v; }
    // RemoteStore methods delegated
    connectAsRemoteMaster = remoteStore.connectAsRemoteMaster;
    disconnectRemoteMaster = remoteStore.disconnectRemoteMaster;
    sendRemoteCommand = remoteStore.sendRemoteCommand;
    stopRemotePlayback = remoteStore.stopRemotePlayback;
    startPingInterval = remoteStore.startPingInterval;
    stopPingInterval = remoteStore.stopPingInterval;
    openMediaSyncModal = remoteStore.openMediaSyncModal;
    closeMediaSyncModal = remoteStore.closeMediaSyncModal;
    handleSlaveDisconnected = remoteStore.handleSlaveDisconnected;
    startMasterReconnectTimer = remoteStore.startMasterReconnectTimer;
    stopMasterReconnectTimer = remoteStore.stopMasterReconnectTimer;
    triggerAutoFullscreen = remoteStore.triggerAutoFullscreen;
    setIntroSkippableOnSlave = remoteStore.setIntroSkippableOnSlave;
    fetchRemoteFullItem = remoteStore.fetchRemoteFullItem;
    playRemoteItem = remoteStore.playRemoteItem;
    syncMediaFromMaster = remoteStore.syncMediaFromMaster;
    openQRScanner = remoteStore.openQRScanner;
    closeQRScanner = remoteStore.closeQRScanner;

    get translations() {
        return allTranslations[this.language];
    }

    constructor() {
        makeAutoObservable(this);
        this.loadInvalidLinksFromDb();
        if (detectSmartTV()) {
            remoteStore.isSmartTV = true;
        }
        websocketService.events.on('message', this.handleIncomingMessage);
        websocketService.events.on('open', this.initRemoteSession);
        websocketService.events.on('debug', this.addDebugMessage);
        websocketService.events.on('slaves-offline', this.handleSlavesOffline);
    }

    handleSlavesOffline = () => {
        remoteStore.handleSlavesOffline();
    };

    loadInvalidLinksFromDb = async () => {
        try {
            const invalidLinks = await db.mediaLinks.filter(link => link.isValid === false || link.isValid === undefined).toArray();
            const invalidIds = new Set();
            invalidLinks.forEach(link => {
                if (link.id) invalidIds.add(link.id);
            });
            runInAction(() => {
                this.invalidLinkIds = invalidIds;
            });
        } catch (error) {
            console.error('Error loading invalid links from DB:', error);
        }
    };

    @computed get currentActiveView(): ActiveView {
        return this.isRemoteMaster ? this._masterUiActiveView : this.activeView;
    }

    @computed get currentSelectedItem(): MediaItem | null {
        return this.isRemoteMaster ? this._masterUiSelectedItem : this.selectedItem;
    }

    // ===== CORE PLAYBACK METHODS =====

    startPlayback = async (item: PlayableItem) => {
        if (this.isRemoteMaster) {
            this.playRemoteItem(item);
            return;
        }

        if (!item.video_url) {
            const mediaId = item.id;
            let allLinks: MediaLink[] = item.video_urls || await this.getLinksForMedia(mediaId);
            item.video_urls = allLinks;

            if (allLinks.length === 0) {
                if ('seasons' in item && item.seasons) {
                    for (const season of item.seasons) {
                        if (season.episodes) {
                            for (const ep of season.episodes) {
                                const episodeLinks = await this.getLinksForMedia(ep.id);
                                if (episodeLinks.length > 0) {
                                    (item as any).video_urls = episodeLinks;
                                    allLinks = episodeLinks;
                                    (item as any).show_id = item.id;
                                    (item as any).show_title = item.name || item.title || '';
                                    (item as any).season_number = season.season_number;
                                    if (!(item as any).backdrop_path && ep.still_path) {
                                        (item as any).backdrop_path = ep.still_path;
                                    }
                                    break;
                                }
                            }
                        }
                        if (allLinks.length > 0) break;
                    }
                }

                if (allLinks.length === 0) {
                    this.showSnackbar("notifications.noVideoLinks", "warning", true);
                    return;
                }
            }

            let candidateLinks: MediaLink[] = allLinks;
            const showId = 'show_id' in item ? item.show_id : item.id;
            const preferredOrigin = this.preferredSources.get(showId);

            if (preferredOrigin) {
                const linksFromPreferred = allLinks.filter(l => {
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
            let selectedLink: MediaLink | undefined;

            if (candidateLinks.length === 1) {
                item.video_url = candidateLinks[0].url;
                selectedLink = candidateLinks[0];
            } else {
                this.linksForSelection = candidateLinks;
                this.itemForLinkSelection = item;
                this.linkSelectionContext = 'local';
                this.isLinkSelectionModalOpen = true;
                return;
            }

            if (selectedLink && showId) {
                this.setShowFilterPreference(showId, {
                    language: selectedLink.language,
                    type: selectedLink.type as 'sub' | 'dub'
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

                if (window.history.state?.playerOpen) {
                    window.history.replaceState({playerOpen: true, itemId: item.id}, '', window.location.href);
                } else {
                    window.history.pushState({playerOpen: true, itemId: item.id}, '', window.location.href);
                }

                this.nowPlayingItem = item;

                if ('show_id' in item) {
                    let showDetails = this.cachedItems.get(item.show_id) || null;
                    if (!showDetails && this.selectedItem && 'seasons' in this.selectedItem && this.selectedItem.id === item.show_id) {
                        showDetails = this.selectedItem;
                    }
                    this.nowPlayingShowDetails = showDetails;
                } else {
                    this.nowPlayingShowDetails = null;
                }
            });
        }
    }

    _stopPlaybackWithoutHistory = () => {
        if (this.playbackOriginItem) {
            this.selectedItem = this.playbackOriginItem;
            this.playbackOriginItem = null;
        }
        this.nowPlayingItem = null;
        this.nowPlayingShowDetails = null;
        this.isPlaying = false;
    }

    stopPlayback = () => {
        if (window.history.state?.playerOpen) {
            window.history.back();
        } else {
            this._stopPlaybackWithoutHistory();
        }
    }

    // ===== UI STATE METHODS =====

    showSnackbar = (message: string, severity: AlertColor = 'info', isTranslationKey = false, translationValues?: Record<string, any>) => {
        this.snackbarMessage = {message, severity, isTranslationKey, translationValues};
    }

    hideSnackbar = () => {
        this.snackbarMessage = null;
    };

    addNotification = (notification: Omit<typeof this.notifications[0], 'id' | 'read' | 'createdAt'>) => {
        const newNotification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            read: false,
            createdAt: Date.now(),
        };
        this.notifications.unshift(newNotification);
    };

    markNotificationRead = (id: string) => {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
        }
    };

    markAllNotificationsRead = () => {
        this.notifications.forEach(n => n.read = true);
    };

    clearNotifications = () => {
        this.notifications = [];
    };

    dismissNotification = (id: string) => {
        this.notifications = this.notifications.filter(n => n.id !== id);
    };

    openNotificationsModal = () => {
        this.isNotificationsModalOpen = true;
    };

    closeNotificationsModal = () => {
        this.isNotificationsModalOpen = false;
    };

    get unreadNotificationsCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    checkAndNotifyInvalidLinks = async (item: MediaItem) => {
        try {
            const invalidLinks = await checkLinksForShow(item, this.mediaLinks);
            
            if (invalidLinks.length > 0) {
                const showName = item.title || item.name || 'Unknown';
                this.addNotification({
                    type: 'invalid_links',
                    title: 'notifications.invalidLinks',
                    message: `notifications.invalidLinksDesc`,
                    data: invalidLinks,
                });
            }
        } catch (error) {
            console.error('Error checking links:', error);
        }
    };

    _closeDetailWithoutHistory = () => {
        this.selectedItem = null;
    };

    closeDetail = () => {
        this._closeDetailWithoutHistory();
        if (window.history.state?.detailViewOpen) {
            window.history.back();
        }
    };

    setActiveView = (view: ActiveView) => {
        if (this.isRemoteMaster) {
            this._masterUiActiveView = view;
        } else {
            this.activeView = view;
        }

        if (view === 'Serie TV') this.setActiveTheme('SerieTV');
        else if (view === 'Film') this.setActiveTheme('Film');
        else if (view === 'Anime') this.setActiveTheme('Anime');
        else if (view === 'Libreria') this.setActiveTheme('Anime');
    };

    setActiveTheme = (theme: ThemeName) => {
        this.activeTheme = theme;
        db.preferences.put({key: 'activeTheme', value: theme});
    };

    setLanguage = (lang: Language) => {
        this.language = lang;
        db.preferences.put({key: 'language', value: lang});
    };

    toggleSearch = (isActive: boolean) => {
        this.isSearchActive = isActive;
        if (!isActive) {
            this.searchQuery = '';
            this.searchResults = [];
        }
    };

    setSearchQuery = (query: string) => {
        this.searchQuery = query;
        if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = window.setTimeout(async () => {
            if (this.searchQuery.trim()) {
                runInAction(() => {
                    this.isSearching = true;
                });
                const results = await searchShow(this.searchQuery);
                runInAction(() => {
                    this.searchResults = results;
                    this.isSearching = false;
                });
            } else {
                runInAction(() => {
                    this.searchResults = [];
                });
            }
        }, 300);
    };

    // Profile & QR Methods
    toggleProfileDrawer = (isOpen: boolean) => {
        this.isProfileDrawerOpen = isOpen;
    };

    enableSmartTVMode = () => {
        remoteStore.isSmartTV = true;
        remoteStore.isSmartTVPairingVisible = true;
        this.isProfileDrawerOpen = false;
        db.preferences.put({key: 'isConfiguredAsSlave', value: true});
        const payload: { slaveId?: string; shortCode?: string } = {};
        if (this.slaveId) payload.slaveId = this.slaveId;
        if (this.slaveShortCode) payload.shortCode = this.slaveShortCode;
        websocketService.registerSlave(payload);
    };

    exitSmartTVPairingMode = () => {
        remoteStore.isSmartTVPairingVisible = false;
        remoteStore.isSmartTV = false;
        db.preferences.delete('isConfiguredAsSlave');
    };

    // Modal Methods
    openShareModal = () => {
        this.isShareModalOpen = true;
    };

    closeShareModal = () => {
        this.isShareModalOpen = false;
    };

    openImportModal = () => {
        this.isImportModalOpen = true;
    };

    closeImportModal = () => {
        this.isImportModalOpen = false;
        if (this.importUrl) this.importUrl = null;
    };

    openRevisionsModal = () => {
        this.isRevisionsModalOpen = true;
        this.fetchRevisions();
    };

    closeRevisionsModal = () => {
        this.isRevisionsModalOpen = false;
    };

    closeLinkSelectionModal = () => {
        this.isLinkSelectionModalOpen = false;
        this.itemForLinkSelection = null;
        this.linkSelectionContext = 'local';
    };

    openEpisodesDrawer = () => {
        this.isEpisodesDrawerOpen = true;
    };

    closeEpisodesDrawer = () => {
        this.isEpisodesDrawerOpen = false;
    };

    openEpisodeInfoModal = (episode: Episode, seasonNumber: number, uniqueLanguages: { lang: string; type: string }[]) => {
        this.episodeInfoModalData = {episode, seasonNumber, uniqueLanguages};
        this.isEpisodeInfoModalOpen = true;
    };

    closeEpisodeInfoModal = () => {
        this.isEpisodeInfoModalOpen = false;
        this.episodeInfoModalData = null;
    };

    setExpandedLinkAccordionId = (id: number | false) => {
        this.expandedLinkAccordionId = id;
    };

    clearRemoteSelectedItem = () => {
        this._masterUiSelectedItem = null;
        this.isDetailLoading = false;
        this.sendRemoteCommand({command: 'clear_selection'});
    };

    clearMasterUiSelection = () => {
        this._masterUiSelectedItem = null;
        this.isDetailLoading = false;
    };

    setJoinRoomIdFromUrl = (roomId: string | null) => {
        watchTogetherStore.joinRoomIdFromUrl = roomId;
    };

    setImportUrl = (url: string | null) => {
        this.importUrl = url;
    };

    // ===== COMPUTED GETTERS =====

    get isLoggedIn() {
        return !!this.googleUser;
    }

    get allUniqueLabels(): string[] {
        const labels = new Set<string>();
        for (const links of this.mediaLinks.values()) {
            for (const link of links) {
                if (link.label) {
                    labels.add(link.label);
                }
            }
        }
        return Array.from(labels).sort();
    }

    get heroContent() {
        switch (this.activeTheme) {
            case 'Film':
                return this.latestMovies.length > 0 ? this.latestMovies[0] : this.trending[0];
            case 'Anime':
                return this.popularAnime.length > 0 ? this.popularAnime[0] : this.trending[0];
            case 'SerieTV':
            default:
                return this.topSeries.length > 0 ? this.topSeries[0] : this.trending[0];
        }
    }

    get allMovies() {
        return [...this.latestMovies].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    }

    get currentShow() {
        return this.nowPlayingShowDetails;
    }

    get currentSeasonEpisodes() {
        if (!this.nowPlayingItem || !('season_number' in this.nowPlayingItem) || !this.nowPlayingShowDetails?.seasons) return [];
        const season = this.nowPlayingShowDetails.seasons.find(s => s.season_number === (this.nowPlayingItem as any).season_number);
        return season?.episodes || [];
    }

    get nextEpisode() {
        if (!this.nowPlayingItem || !('episode_number' in this.nowPlayingItem)) return null;
        const currentEpisodeIndex = this.currentSeasonEpisodes.findIndex(ep => ep.id === this.nowPlayingItem.id);
        if (currentEpisodeIndex > -1 && currentEpisodeIndex < this.currentSeasonEpisodes.length - 1) {
            return this.currentSeasonEpisodes[currentEpisodeIndex + 1];
        }
        return null;
    }

    get remoteNextEpisode() {
        const nowPlaying = this.remoteSlaveState?.nowPlayingItem;
        if (!nowPlaying || !('episode_number' in nowPlaying) || !this.remoteFullItem?.seasons) return null;

        const season = this.remoteFullItem.seasons.find(s => s.season_number === nowPlaying.season_number);
        if (!season?.episodes) return null;

        const currentEpisodeIndex = season.episodes.findIndex(ep => ep.id === nowPlaying.id);
        if (currentEpisodeIndex > -1 && currentEpisodeIndex < season.episodes.length - 1) {
            return season.episodes[currentEpisodeIndex + 1];
        }
        return null;
    }

    get remotePreviousEpisode() {
        const nowPlaying = this.remoteSlaveState?.nowPlayingItem;
        if (!nowPlaying || !('episode_number' in nowPlaying) || !this.remoteFullItem?.seasons) return null;

        const season = this.remoteFullItem.seasons.find(s => s.season_number === nowPlaying.season_number);
        if (!season?.episodes) return null;

        const currentEpisodeIndex = season.episodes.findIndex(ep => ep.id === nowPlaying.id);
        if (currentEpisodeIndex > 0) {
            return season.episodes[currentEpisodeIndex - 1];
        }
        return null;
    }

    get myListItems() {
        return this.myList.map(id => this.cachedItems.get(id)).filter((item): item is MediaItem => !!item);
    }

    get continueWatchingItems(): PlayableItem[] {
        const sortedProgress = Array.from(this.episodeProgress.values())
            .filter(p => !p.watched && p.currentTime > 0)
            .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0));

        const episodesWithProgress = sortedProgress.map(p => {
            const ep = this.findEpisodeById(p.episodeId);
            if (!ep) return null;
            return {...ep, startTime: p.currentTime, progress: p};
        }).filter(item => !!item) as (PlayableItem & { progress: EpisodeProgress })[];

        const showMap = new Map<number, PlayableItem & { progress: EpisodeProgress }>();

        for (const item of episodesWithProgress) {
            const showId = (item as any).show_id;
            const existing = showMap.get(showId);
            if (!existing || ((item as any).episode_number && (existing as any).episode_number && (item as any).episode_number > (existing as any).episode_number)) {
                showMap.set(showId, item);
            }
        }

        return Array.from(showMap.values());
    }

    get homePageRows() {
        const rows = [
            ...(this.continueWatchingItems.length > 0 ? [{
                titleKey: 'misc.continueWatching',
                items: this.continueWatchingItems as MediaItem[]
            }] : []),
            ...(this.myListItems.length > 0 ? [{titleKey: 'misc.myList', items: this.myListItems}] : []),
        ];

        switch (this.activeTheme) {
            case 'Film':
                rows.push({titleKey: 'misc.latestReleases', items: this.latestMovies});
                rows.push({titleKey: 'misc.topRated', items: this.trending});
                rows.push({titleKey: 'misc.popularSeries', items: this.topSeries});
                rows.push({titleKey: 'misc.mustWatchAnime', items: this.popularAnime});
                break;
            case 'Anime':
                rows.push({titleKey: 'misc.mustWatchAnime', items: this.popularAnime});
                rows.push({titleKey: 'misc.topRated', items: this.trending});
                rows.push({titleKey: 'misc.popularSeries', items: this.topSeries});
                rows.push({titleKey: 'misc.latestReleases', items: this.latestMovies});
                break;
            case 'SerieTV':
            default:
                rows.push({titleKey: 'misc.popularSeries', items: this.topSeries});
                rows.push({titleKey: 'misc.topRated', items: this.trending});
                rows.push({titleKey: 'misc.latestReleases', items: this.latestMovies});
                rows.push({titleKey: 'misc.mustWatchAnime', items: this.popularAnime});
                break;
        }

        return rows;
    }

    get shareableShows() {
        return Array.from(this.cachedItems.values()).filter(item => item.media_type === 'tv' && this.hasLinks(item.id));
    }

    get showsWithLinks() {
        const showIds = new Set<number>();
        for (const [mediaId] of this.mediaLinks.entries()) {
            for (const show of this.cachedItems.values()) {
                if (show.seasons) {
                    for (const season of show.seasons) {
                        if (season.episodes.some(e => e.id === mediaId)) {
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
        return Array.from(showIds).map(id => this.cachedItems.get(id)).filter((item): item is MediaItem => !!item);
    }

    // ===== DATA FETCHING =====

    fetchAllData = async () => {
        this.loading = true;
        try {
            const [trending, latestMovies, topSeries, popularAnime] = await Promise.all([
                getTrending(),
                getLatestMovies(),
                getTopRatedSeries(),
                getPopularAnime(),
            ]);
            runInAction(() => {
                this.trending = trending;
                this.latestMovies = latestMovies;
                this.topSeries = topSeries;
                this.popularAnime = popularAnime;
                [...trending, ...latestMovies, ...topSeries, ...popularAnime].forEach(item => {
                    if (!this.cachedItems.has(item.id)) {
                        this.cachedItems.set(item.id, item);
                        db.cachedItems.put(item).catch(console.error);
                    }
                });
                this.loading = false;
            });
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            runInAction(() => {
                this.error = 'Failed to load content.';
                this.loading = false;
            });
        }
    }

    loadPersistedData = async () => {
        const [
            myListItems, cachedItems, mediaLinksData, introDurations, languagePref, 
            progress, preferredSourcesData, usernamePref, activeThemePref, 
            selectedSeasonsData, preferredLabelsPref, showFilterPreferencesData,
            remoteMasterSlaveId, isConfiguredAsSlave, knownSlaves, selfSlaveId, selfShortCode
        ] = await Promise.all([
            db.myList.orderBy('order').toArray(),
            db.cachedItems.toArray(),
            db.mediaLinks.toArray(),
            db.showIntroDurations.toArray(),
            db.preferences.get('language'),
            db.episodeProgress.toArray(),
            db.preferredSources.toArray(),
            db.preferences.get('username'),
            db.preferences.get('activeTheme'),
            db.selectedSeasons.toArray(),
            db.preferences.get('preferredLabels'),
            db.showFilterPreferences.toArray(),
            db.preferences.get('remoteMasterForSlaveId'),
            db.preferences.get('isConfiguredAsSlave'),
            db.knownSlaves.orderBy('lastSeen').reverse().toArray(),
            db.preferences.get('selfSlaveId'),
            db.preferences.get('selfShortCode'),
        ]);

        runInAction(() => {
            this.myList = myListItems.map(item => item.id);
            this.cachedItems = new Map(cachedItems.map(item => [item.id, item]));

            const linksMap = new Map<number, MediaLink[]>();
            mediaLinksData.forEach(link => {
                const links = linksMap.get(link.mediaId) || [];
                links.push(link);
                linksMap.set(link.mediaId, links);
            });
            this.mediaLinks = linksMap;

            this.showIntroDurations = new Map(introDurations.map(item => [item.id, item.duration]));
            if (languagePref?.value) this.language = languagePref.value;
            if (activeThemePref?.value) this.activeTheme = activeThemePref.value;
            this.episodeProgress = new Map(progress.map(p => [p.episodeId, p]));
            this.preferredSources = new Map(preferredSourcesData.map(p => [p.showId, p.origin]));
            this.selectedSeasons = new Map(selectedSeasonsData.map(s => [s.showId, s.seasonNumber]));
            if (preferredLabelsPref?.value) this.preferredLabels = preferredLabelsPref.value;
            if (usernamePref?.value) this.username = usernamePref.value;
            this.showFilterPreferences = new Map(showFilterPreferencesData.map(p => [p.showId, {
                language: p.language,
                type: p.type
            }]));

            if (remoteMasterSlaveId?.value) {
                this.isRemoteMaster = true;
                this.slaveId = remoteMasterSlaveId.value;
                this.showSnackbar('notifications.reconnectingAsRemote', 'info', true);
            }

            if (isConfiguredAsSlave?.value) {
                this.isSmartTV = true;
                this.isSmartTVPairingVisible = true;
                if (selfSlaveId?.value) {
                    this.slaveId = selfSlaveId.value;
                }
                if (selfShortCode?.value) {
                    this.slaveShortCode = selfShortCode.value;
                }
            }
            this.knownSlaves = knownSlaves;

            this.hasLoadedInitialData = true;
            console.log(`[mediaStore] fetchAllData: initial data loaded, hasLoadedInitialData=true, isSmartTV=${this.isSmartTV}, isRemoteMaster=${this.isRemoteMaster}, slaveId=${this.slaveId}`);

            if (this.isSmartTV && this.slaveId) {
                this.initRemoteSession();
            } else if (this.isRemoteMaster && this.slaveId) {
                this.initRemoteSession();
            }
        });
    }

    // ===== MEDIA SELECTION =====

    selectMedia = async (item: MediaItem, context: 'detailView' | 'watchTogether' | 'remoteControl' | 'cacheOnly' = 'detailView') => {
        if (this.isRemoteMaster && context !== 'remoteControl' && context !== 'cacheOnly') {
            runInAction(() => {
                this._masterUiSelectedItem = item;
                this.isDetailLoading = true;
            });

            this.sendRemoteCommand({command: 'select_item', item: item});

            try {
                let fullItemDetails: MediaItem = this.cachedItems.get(item.id) || item;
                fullItemDetails = await this._fetchAndCacheMediaDetails(item.id, fullItemDetails);
                runInAction(() => {
                    if (this._masterUiSelectedItem?.id === item.id) {
                        this._masterUiSelectedItem = fullItemDetails;
                    }
                });
            } catch (error) {
                console.error("Failed to load details for remote master UI", error);
                this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
            } finally {
                runInAction(() => {
                    this.isDetailLoading = false;
                });
            }
            return;
        }

        switch (context) {
            case 'detailView':
                if (this.selectedItem) {
                    window.history.replaceState({detailViewOpen: true, itemId: item.id}, '', window.location.href);
                } else {
                    window.history.pushState({detailViewOpen: true, itemId: item.id}, '', window.location.href);
                }
                this.selectedItem = item;
                this.isDetailLoading = true;
                break;
            case 'watchTogether':
                this.watchTogetherSelectedItem = item;
                if (this.watchTogetherSelectedItem?.id !== item.id) {
                    this.nowPlayingItem = null;
                }
                break;
            case 'remoteControl':
                remoteStore.remoteSelectedItem = item;
                remoteStore.isRemoteDetailLoading = true;
                break;
            case 'cacheOnly':
                break;
        }

        try {
            let fullItemDetails: MediaItem = this.cachedItems.get(item.id) || item;
            fullItemDetails = await this._fetchAndCacheMediaDetails(item.id, fullItemDetails);

            await db.cachedItems.put(JSON.parse(JSON.stringify(fullItemDetails)));
            runInAction(() => {
                this.cachedItems.set(item.id, fullItemDetails!);
                switch (context) {
                    case 'detailView':
                        if (this.selectedItem?.id === item.id) this.selectedItem = fullItemDetails;
                        break;
                    case 'watchTogether':
                        if (this.watchTogetherSelectedItem?.id === item.id) this.watchTogetherSelectedItem = fullItemDetails;
                        if (this.roomId && !this.isHost && !this.nowPlayingItem && this.playbackState.status === 'playing') {
                            this.startPlayback(fullItemDetails!);
                        }
                        break;
                    case 'remoteControl':
                        if (remoteStore.remoteSelectedItem?.id === item.id) remoteStore.remoteSelectedItem = fullItemDetails;
                        break;
                }
            });

        } catch (error) {
            console.error("Failed to load details", error);
            this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
        } finally {
            runInAction(() => {
                if (context === 'detailView') this.isDetailLoading = false;
                if (context === 'remoteControl') remoteStore.isRemoteDetailLoading = false;
            });
        }
    }

    // ===== MY LIST METHODS =====

    toggleMyList = (item: MediaItem) => {
        const itemId = item.id;
        if (this.myList.includes(itemId)) {
            this.myList = this.myList.filter(id => id !== itemId);
            db.myList.delete(itemId);
        } else {
            this.myList.push(itemId);
            db.myList.put({id: itemId, order: this.myList.length});
            if (!this.cachedItems.has(itemId)) {
                this.cachedItems.set(itemId, item);
                db.cachedItems.put(item);
            }
        }
    }

    reorderMyList = async (dragIndex: number, dropIndex: number) => {
        const reorderedList = [...this.myList];
        const [draggedItem] = reorderedList.splice(dragIndex, 1);
        reorderedList.splice(dropIndex, 0, draggedItem);

        runInAction(() => {
            this.myList = reorderedList;
        });

        const itemsToUpdate = this.myList.map((id, index) => ({id, order: index}));
        await db.myList.bulkPut(itemsToUpdate);
    }

    setMyListOrder = async (orderedIds: number[]) => {
        runInAction(() => {
            this.myList = orderedIds;
        });

        const itemsToUpdate = orderedIds.map((id, index) => ({id, order: index}));
        await db.myList.bulkPut(itemsToUpdate);
    }

    // ===== PROGRESS METHODS =====

    removeFromContinueWatching = async (episodeId: number) => {
        try {
            await db.episodeProgress.delete(episodeId);
            runInAction(() => {
                this.episodeProgress.delete(episodeId);
                this.showSnackbar('notifications.removedFromContinueWatching', 'success', true);
            });
        } catch (error) {
            console.error('Failed to remove from continue watching list:', error);
            this.showSnackbar('notifications.removeFromContinueWatchingError', 'error', true);
        }
    }

    updateEpisodeProgress = (progress: { episodeId: number; currentTime: number; duration: number; }) => {
        const {episodeId, currentTime, duration} = progress;
        if (duration > 0) {
            const watched = currentTime / duration > 0.9;
            const existing = this.episodeProgress.get(episodeId);
            if (!existing || existing.currentTime < currentTime || watched !== existing.watched) {
                const newProgress = {episodeId, currentTime, duration, watched, lastWatchedAt: Date.now()};
                this.episodeProgress.set(episodeId, newProgress);
                db.episodeProgress.put(newProgress);
            }
        }
    }

    toggleEpisodeWatchedStatus = async (episodeId: number) => {
        const existingProgress = this.episodeProgress.get(episodeId);

        if (existingProgress?.watched) {
            const newProgress: EpisodeProgress = {
                episodeId,
                duration: existingProgress.duration,
                currentTime: 0,
                watched: false,
            };
            this.episodeProgress.set(episodeId, newProgress);
            await db.episodeProgress.put(newProgress);
            this.showSnackbar('notifications.markedAsUnwatched', 'info', true);
        } else {
            const newProgress: EpisodeProgress = {
                episodeId,
                duration: existingProgress?.duration || 1,
                currentTime: existingProgress?.duration || 1,
                watched: true,
            };
            this.episodeProgress.set(episodeId, newProgress);
            await db.episodeProgress.put(newProgress);
            this.showSnackbar('notifications.markedAsWatched', 'success', true);
        }
    }

    // ===== PREFERENCES METHODS =====

    setShowIntroDuration = (showId: number, duration: number) => {
        this.showIntroDurations.set(showId, duration);
        db.showIntroDurations.put({id: showId, duration});
    }

    setSelectedSeasonForShow = (showId: number, seasonNumber: number) => {
        this.selectedSeasons.set(showId, seasonNumber);
        db.selectedSeasons.put({showId, seasonNumber});
    }

    setShowFilterPreference = (showId: number, preference: { language?: string; type?: 'sub' | 'dub'; }) => {
        const currentPrefs = this.showFilterPreferences.get(showId) || {};
        const newPrefs = {...currentPrefs, ...preference};
        this.showFilterPreferences.set(showId, newPrefs);
        db.showFilterPreferences.put({showId, ...newPrefs});
    }

    togglePreferredLabel = async (label: string) => {
        const isPreferred = this.preferredLabels.includes(label);
        if (isPreferred) {
            this.preferredLabels = this.preferredLabels.filter(l => l !== label);
        } else {
            this.preferredLabels.push(label);
        }
        await db.preferences.put({key: 'preferredLabels', value: this.preferredLabels});
        this.showSnackbar(isPreferred ? 'notifications.preferredLabelRemoved' : 'notifications.preferredLabelSet', 'success', true, {label});
    }

    setPreferredSource = async (showId: number, origin: string) => {
        const current = this.preferredSources.get(showId);
        if (current === origin) {
            this.preferredSources.delete(showId);
            await db.preferredSources.delete(showId);
        } else {
            this.preferredSources.set(showId, origin);
            await db.preferredSources.put({showId, origin});
            this.showSnackbar('notifications.preferredSourceSet', 'success', true);
        }
    }

    // ===== LINK MANAGEMENT METHODS =====

    openLinkEpisodesModal = (item: MediaItem) => {
        this.linkingEpisodesForItem = item;
        this.isLinkEpisodesModalOpen = true;
    };

    closeLinkEpisodesModal = () => {
        this.isLinkEpisodesModalOpen = false;
        this.linkingEpisodesForItem = null;
    };

    openLinkMovieModal = (item: MediaItem) => {
        this.linkingMovieItem = item;
        this.isLinkMovieModalOpen = true;
    };

    closeLinkMovieModal = () => {
        this.isLinkMovieModalOpen = false;
        this.linkingMovieItem = null;
    };

    setEpisodeLinksForSeason = async (payload: {
        seasonNumber: number;
        method: string;
        data: any;
        language: string;
        type: 'sub' | 'dub';
        seasonName: string;
    }): Promise<boolean> => {
        const {seasonNumber, method, data, language, type, seasonName} = payload;
        const show = this.linkingEpisodesForItem;
        if (!show) return false;

        const season = show.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return false;

        let linksToAdd: Omit<MediaLink, 'id'>[] = [];
        try {
            switch (method) {
                case 'pattern': {
                    const startEpisode = data.start || 1;
                    const endEpisode = data.end || season.episode_count;
                    const safeEndEpisode = Math.min(endEpisode, season.episode_count);
                    let currentNumber = data.startNum ?? startEpisode;

                    for (let i = startEpisode; i <= safeEndEpisode; i++) {
                        const epNum = String(currentNumber).padStart(data.padding, '0');
                        const ep = season.episodes.find(e => e.episode_number === i);
                        if (ep) {
                            linksToAdd.push({
                                mediaId: ep.id,
                                url: data.pattern.replace(/\[@EP\]/g, epNum),
                                label: data.label.replace(/\[@EP\]/g, epNum) || seasonName,
                                language,
                                type,
                            });
                            currentNumber++;
                        }
                    }
                    break;
                }
                case 'list': {
                    const urls = data.list.split('\n').filter((u: string) => u.trim());
                    if (urls.length !== season.episode_count) {
                        this.showSnackbar('notifications.linkCountMismatch', 'error', true, {
                            linkCount: urls.length,
                            episodeCount: season.episode_count
                        });
                        return false;
                    }
                    season.episodes.forEach((ep, index) => {
                        linksToAdd.push({
                            mediaId: ep.id,
                            url: urls[index],
                            label: new URL(urls[index]).hostname,
                            language,
                            type
                        });
                    });
                    break;
                }
                case 'json': {
                    const parsedJson = JSON.parse(data.json);
                    if (!Array.isArray(parsedJson)) throw new Error('JSON must be an array.');
                    if (parsedJson.length !== season.episode_count) {
                        this.showSnackbar('notifications.linkCountMismatch', 'error', true, {
                            linkCount: parsedJson.length,
                            episodeCount: season.episode_count
                        });
                        return false;
                    }
                    season.episodes.forEach((ep, index) => {
                        const item = parsedJson[index];
                        if (typeof item === 'string') {
                            linksToAdd.push({mediaId: ep.id, url: item, label: new URL(item).hostname, language, type});
                        } else if (typeof item === 'object' && item.url) {
                            linksToAdd.push({
                                mediaId: ep.id,
                                url: item.url,
                                label: item.label || new URL(item.url).hostname,
                                language: item.language || language,
                                type: item.type || type
                            });
                        }
                    });
                    break;
                }
            }

            if (linksToAdd.length > 0 && !this.preferredSources.has(show.id)) {
                try {
                    const firstUrl = new URL(linksToAdd[0].url);
                    await this.setPreferredSource(show.id, firstUrl.origin);
                } catch (e) {
                    console.warn("Could not determine origin from the first link to set as preferred source", e);
                }
            }

            await db.mediaLinks.bulkAdd(linksToAdd as MediaLink[]);
            await this.refreshLinksForShow(show.id);
            this.showSnackbar('notifications.linksAddedSuccess', 'success', true, {count: linksToAdd.length});
            return true;

        } catch (error) {
            console.error(error);
            this.showSnackbar('notifications.processingError', 'error', true, {error: (error as Error).message});
            return false;
        }
    }

    addLinksToMedia = async (mediaId: number, links: {
        url: string,
        label: string,
        language: string,
        type: 'sub' | 'dub'
    }[]) => {
        try {
            const linksToAdd: Omit<MediaLink, 'id'>[] = links.map(link => ({
                mediaId,
                url: link.url,
                label: link.label || new URL(link.url).hostname,
                language: link.language,
                type: link.type,
                isValid: true,
            }));

            if (linksToAdd.length > 0 && !this.preferredSources.has(mediaId)) {
                try {
                    const firstUrl = new URL(linksToAdd[0].url);
                    await this.setPreferredSource(mediaId, firstUrl.origin);
                } catch (e) {
                    console.warn("Could not determine origin from the first link to set as preferred source", e);
                }
            }

            await db.mediaLinks.bulkAdd(linksToAdd as MediaLink[]);
            await this.refreshLinksForMediaId(mediaId);
        } catch (error) {
            console.error('Error saving links:', error);
            this.showSnackbar('notifications.savingLinksError', 'error', true);
        }
    }

    deleteMediaLink = async (linkId: number) => {
        const mediaId = await (db as Dexie).transaction('rw', db.mediaLinks, async () => {
            const link = await db.mediaLinks.get(linkId);
            if (link) {
                await db.mediaLinks.delete(linkId);
                return link.mediaId;
            }
            return null;
        });

        if (mediaId) {
            await this.refreshLinksForMediaId(mediaId);
        }
    }

    validateAllLinks = async () => {
        this.invalidLinksLoading = true;
        const newInvalidIds = new Set<number>();
        const linksToUpdate: {id: number; isValid: boolean}[] = [];
        
        try {
            for (const [, links] of this.mediaLinks.entries()) {
                for (const link of links) {
                    if (link.id) {
                        const isValid = await checkLinkValidity(link.url);
                        linksToUpdate.push({ id: link.id, isValid });
                        if (!isValid) {
                            newInvalidIds.add(link.id);
                        }
                    }
                }
            }
            
            if (linksToUpdate.length > 0) {
                await (db as Dexie).transaction('rw', db.mediaLinks, async () => {
                    for (const linkUpdate of linksToUpdate) {
                        await db.mediaLinks.update(linkUpdate.id, { isValid: linkUpdate.isValid });
                    }
                });
            }
            
            runInAction(() => {
                this.invalidLinkIds = newInvalidIds;
                this.invalidLinksLoading = false;
            });
        } catch (error) {
            console.error('Error validating links:', error);
            runInAction(() => {
                this.invalidLinksLoading = false;
            });
        }
    }

    deleteAllInvalidLinks = async () => {
        const invalidIds = Array.from(this.invalidLinkIds);
        let deletedCount = 0;
        let errorCount = 0;
        const total = invalidIds.length;
        
        if (total === 0) {
            this.showSnackbar('notifications.noInvalidLinks', 'info', true);
            return;
        }
        
        this.showSnackbar(`Eliminazione link in corso... (0/${total})`, 'info', false);
        
        for (let i = 0; i < invalidIds.length; i++) {
            const linkId = invalidIds[i];
            try {
                await this.deleteMediaLink(linkId);
                deletedCount++;
            } catch (error) {
                console.error(`Error deleting link ${linkId}:`, error);
                errorCount++;
            }
            
            if ((i + 1) % 5 === 0 || i === invalidIds.length - 1) {
                this.showSnackbar(`Eliminazione link in corso... (${i + 1}/${total})`, 'info', false);
            }
        }
        
        runInAction(() => {
            this.invalidLinkIds.clear();
        });
        
        if (errorCount > 0) {
            this.showSnackbar(`Eliminati ${deletedCount} link, ${errorCount} errori`, 'warning', true, { deletedCount, errorCount });
        } else {
            this.showSnackbar('notifications.deletedAllInvalid', 'success', true, { count: deletedCount });
        }
    }

    setLinksFilterShowId = (showId: number | null) => {
        this.linksFilterShowId = showId;
    }

    setShowOnlyInvalidLinks = (showOnly: boolean) => {
        this.showOnlyInvalidLinks = showOnly;
    }

    setActiveLibraryTab = (tab: number) => {
        this.activeLibraryTab = tab;
    }

    navigateToLibraryLinksTab = async (showId: number) => {
        this.activeLibraryTab = 2;
        this.linksFilterShowId = showId;
        this.showOnlyInvalidLinks = true;
        await this.loadInvalidLinksFromDb();
    }

    clearInvalidLink = (linkId: number) => {
        this.invalidLinkIds.delete(linkId);
    }

    updateMediaLink = async (linkId: number, updates: Partial<Omit<MediaLink, 'id' | 'mediaId'>>) => {
        try {
            const link = await db.mediaLinks.get(linkId);
            if (link) {
                await db.mediaLinks.update(linkId, updates);
                await this.refreshLinksForMediaId(link.mediaId);
                this.showSnackbar('notifications.linkUpdatedSuccess', 'success', true);
            }
        } catch (error) {
            console.error('Error updating media link:', error);
            this.showSnackbar('notifications.processingError', 'error', true, {error: (error as Error).message});
        }
    }

    clearLinksForSeason = async (seasonNumber: number, showId: number) => {
        const show = this.cachedItems.get(showId);
        if (!show) return;
        const season = show.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(ep => ep.id);
        const linksToDelete = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();
        if (linksToDelete.length > 0) {
            await db.mediaLinks.bulkDelete(linksToDelete.map(l => l.id!));
            await this.refreshLinksForShow(showId);
            this.showSnackbar('notifications.allSeasonLinksDeleted', 'success', true, {
                count: linksToDelete.length,
                season: seasonNumber
            });
        } else {
            this.showSnackbar('notifications.noLinksToDelete', 'warning', true, {season: seasonNumber});
        }
    }

    clearLinksForDomain = async (showId: number, seasonNumber: number, origin: string) => {
        const show = this.cachedItems.get(showId);
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
            const linkIdsToDelete = linksToDelete.map(l => l.id!);
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

    updateLinksDomain = async (payload: { links: MediaLink[], newDomain: string }) => {
        const {links, newDomain} = payload;
        try {
            const updatedLinks = links.map(link => {
                const url = new URL(link.url);
                const newUrl = new URL(url.pathname + url.search, newDomain);
                return {...link, url: newUrl.toString()};
            });
            await db.mediaLinks.bulkPut(updatedLinks);
            if (this.linkingEpisodesForItem) {
                await this.refreshLinksForShow(this.linkingEpisodesForItem.id);
            }
            this.showSnackbar('notifications.linksUpdated', 'success', true, {count: updatedLinks.length});
        } catch (error) {
            this.showSnackbar('notifications.domainUpdateError', 'error', true, {error: (error as Error).message});
        }
    }

    // ===== SHARING METHODS =====

    generateShareableData = async (showIds: number[]): Promise<SharedLibraryData> => {
        const shows: SharedShowData[] = [];
        for (const showId of showIds) {
            const cachedShow = this.cachedItems.get(showId);
            const needsFetch = !cachedShow || !cachedShow.seasons || cachedShow.seasons.some(s => s.episodes.length === 0);
            if (needsFetch) {
                await this.selectMedia({id: showId, media_type: 'tv'} as MediaItem, 'cacheOnly');
            }

            const show = this.cachedItems.get(showId);
            if (!show || !show.seasons) continue;

            const links: SharedEpisodeLink[] = [];
            for (const season of show.seasons) {
                for (const episode of season.episodes) {
                    const episodeLinks = this.mediaLinks.get(episode.id) || [];
                    episodeLinks.forEach(link => {
                        links.push({
                            seasonNumber: season.season_number,
                            episodeNumber: episode.episode_number,
                            url: link.url,
                            label: link.label,
                            language: link.language,
                            type: link.type,
                        });
                    });
                }
            }
            if (links.length > 0) {
                shows.push({tmdbId: showId, links});
            }
        }
        return {version: 1, shows};
    }

    importSharedLibrary = async (data: SharedLibraryData) => {
        this.isImportingLibrary = true;
        try {
            let totalLinksAdded = 0;
            const showIdsToAddToMyList: number[] = [];

            for (const showData of data.shows) {
                showIdsToAddToMyList.push(showData.tmdbId);

                if (!this.cachedItems.has(showData.tmdbId)) {
                    await this.selectMedia({id: showData.tmdbId, media_type: 'tv'} as MediaItem, 'cacheOnly');
                }
                const show = this.cachedItems.get(showData.tmdbId);
                if (!show || !show.seasons) continue;

                const allEpisodeIds = show.seasons.flatMap(s => s.episodes.map(e => e.id));
                if (allEpisodeIds.length === 0) continue;

                const existingLinks = await db.mediaLinks.where('mediaId').anyOf(allEpisodeIds).toArray();
                const existingLinkSet = new Set(existingLinks.map(l => `${l.mediaId}|${l.url}`));

                const linksToAdd: Omit<MediaLink, "id">[] = [];
                for (const link of showData.links) {
                    const episode = show.seasons
                        .find(s => s.season_number === link.seasonNumber)?.episodes
                        .find(e => e.episode_number === link.episodeNumber);
                    if (episode) {
                        const linkIdentifier = `${episode.id}|${link.url}`;
                        if (!existingLinkSet.has(linkIdentifier)) {
                            linksToAdd.push({
                                mediaId: episode.id,
                                url: link.url,
                                label: link.label,
                                language: link.language,
                                type: link.type
                            });
                            existingLinkSet.add(linkIdentifier);
                        }
                    }
                }
                if (linksToAdd.length > 0) {
                    await db.mediaLinks.bulkAdd(linksToAdd as MediaLink[]);
                    totalLinksAdded += linksToAdd.length;
                }
            }

            if (showIdsToAddToMyList.length > 0) {
                const itemsToAddToMyList = showIdsToAddToMyList
                    .filter(id => !this.myList.includes(id))
                    .map((id, index) => ({id, order: this.myList.length + index}));

                if (itemsToAddToMyList.length > 0) {
                    await db.myList.bulkAdd(itemsToAddToMyList);
                    runInAction(() => {
                        this.myList.push(...itemsToAddToMyList.map(item => item.id));
                    });
                }
            }

            this.showSnackbar('notifications.importSuccess', 'success', true, {
                showCount: data.shows.length,
                linkCount: totalLinksAdded
            });
            await this.reloadAllData();
        } catch (error) {
            this.showSnackbar('notifications.importError', 'error', true, {error: (error as Error).message});
            this.isImportingLibrary = false;
        }
    }

    // ===== REVISIONS METHODS =====

    fetchRevisions = async () => {
        this.isRevisionsLoading = true;
        const revs = await db.revisions.orderBy('timestamp').reverse().limit(100).toArray();
        await this.enrichRevisionsWithContext(revs);
        runInAction(() => {
            this.revisions = revs;
            this.isRevisionsLoading = false;
        });
    }

    revertRevision = async (revision: Revision) => {
        try {
            const table = (db as any)[revision.table];
            if (!table) throw new Error(`Table ${revision.table} not found.`);

            switch (revision.type) {
                case 1:
                    await table.delete(revision.key);
                    break;
                case 2:
                case 3:
                    if (!revision.oldObj) {
                        throw new Error(this.t('revisions.errors.missingOldObject'));
                    }
                    await table.put(revision.oldObj);
                    break;
            }
            if (revision.id) await db.revisions.delete(revision.id);
            this.showSnackbar('notifications.revertSuccess', 'success', true);
            await this.reloadAllData();
        } catch (error) {
            this.showSnackbar('notifications.revertError', 'error', true, {error: (error as Error).message});
        }
    }

    // ===== WEBSOCKET HANDLERS =====

    addDebugMessage = (message: string) => {
        if (this.debugMessages.length > 100) {
            this.debugMessages.shift();
        }
        this.debugMessages.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    };

    initRemoteSession = () => {
        remoteStore.initRemoteSession();
    };

    handleIncomingMessage = (message: any) => {
        runInAction(() => {
            const {type, payload} = message;
            this.addDebugMessage(`IN: ${type} ${JSON.stringify(payload || {})}`);

            switch (type) {
                // Remote control events - delegate to remoteStore
                case 'quix-slave-registered':
                case 'quix-master-connected':
                case 'quix-master-connection-status':
                case 'quix-slave-reconnected':
                case 'quix-remote-command':
                case 'quix-remote-command-received':
                case 'quix-slave-status-update':
                case 'quix-ping':
                case 'quix-pong':
                case 'quix-sync-media-request':
                case 'quix-sync-completed':
                case 'quix-sync-error':
                case 'quix-slave-disconnected':
                case 'quix-master-disconnected':
                    // These are handled by remoteStore's WebSocket handler
                    // Just update local delegation properties
                    if (type === 'quix-slave-registered') {
                        this.slaveId = payload.slaveId;
                        this.slaveShortCode = payload.shortCode;
                        if (this.isSmartTV) {
                            db.preferences.put({key: 'selfSlaveId', value: payload.slaveId});
                            db.preferences.put({key: 'selfShortCode', value: payload.shortCode});
                        }
                        this.showSnackbar('notifications.tvReady', 'info', true);
                    } else if (type === 'quix-master-connected') {
                        this.isRemoteMasterConnected = true;
                        if (this.slaveId) {
                            this.setSlaveOnlineStatus(this.slaveId, true);
                        }
                        if (payload?.slaveId && this.isRemoteMaster) {
                            this.slaveId = payload.slaveId;
                            db.preferences.put({key: 'remoteMasterForSlaveId', value: payload.slaveId});
                        }
                        if (this.isSmartTV) {
                            this.isSmartTVPairingVisible = false;
                        } else {
                            if (this.slaveId) {
                                this.openMediaSyncModal(this.slaveId);
                            }
                            this.stopMasterReconnectTimer();
                            this.startPingInterval();
                        }
                        this.showSnackbar('notifications.remoteConnected', 'success', true);
                    } else if (type === 'quix-slave-status-update') {
                        this.remoteSlaveState = payload;
                    } else if (type === 'quix-slave-disconnected') {
                        if (this.slaveId) {
                            this.setSlaveOnlineStatus(this.slaveId, false);
                        }
                        this.handleSlaveDisconnected(payload?.willReconnect !== true);
                        this.stopPingInterval();
                    } else if (type === 'quix-master-disconnected') {
                        this.isRemoteMasterConnected = false;
                        this.knownSlaves.forEach(slave => {
                            slave.isOnline = false;
                        });
                        this.stopPingInterval();
                        this.showSnackbar('notifications.masterDisconnected', 'info', true);
                    }
                    break;

                // Watch Together events - delegate to watchTogetherStore
                case 'quix-room-update':
                case 'quix-playback-update':
                    // These are handled by watchTogetherStore
                    break;

                default:
                    break;
            }
        });
    };

    reconnectToSlave = (slaveId: string) => {
        this.connectAsRemoteMaster(slaveId);
    };

    updateSlaveName = async (slaveId: string, name: string) => {
        await remoteStore.updateSlaveName(slaveId, name);
    };

    updateSlaveShortCode = async (slaveId: string, shortCode: string) => {
        await remoteStore.updateSlaveShortCode(slaveId, shortCode);
    };

    forgetSlave = async (slaveId: string) => {
        await remoteStore.forgetSlave(slaveId);
    };

    setSlaveOnlineStatus = (slaveId: string, isOnline: boolean) => {
        remoteStore.setSlaveOnlineStatus(slaveId, isOnline);
    };

    setRemoteSelectedItem = (item: MediaItem) => {
        this.selectMedia(item, 'remoteControl');
    };

    // Send slave status update
    sendSlaveStatusUpdate = () => {
        remoteStore.sendSlaveStatusUpdate();
    };

    // ===== PRIVATE HELPER METHODS =====

    _fetchAndCacheMediaDetails = async (itemId: number, initialItem: MediaItem): Promise<MediaItem> => {
        let fullItemDetails = initialItem;
        const needsApiFetch = fullItemDetails.media_type === 'tv' &&
            (!fullItemDetails.seasons || fullItemDetails.seasons.some(s => s.episodes.length === 0));

        if (needsApiFetch) {
            const apiDetails = await getSeriesDetails(itemId);
            const seasonsWithEpisodes = await Promise.all(
                apiDetails.seasons?.map(async (season) => {
                    const episodes = await getSeriesEpisodes(itemId, season.season_number);
                    const episodesWithLinks = await Promise.all(episodes.map(async ep => {
                        const links = await this.getLinksForMedia(ep.id);
                        return {...ep, video_urls: links, video_url: links[0]?.url};
                    }));
                    return {...season, episodes: episodesWithLinks};
                }) || []
            );
            fullItemDetails = {...apiDetails, seasons: seasonsWithEpisodes};
        } else if (fullItemDetails.media_type === 'tv' && fullItemDetails.seasons) {
            const seasonsWithFreshLinks = await Promise.all(
                fullItemDetails.seasons.map(async (season) => {
                    const episodesWithLinks = await Promise.all(season.episodes.map(async ep => {
                        const links = await this.getLinksForMedia(ep.id);
                        return {...ep, video_urls: links, video_url: links[0]?.url};
                    }));
                    return {...season, episodes: episodesWithLinks};
                })
            );
            fullItemDetails = {...fullItemDetails, seasons: seasonsWithFreshLinks};
        } else if (fullItemDetails.media_type === 'movie') {
            const links = await this.getLinksForMedia(itemId);
            fullItemDetails = {...fullItemDetails, video_urls: links, video_url: links[0]?.url};
        }

        await db.cachedItems.put(JSON.parse(JSON.stringify(fullItemDetails)));
        runInAction(() => {
            this.cachedItems.set(itemId, fullItemDetails);
        });
        return fullItemDetails;
    }

    private findEpisodeById = (episodeId: number): (Episode & {
        show_id: number,
        show_title: string,
        backdrop_path: string,
        season_number: number,
        poster_path: string,
        title: string,
        media_type: 'tv',
        name: string
    }) | null => {
        for (const show of this.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    const episode = season.episodes.find(ep => ep.id === episodeId);
                    if (episode) {
                        return {
                            ...episode,
                            show_id: show.id,
                            show_title: show.name || show.title,
                            backdrop_path: show.backdrop_path,
                            season_number: season.season_number,
                            poster_path: episode.still_path || show.poster_path,
                            title: episode.name,
                            media_type: 'tv',
                            name: episode.name,
                        };
                    }
                }
            }
        }
        return null;
    }

    findFirstUnwatchedEpisode = (item: MediaItem): Episode | null => {
        if (!item.seasons) return null;

        for (const season of item.seasons) {
            if (season.episodes) {
                for (const episode of season.episodes) {
                    const progress = this.episodeProgress.get(episode.id);
                    if (!progress?.watched) {
                        const links = this.mediaLinks.get(episode.id);
                        if (links && links.length > 0) {
                            return episode;
                        }
                    }
                }
            }
        }

        for (const season of item.seasons) {
            if (season.episodes) {
                for (const episode of season.episodes) {
                    const links = this.mediaLinks.get(episode.id);
                    if (links && links.length > 0) {
                        return episode;
                    }
                }
            }
        }

        return null;
    }

    private hasLinks = (showId: number): boolean => {
        const item = this.cachedItems.get(showId);
        if (!item || !item.seasons) return false;
        return item.seasons.some(s => s.episodes.some(ep => this.mediaLinks.has(ep.id)));
    }

    // Public method used by remoteStore for resolving video URLs
    getLinksForMedia = async (mediaId: number): Promise<MediaLink[]> => {
        let links = this.mediaLinks.get(mediaId);
        if (!links) {
            links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
            this.mediaLinks.set(mediaId, links);
        }
        return links;
    }

    private refreshLinksForMediaId = async (mediaId: number): Promise<void> => {
        const links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
        runInAction(() => {
            this.mediaLinks.set(mediaId, links);
            if (this.linkingEpisodesForItem) this.refreshLinksForShow(this.linkingEpisodesForItem.id);
            if (this.linkingMovieItem?.id === mediaId) {
                this.linkingMovieItem = {...this.linkingMovieItem, video_urls: links};
            }
        });
    }

    private refreshLinksForShow = async (showId: number): Promise<void> => {
        const show = this.cachedItems.get(showId);
        if (!show || !show.seasons) return;

        const updatedSeasons = await Promise.all(
            show.seasons.map(async (season) => {
                const updatedEpisodes = await Promise.all(
                    season.episodes.map(async (episode) => {
                        const links = await db.mediaLinks.where('mediaId').equals(episode.id).toArray();
                        runInAction(() => {
                            this.mediaLinks.set(episode.id, links);
                        });
                        return {...episode, video_urls: links, video_url: links[0]?.url};
                    })
                );
                return {...season, episodes: updatedEpisodes};
            })
        );

        const updatedShow = {...show, seasons: updatedSeasons};

        runInAction(() => {
            this.cachedItems.set(showId, updatedShow);
            if (this.selectedItem?.id === showId) {
                this.selectedItem = updatedShow;
            }
            if (this.linkingEpisodesForItem?.id === showId) {
                this.linkingEpisodesForItem = updatedShow;
            }
            if (this._masterUiSelectedItem?.id === showId) {
                this._masterUiSelectedItem = updatedShow;
            }
        });
    }

    private t = (key: string, values?: Record<string, any>): string => {
        const translatedString = getNestedValue(this.translations, key);
        if (translatedString) {
            return values ? interpolate(translatedString, values) : translatedString;
        }
        console.warn(`[Translation] Missing key: "${key}" for language: "${this.language}"`);
        return key;
    }

    private enrichRevisionsWithContext = async (revs: Revision[]): Promise<void> => {
        for (const rev of revs) {
            rev.icon = rev.type === 1 ? 'add' : rev.type === 2 ? 'update' : 'delete';
            const obj = rev.obj || rev.oldObj;
            if (!obj) {
                rev.description = this.t('revisions.descriptions.unknown', {type: rev.type, table: rev.table});
                continue;
            }

            try {
                switch (rev.table) {
                    case 'myList':
                        const myListItem = this.cachedItems.get(obj.id);
                        rev.description = this.t('revisions.descriptions.myList.' + (rev.type === 1 ? 'add' : 'remove'), {name: myListItem?.name || myListItem?.title || obj.id});
                        break;
                    case 'cachedItems':
                        rev.description = this.t('revisions.descriptions.cachedItems.' + (rev.type === 1 ? 'add' : rev.type === 2 ? 'update' : 'remove'), {name: obj.name || obj.title});
                        break;
                    case 'mediaLinks':
                        const context = await this.findEpisodeContext(obj.mediaId);
                        if (context) {
                            rev.description = this.t('revisions.descriptions.episodeLinks.' + (rev.type === 1 ? 'add' : rev.type === 2 ? 'update' : 'remove'), context);
                        } else {
                            rev.description = this.t('revisions.descriptions.unknown', {type: rev.type, table: rev.table});
                        }
                        break;
                    case 'showIntroDurations':
                        const show = this.cachedItems.get(obj.id);
                        rev.description = this.t('revisions.descriptions.showIntroDurations.' + (rev.type === 1 || rev.type === 2 ? 'set' : 'remove'), {
                            show: show?.name || obj.id,
                            duration: obj.duration
                        });
                        break;
                    case 'viewingHistory':
                        const vhContext = await this.findEpisodeContext(obj.episodeId);
                        if (vhContext) {
                            rev.description = this.t('revisions.descriptions.viewingHistory.add', vhContext);
                        } else {
                            rev.description = this.t('revisions.descriptions.unknown', {type: rev.type, table: rev.table});
                        }
                        break;
                    default:
                        rev.description = this.t('revisions.descriptions.unknown', {type: rev.type, table: rev.table});
                        break;
                }
            } catch (e) {
                console.warn("Error enriching revision", e);
            }
        }
    }

    private findEpisodeContext = async (episodeId: number): Promise<{
        show: string | undefined;
        s: number;
        e: number;
        epName: string;
    } | null> => {
        if (this.episodeContextMap.has(episodeId)) return this.episodeContextMap.get(episodeId) || null;

        for (const show of this.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    const episode = season.episodes.find(ep => ep.id === episodeId);
                    if (episode) {
                        const context = {
                            show: show.name || show.title,
                            s: season.season_number,
                            e: episode.episode_number,
                            epName: episode.name,
                        };
                        this.episodeContextMap.set(episodeId, context);
                        return context;
                    }
                }
            }
        }
        return null;
    }
}

// Helper functions that were missing
function getNestedValue(obj: any, path: string): string | undefined {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function interpolate(str: string, values: Record<string, any>): string {
    return str.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

export const mediaStore = new MediaStore();
