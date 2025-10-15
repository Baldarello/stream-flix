

import { makeAutoObservable, runInAction, observable } from 'mobx';
import { db, Revision } from '../services/db';
import * as api from '../services/apiCall';
import { isSmartTV as checkIsSmartTV } from '../utils/device';
import type { MediaItem, PlayableItem, MediaLink, Episode, Season, GoogleUser, SharedLibraryData, SharedShowData, SharedEpisodeLink, EpisodeProgress, Revision as UIRecord, ShowFilterPreference, PreferredSource } from '../types';
import { websocketService } from '../services/websocketService.js';
import * as driveService from '../services/googleDriveService';
import { it } from '../locales/it';
import { en } from '../locales/en';

export type ThemeName = 'SerieTV' | 'Film' | 'Anime';
export type Language = 'it' | 'en';
type View = 'Home' | 'Series' | 'Movies' | 'Anime' | 'MyList' | 'Search';

interface SnackbarMessage {
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
    isTranslationKey?: boolean;
    translationValues?: Record<string, any>;
    action?: {
        label: string;
        onClick: () => void;
    };
}

class MediaStore {
    // General UI State
    loading = true;
    error: string | null = null;
    activeTheme: ThemeName = 'SerieTV';
    language: Language = 'it';
    translations: any = it;
    activeView: View = 'Home';

    // Modal & Drawer State
    isProfileDrawerOpen = false;
    isQRScannerOpen = false;
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem: MediaItem | null = null;
    isLinkMovieModalOpen = false;
    linkingMovieItem: MediaItem | null = null;
    isLinkSelectionModalOpen = false;
    itemForLinkSelection: PlayableItem | null = null;
    linksForSelection: MediaLink[] = [];
    linkSelectionContext: 'local' | 'remote' = 'local';
    watchTogetherModalOpen = false;
    isEpisodesDrawerOpen = false;
    isShareModalOpen = false;
    isImportModalOpen = false;
    isRevisionsModalOpen = false;

    // Data State
    latestMovies: MediaItem[] = [];
    trending: MediaItem[] = [];
    topSeries: MediaItem[] = [];
    popularAnime: MediaItem[] = [];
    allMovies: MediaItem[] = [];
    heroContent: MediaItem | null = null;
    myList: number[] = [];
    myListItems: MediaItem[] = [];
    continueWatchingItems: PlayableItem[] = [];
    homePageRows: { titleKey: string, items: MediaItem[] }[] = [];

    // Search State
    isSearchActive = false;
    searchQuery = '';
    searchResults: MediaItem[] = [];
    isSearching = false;

    // Detail View State
    isDetailLoading = false;
    showIntroDurations = observable.map<number, number>();
    selectedSeasons = observable.map<number, number>();
    showFilterPreferences = observable.map<number, Partial<ShowFilterPreference>>();
    episodeProgress = observable.map<number, EpisodeProgress>();
    mediaLinks = observable.map<number, MediaLink[]>();
    allUniqueLabels: string[] = [];
    preferredLabels: string[] = [];
    preferredSources = observable.map<number, string>();
    expandedLinkAccordionId: number | false = false;

    // Watch Together State (via WebSocket)
    roomId: string | null = null;
    isHost = false;
    participants: { id: string, name: string }[] = [];
    hostId: string | null = null;
    selectedItem: MediaItem | null = null;
    watchTogetherSelectedItem: PlayableItem | null = null;
    watchTogetherError: string | null = null;
    chatHistory: any[] = [];
    myClientId: string | null = null;
    joinRoomIdFromUrl: string | null = null;
    // FIX: Add missing playbackState property for Watch Together feature.
    playbackState: { status: 'playing' | 'paused'; time: number } = { status: 'paused', time: 0 };

    // Smart TV / Remote Control State
    isSmartTV = checkIsSmartTV();
    isSmartTVPairingVisible = false;
    isRemoteMaster = false;
    isRemoteMasterConnected = false;
    slaveId: string | null = null;
    remoteSlaveState: {
        isPlaying: boolean;
        isIntroSkippable: boolean;
        nowPlayingItem: PlayableItem | null;
        currentTime?: number;
        duration?: number;
    } | null = null;
    remoteSelectedItem: MediaItem | null = null;
    isRemoteDetailLoading = false;
    remoteFullItem: MediaItem | null = null;
    // FIX: Add missing isRemoteFullItemLoading property.
    isRemoteFullItemLoading = false;

    // Google Auth & Drive Sync
    isLoggedIn = false;
    googleUser: GoogleUser | null = null;
    isSyncing = false;
    private backupDebounceTimer: number | null = null;

    // Debug
    isDebugModeActive = false;
    debugMessages: string[] = [];

    // Revisions
    revisions: UIRecord[] = [];
    isRevisionsLoading = false;
    importUrl: string | null = null;
    isImportingLibrary = false;

    constructor() {
        makeAutoObservable(this);
        this.initWebSocketListeners();

        // Check for debug mode, remote control, or import URLs in query params on startup
        const urlParams = new URLSearchParams(window.location.search);
        this.isDebugModeActive = urlParams.has('debug');
        const remoteForId = urlParams.get('remote_for');
        if (remoteForId) {
            this.connectAsRemoteMaster(remoteForId);
        }
        const roomId = urlParams.get('roomId');
        if (roomId) {
            this.joinRoomIdFromUrl = roomId;
            this.watchTogetherModalOpen = true;
        }
        const importUrl = urlParams.get('importFromUrl');
        if (importUrl) {
            this.importUrl = importUrl;
            this.isImportModalOpen = true;
        }
    }

    // A simple debounce utility
    private debounce(func: (...args: any[]) => void, delay: number) {
        return (...args: any[]) => {
            if (this.backupDebounceTimer) {
                clearTimeout(this.backupDebounceTimer);
            }
            this.backupDebounceTimer = window.setTimeout(() => {
                func(...args);
            }, delay);
        };
    }
    
    // Debounced backup function
    private debouncedBackup = this.debounce(() => {
        if (this.isLoggedIn && this.googleUser) {
            this.backupToDrive(true); // isDebounced = true
        }
    }, 10000); // 10-second debounce period

    triggerDebouncedBackup() {
        this.debouncedBackup();
    }
    
    // ... Mock implementations for all methods
    // These would involve complex logic with API calls, DB, and WebSockets in a real app.
    
    // Dummy methods to satisfy the type checker and component usage
    async fetchAllData() {
        this.setLoading(true);
        try {
            const [trending, latestMovies, topSeries, popularAnime] = await Promise.all([
                api.getTrending(),
                api.getLatestMovies(),
                api.getTopRatedSeries(),
                api.getPopularAnime()
            ]);
            
            runInAction(async () => {
                this.trending = trending;
                this.latestMovies = latestMovies;
                this.topSeries = topSeries;
                this.popularAnime = popularAnime;
                this.allMovies = latestMovies; // simplified
                this.heroContent = trending[0] || null;

                // Re-build home page rows after fetching data and loading user data
                await this.buildHomePageRows();
                this.setLoading(false);
            });

        } catch (e) {
            this.setError("Failed to fetch initial data.");
        }
    }

    async buildHomePageRows() {
         await this.loadContinueWatching();
         await this.loadMyListItems();
        this.homePageRows = [
            ...(this.continueWatchingItems.length > 0 ? [{ titleKey: 'misc.continueWatching', items: this.continueWatchingItems as MediaItem[] }] : []),
            ...(this.myListItems.length > 0 ? [{ titleKey: 'misc.myList', items: this.myListItems }] : []),
            { titleKey: 'misc.latestReleases', items: this.latestMovies },
            { titleKey: 'misc.topRated', items: this.trending },
            { titleKey: 'misc.popularSeries', items: this.topSeries },
            { titleKey: 'misc.mustWatchAnime', items: this.popularAnime },
        ];
    }
    
    setLoading(loading: boolean) { this.loading = loading; }
    setError(error: string | null) { this.error = error; this.loading = false; console.error(error); }

    // THEME & LANGUAGE
    setActiveTheme(theme: ThemeName) {
        this.activeTheme = theme;
        db.preferences.put({ key: 'activeTheme', value: theme });
    }
    setLanguage(lang: Language) {
        this.language = lang;
        this.translations = lang === 'it' ? it : en;
        db.preferences.put({ key: 'language', value: lang });
    }
    
    // PERSISTENCE
    async loadPersistedData() {
        const [
            theme, lang, intros, seasons, filters, progress, myList,
            labels, sources
        ] = await Promise.all([
            db.preferences.get('activeTheme'),
            db.preferences.get('language'),
            db.showIntroDurations.toArray(),
            db.selectedSeasons.toArray(),
            db.showFilterPreferences.toArray(),
            db.episodeProgress.toArray(),
            db.myList.orderBy('order').toArray(),
            db.preferences.get('preferredLabels'),
            db.preferredSources.toArray(),
        ]);

        runInAction(() => {
            if (theme) this.activeTheme = theme.value;
            if (lang) this.setLanguage(lang.value);
            // FIX: The standard Map object does not have a `replace` method. Use `clear` and then iterate to set values.
            this.showIntroDurations.clear();
            intros.forEach(i => this.showIntroDurations.set(i.id, i.duration));
            this.selectedSeasons.clear();
            seasons.forEach(s => this.selectedSeasons.set(s.showId, s.seasonNumber));
            this.showFilterPreferences.clear();
            filters.forEach(f => this.showFilterPreferences.set(f.showId, f));
            this.episodeProgress.clear();
            progress.forEach(p => this.episodeProgress.set(p.episodeId, p));
            this.myList = myList.map(item => item.id);
            if (labels) this.preferredLabels = labels.value;
            this.preferredSources.clear();
            sources.forEach(s => this.preferredSources.set(s.showId, s.origin));
        });
        
        await this.loadAllMediaLinks();
    }

    // SEARCH
    setSearchQuery(query: string) { this.searchQuery = query; /* logic for triggering search */ }
    toggleSearch(isActive: boolean) { this.isSearchActive = isActive; }

    // PLAYBACK
    async prepareItemForPlayback(item: PlayableItem): Promise<PlayableItem | null> { return item; } // Simplified
    async prepareItemForPlaybackById(type: 'movie' | 'episode', id: number, showId?: number): Promise<PlayableItem | null> {
        let item: MediaItem | Episode | undefined;
        if(type === 'movie'){
            item = await api.getMediaDetails('movie', id);
        } else {
            // This would require more logic to find the specific episode
            const show = await this.fetchFullMediaDetails(showId!);
            item = show?.seasons?.flatMap(s => s.episodes).find(e => e.id === id);
            if (item && show) {
                (item as any).show_id = show.id;
                (item as any).show_title = show.title || show.name;
                (item as any).backdrop_path = show.backdrop_path;
            }
        }
        return item as PlayableItem | null;
    }
    startPlayback(item: PlayableItem) { console.log('Starting playback for', item); /* navigate to player */ }

    // MY LIST
    toggleMyList(item: MediaItem) { 
        const index = this.myList.indexOf(item.id);
        if (index > -1) {
            this.myList.splice(index, 1);
            db.myList.delete(item.id);
        } else {
            this.myList.push(item.id);
            // Add to end of list
            db.myList.toArray().then(list => {
                const maxOrder = list.reduce((max, i) => Math.max(max, i.order ?? -1), -1);
                db.myList.add({ id: item.id, order: maxOrder + 1 });
            });
        }
        this.buildHomePageRows();
    }
    reorderMyList(fromIndex: number, toIndex: number) {
        const myItems = this.myListItems.slice();
        const [movedItem] = myItems.splice(fromIndex, 1);
        myItems.splice(toIndex, 0, movedItem);
        this.myListItems = myItems;
        this.myList = myItems.map(i => i.id);
        const updates = myItems.map((item, index) => ({ id: item.id, order: index }));
        db.myList.bulkPut(updates);
    }
    async loadMyListItems() {
        if (this.myList.length === 0) {
            this.myListItems = [];
            return;
        }
        const items = await Promise.all(this.myList.map(id => api.getMediaDetails('tv', id).catch(() => api.getMediaDetails('movie', id))));
        this.myListItems = items.filter(Boolean) as MediaItem[];
    }
    
    // CONTINUE WATCHING
    async loadContinueWatching() {
        const progressItems = await db.episodeProgress.where('watched').equals(0).and(p => p.currentTime > 0).toArray();
        // This is simplified. A real implementation would fetch show details for each episode.
        this.continueWatchingItems = []; 
    }
    removeFromContinueWatching(id: number) { /* DB logic */ }
    updateEpisodeProgress(progress: EpisodeProgress) {
        db.episodeProgress.put(progress);
        this.episodeProgress.set(progress.episodeId, progress);
    }
    toggleEpisodeWatchedStatus(episodeId: number) {
        const progress = this.episodeProgress.get(episodeId);
        const newStatus = !progress?.watched;
        this.updateEpisodeProgress({
            episodeId,
            currentTime: progress?.currentTime || 0,
            duration: progress?.duration || 1,
            watched: newStatus,
        });
        this.showSnackbar(newStatus ? 'notifications.markedAsWatched' : 'notifications.markedAsUnwatched', 'success', true);
    }

    // DETAILS & LINKING
    async fetchFullMediaDetails(id: number): Promise<MediaItem | null> { 
        this.isDetailLoading = true;
        try {
            // Try fetching as TV, then as movie
            let item = await api.getSeriesDetails(id).catch(() => null);
            if (!item) {
                item = await api.getMediaDetails('movie', id);
            } else {
                 // Fetch episodes for all seasons
                const seasonsWithEpisodes = await Promise.all(
                    item.seasons?.map(async (season) => {
                        const episodes = await api.getSeriesEpisodes(id, season.season_number);
                        const links = this.mediaLinks.get(id) || [];
                        episodes.forEach(ep => {
                            ep.video_urls = links.filter(l => l.mediaId === ep.id);
                            ep.video_url = this.getPreferredUrl(ep.video_urls, id);
                        });
                        return { ...season, episodes };
                    }) ?? []
                );
                if (item) item.seasons = seasonsWithEpisodes;
            }
            if (item && item.media_type === 'movie') {
                const links = this.mediaLinks.get(id) || [];
                item.video_urls = links.filter(l => l.mediaId === id);
                item.video_url = this.getPreferredUrl(item.video_urls, id);
            }
            runInAction(() => { this.isDetailLoading = false; });
            return item;
        } catch (error) {
            console.error(error);
            runInAction(() => { this.isDetailLoading = false; });
            return null;
        }
    }
    setShowIntroDuration(showId: number, duration: number) {
        this.showIntroDurations.set(showId, duration);
        db.showIntroDurations.put({ id: showId, duration });
    }
    setSelectedSeasonForShow(showId: number, seasonNumber: number) {
        this.selectedSeasons.set(showId, seasonNumber);
        db.selectedSeasons.put({ showId, seasonNumber });
    }
    setShowFilterPreference(showId: number, prefs: Partial<ShowFilterPreference>) {
        const currentPrefs = this.showFilterPreferences.get(showId) || {};
        const newPrefs = { ...currentPrefs, ...prefs };
        this.showFilterPreferences.set(showId, newPrefs);
        db.showFilterPreferences.put({ showId, ...newPrefs });
    }
    async loadAllMediaLinks() {
        const allLinks = await db.mediaLinks.toArray();
        const linksMap = new Map<number, MediaLink[]>();
        const labelSet = new Set<string>();
        allLinks.forEach(link => {
            const mediaId = link.mediaId; // This could be a show ID for movies, or episode ID for TV
            if (!linksMap.has(mediaId)) {
                linksMap.set(mediaId, []);
            }
            linksMap.get(mediaId)!.push(link);
            if (link.label) labelSet.add(link.label);
        });
        // FIX: The standard Map object does not have a `replace` method. Use `clear` and then iterate to set values.
        this.mediaLinks.clear();
        linksMap.forEach((value, key) => this.mediaLinks.set(key, value));
        this.allUniqueLabels = Array.from(labelSet).sort();
    }
    async setEpisodeLinksForSeason(payload: any): Promise<boolean> { return true; }
    
    // UI ACTIONS
    toggleProfileDrawer(isOpen: boolean) { this.isProfileDrawerOpen = isOpen; }
    openQRScanner() { this.isQRScannerOpen = true; this.isProfileDrawerOpen = false; }
    closeQRScanner() { this.isQRScannerOpen = false; }
    openLinkEpisodesModal(item: MediaItem) { this.linkingEpisodesForItem = item; this.isLinkEpisodesModalOpen = true; }
    closeLinkEpisodesModal() { this.isLinkEpisodesModalOpen = false; this.linkingEpisodesForItem = null; }
    openLinkMovieModal(item: MediaItem) { this.linkingMovieItem = item; this.isLinkMovieModalOpen = true; }
    closeLinkMovieModal() { this.isLinkMovieModalOpen = false; this.linkingMovieItem = null; }
    closeLinkSelectionModal() { this.isLinkSelectionModalOpen = false; }
    openWatchTogetherModal(item: MediaItem) {
        this.selectedItem = item;
        this.watchTogetherSelectedItem = item;
        this.watchTogetherModalOpen = true;
    }
    closeWatchTogetherModal() {
        this.watchTogetherModalOpen = false;
        this.watchTogetherError = null;
        this.selectedItem = null;
    }
    openEpisodesDrawer() { this.isEpisodesDrawerOpen = true; }
    closeEpisodesDrawer() { this.isEpisodesDrawerOpen = false; }
    openShareModal() { this.isShareModalOpen = true; this.isProfileDrawerOpen = false; }
    closeShareModal() { this.isShareModalOpen = false; }
    openImportModal() { this.isImportModalOpen = true; this.isProfileDrawerOpen = false; }
    closeImportModal() { this.isImportModalOpen = false; this.importUrl = null; }
    openRevisionsModal() { this.isRevisionsModalOpen = true; this.isProfileDrawerOpen = false; /* load revisions */ }
    closeRevisionsModal() { this.isRevisionsModalOpen = false; }
    setActiveView(view: View) { this.activeView = view; }
    setExpandedLinkAccordionId(id: number | false) { this.expandedLinkAccordionId = id; }
    getPreferredUrl(links: MediaLink[], showId: number): string | undefined { return links?.[0]?.url; }

    // NOTIFICATIONS
    snackbarMessage: SnackbarMessage | null = null;
    showSnackbar(message: string, severity: SnackbarMessage['severity'], isTranslationKey = false, translationValues?: Record<string, any>, action?: SnackbarMessage['action']) {
        this.snackbarMessage = { message, severity, isTranslationKey, translationValues, action };
    }
    hideSnackbar() { this.snackbarMessage = null; }
    
    // WEBSOCKET & REAL-TIME
    private initWebSocketListeners() {
        websocketService.events.on('open', () => this.addDebugMessage('WebSocket connection opened.'));
        websocketService.events.on('message', (message: any) => this.handleWebSocketMessage(message));
        websocketService.events.on('debug', (msg: string) => this.addDebugMessage(msg));
        this.myClientId = websocketService.clientId;
    }
    private handleWebSocketMessage(message: any) {
        this.addDebugMessage(`IN: ${JSON.stringify(message)}`);
        const { type, payload } = message;

        if (type === 'connected') {
            runInAction(() => { this.myClientId = payload.clientId; });
            // If we were trying to be a slave, re-register
            if (this.isSmartTVPairingVisible) {
                this.enableSmartTVMode();
            }
            return;
        }

        if (type.startsWith('quix-')) {
            // Handle app-specific messages
            switch (type) {
                case 'quix-room-update':
                    runInAction(() => {
                        this.roomId = payload.roomId;
                        this.hostId = payload.hostId;
                        this.participants = payload.participants;
                        this.chatHistory = payload.chatHistory;
                        this.isHost = payload.isHost;
                        this.watchTogetherSelectedItem = payload.selectedMedia;
                        // FIX: Update playbackState from the websocket payload.
                        this.playbackState = payload.playbackState;
                        this.watchTogetherError = null;
                        this.watchTogetherModalOpen = true;
                    });
                    break;
                case 'quix-error':
                     runInAction(() => {
                        this.watchTogetherError = payload.message;
                        this.showSnackbar(payload.message, 'error');
                     });
                    break;
                 case 'quix-slave-registered':
                    runInAction(() => { this.slaveId = payload.slaveId; });
                    break;
                case 'quix-master-connected':
                    runInAction(() => {
                        if (this.isSmartTVPairingVisible) this.isRemoteMasterConnected = true;
                        if (this.isRemoteMaster) {
                           this.isRemoteMasterConnected = true;
                           this.showSnackbar('notifications.connectedToTV', 'success', true);
                        }
                    });
                    break;
                case 'quix-slave-status-update':
                    runInAction(() => { this.remoteSlaveState = payload; });
                    break;
                case 'quix-remote-command-received':
                    // Logic to be executed on the slave (TV) client
                    this.handleRemoteCommand(payload);
                    break;
                // ... other cases
            }
        }
    }
    private addDebugMessage(msg: string) { this.debugMessages.push(msg); if(this.debugMessages.length > 50) this.debugMessages.shift(); }
    private sendMessage(type: string, payload: object) {
        this.addDebugMessage(`OUT: ${JSON.stringify({ type, payload })}`);
        websocketService.sendMessage({ type, payload });
    }
    
    // WATCH TOGETHER ACTIONS
    createRoom(username: string) {
        if (!this.watchTogetherSelectedItem) return;
        this.sendMessage('quix-create-room', { username, media: this.watchTogetherSelectedItem });
    }
    joinRoom(roomId: string, username: string) {
        this.sendMessage('quix-join-room', { roomId, username });
    }
    changeWatchTogetherMedia(item: PlayableItem) {
        this.watchTogetherSelectedItem = item;
        if(this.isHost) {
            this.sendMessage('quix-select-media', { media: item });
        }
    }
    setJoinRoomIdFromUrl(id: string | null) { this.joinRoomIdFromUrl = id; }
    changeRoomCode() { if(this.isHost) this.sendMessage('quix-change-room-code', {}); }
    sendChatMessage(message: { text?: string, image?: string }) { this.sendMessage('quix-chat-message', { message }); }
    transferHost(newHostId: string) { if(this.isHost) this.sendMessage('quix-transfer-host', { newHostId }); }
    
    // Placeholder for playback state sync
    addPlaybackListener(callback: (state: any) => void) { /* ... */ return () => {}; }
    sendPlaybackControl(state: any) { this.sendMessage('quix-playback-control', { playbackState: state }); }
    
    // SMART TV & REMOTE ACTIONS
    enableSmartTVMode() {
        this.isSmartTVPairingVisible = true;
        this.isProfileDrawerOpen = false;
        this.sendMessage('quix-register-slave', {});
    }
    exitSmartTVPairingMode() { this.isSmartTVPairingVisible = false; }
    connectAsRemoteMaster(slaveId: string) {
        this.isRemoteMaster = true;
        this.slaveId = slaveId;
        this.sendMessage('quix-register-master', { slaveId });
    }
    playRemoteItem(item: PlayableItem) { this.sendRemoteCommand({ command: 'select_media', media: item }); }
    setRemoteSelectedItem(item: MediaItem) { this.remoteSelectedItem = item; }
    clearRemoteSelectedItem() { this.remoteSelectedItem = null; }
    sendRemoteCommand(command: object) { if(this.slaveId) this.sendMessage('quix-remote-command', { slaveId: this.slaveId, ...command }); }
    sendSlaveStatusUpdate() { if(this.slaveId) this.sendMessage('quix-slave-status-update', { slaveId: this.slaveId, ...this.remoteSlaveState }); }
    setIntroSkippableOnSlave(isSkippable: boolean) { /* logic */ }
    stopRemotePlayback() { this.sendRemoteCommand({ command: 'stop' }); }
    async fetchRemoteFullItem() {
        const item = this.remoteSlaveState?.nowPlayingItem;
        if (!item) return;
        this.isRemoteFullItemLoading = true;
        const showId = 'show_id' in item ? item.show_id : item.id;
        this.remoteFullItem = await this.fetchFullMediaDetails(showId);
        this.isRemoteFullItemLoading = false;
    }
    get remoteNextEpisode(): Episode | null { return null; }
    get remotePreviousEpisode(): Episode | null { return null; }
    handleRemoteCommand(payload: any) {
        // This logic runs on the TV
        switch (payload.command) {
            case 'select_media':
                // Logic to navigate and play media
                break;
            // other commands
        }
    }

    // GOOGLE AUTH & DRIVE
    async setGoogleUser(user: GoogleUser | null) {
        this.googleUser = user;
        this.isLoggedIn = !!user;
    }
    async synchronizeWithDrive() { /* ... */ }
    async backupToDrive(isDebounced = false) { 
        if (this.isSyncing) return;
        this.isSyncing = true;
        if (!isDebounced) this.showSnackbar('notifications.backupInProgress', 'info', true);

        try {
            const dataToBackup = {
                myList: await db.myList.toArray(),
                viewingHistory: await db.viewingHistory.toArray(),
                cachedItems: await db.cachedItems.toArray(),
                mediaLinks: await db.mediaLinks.toArray(),
                showIntroDurations: await db.showIntroDurations.toArray(),
                preferences: await db.preferences.toArray(),
                episodeProgress: await db.episodeProgress.toArray(),
                preferredSources: await db.preferredSources.toArray(),
                selectedSeasons: await db.selectedSeasons.toArray(),
                showFilterPreferences: await db.showFilterPreferences.toArray(),
            };
            await driveService.writeBackupFile(this.googleUser!.accessToken, dataToBackup);
            await driveService.deleteOldBackups(this.googleUser!.accessToken);
            if (!isDebounced) this.showSnackbar('notifications.backupComplete', 'success', true);
        } catch(e) {
            if (!isDebounced) this.showSnackbar('notifications.backupSaveError', 'error', true);
        } finally {
            runInAction(() => { this.isSyncing = false; });
        }
    }
    async restoreFromDrive() { /* ... */ }

    // SHARING
    get shareableShows(): MediaItem[] {
        // Mocked
        return this.myListItems.filter(i => i.media_type === 'tv');
    }
    async generateShareableData(showIds: number[]): Promise<SharedLibraryData> {
        // mocked
        return { version: 1, shows: [] };
    }
    async importSharedLibrary(data: SharedLibraryData) {
        this.isImportingLibrary = true;
        try {
            // ... db logic ...
            this.showSnackbar('notifications.importSuccess', 'success', true, { showCount: data.shows.length, linkCount: 0 });
            setTimeout(() => window.location.reload(), 3000);
        } catch (e) {
             this.showSnackbar('notifications.importError', 'error', true, { error: (e as Error).message });
             runInAction(() => { this.isImportingLibrary = false; });
        }
    }

    // REVISIONS
    async revertRevision(rev: Revision) { /* ... */ }

    // MEDIA LINKS
    addLinksToMedia(mediaId: number, links: any[]) { /* db logic */ }
    deleteMediaLink(linkId: number) { db.mediaLinks.delete(linkId).then(() => this.loadAllMediaLinks()); }
    updateMediaLink(linkId: number, data: Partial<MediaLink>) { db.mediaLinks.update(linkId, data).then(() => this.loadAllMediaLinks()); }
    clearLinksForSeason(seasonNumber: number, showId: number) { /* db logic */ }
    updateLinksDomain(payload: { links: MediaLink[], newDomain: string }) { /* db logic */ }
    setPreferredSource(showId: number, origin: string) {
        this.preferredSources.set(showId, origin);
        db.preferredSources.put({ showId, origin });
        this.showSnackbar('notifications.preferredSourceSet', 'success', true);
    }
    clearLinksForDomain(showId: number, seasonNumber: number, origin: string) { /* db logic */ }
    togglePreferredLabel(label: string) { /* logic */ }
}

export const mediaStore = new MediaStore();