import {makeAutoObservable, runInAction} from 'mobx';
// FIX: Replace deprecated EpisodeLink with MediaLink
import type {ChatMessage, Episode, MediaItem, PlayableItem, ViewingHistoryItem, GoogleUser, MediaLink, SharedLibraryData, SharedShowData, SharedEpisodeLink, Revision, EpisodeProgress, PreferredSource} from '../types';
import type { AlertColor } from '@mui/material';
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
import { isSmartTV as detectSmartTV } from '../utils/device';
import * as driveService from '../services/googleDriveService';
import { it } from '../locales/it';
import { en } from '../locales/en';

export type ActiveView = 'Home' | 'Serie TV' | 'Film' | 'Anime' | 'La mia lista';
export type ThemeName = 'SerieTV' | 'Film' | 'Anime';
export type Language = 'it' | 'en';


type PlaybackState = { status: 'playing' | 'paused'; time: number };

type RemoteSlaveState = {
    isPlaying: boolean;
    nowPlayingItem: PlayableItem | null;
    isIntroSkippable?: boolean;
    currentTime?: number;
    duration?: number;
}

const allTranslations = { it, en };

// FIX: Add translation helper functions for use within the store.
const getNestedValue = (obj: any, path: string): string | undefined => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const interpolate = (str: string, values: Record<string, any>): string => {
    return str.replace(/\{(\w+)\}/g, (placeholder, key) => {
        return values[key] !== undefined ? String(values[key]) : placeholder;
    });
}


class MediaStore {
    trending: MediaItem[] = [];
    latestMovies: MediaItem[] = [];
    topSeries: MediaItem[] = [];
    popularAnime: MediaItem[] = [];
    loading = true;
    error: string | null = null;
    selectedItem: MediaItem | null = null;
    isDetailLoading = false;
    myList: number[] = [];
    isPlaying = false;
    nowPlayingItem: PlayableItem | null = null;
    nowPlayingShowDetails: MediaItem | null = null; // Full details for the show currently playing
    activeView: ActiveView = 'Home';
    viewingHistory: ViewingHistoryItem[] = [];
    cachedItems: Map<number, MediaItem> = new Map();
    episodeProgress: Map<number, EpisodeProgress> = new Map();
    preferredSources: Map<number, string> = new Map();

    // Search State
    searchQuery = '';
    searchResults: MediaItem[] = [];
    isSearchActive = false;
    isSearching = false;
    private searchDebounceTimer: number | null = null;

    // Watch Together State
    watchTogetherModalOpen = false;
    roomId: string | null = null;
    hostId: string | null = null;
    isHost = false;
    participants: { id: string, name: string }[] = [];
    username: string | null = null;
    watchTogetherError: string | null = null;
    playbackState: PlaybackState = {status: 'paused', time: 0};
    chatHistory: ChatMessage[] = [];
    private playbackListeners: ((state: PlaybackState) => void)[] = [];
    joinRoomIdFromUrl: string | null = null;
    watchTogetherSelectedItem: PlayableItem | null = null;
    myClientId: string | null = null;
    private isCreatingRoom = false; // Flag to manage host's view after room creation

    // Remote Control State
    isSmartTV = false;
    isSmartTVPairingVisible = false;
    isRemoteMaster = false;
    slaveId: string | null = null;
    isRemoteMasterConnected = false;
    remoteSlaveState: RemoteSlaveState | null = null;
    remoteSelectedItem: MediaItem | null = null;
    isRemoteDetailLoading = false;
    remoteAction: { type: string; payload?: any; id: number } | null = null;
    remoteFullItem: MediaItem | null = null;
    isRemoteFullItemLoading = false;
    isIntroSkippableOnSlave = false;


    // FIX: Rename episodeLinks state to mediaLinks and use MediaLink type
    mediaLinks: Map<number, MediaLink[]> = new Map();
    // Episode Linking State
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem: MediaItem | null = null;
    // FIX: Add state for movie linking modal
    isLinkMovieModalOpen = false;
    linkingMovieItem: MediaItem | null = null;
    isLinkSelectionModalOpen = false;
    itemForLinkSelection: PlayableItem | null = null;
    // FIX: Use MediaLink type for linksForSelection
    linksForSelection: MediaLink[] = [];
    expandedLinkAccordionId: number | false = false;

    // Player Episode Drawer State
    isEpisodesDrawerOpen = false;

    // Profile Drawer & QR Scanner State
    isProfileDrawerOpen = false;
    isQRScannerOpen = false;
    
    // Library Sharing State
    isShareModalOpen = false;
    isImportModalOpen = false;
    isImportingLibrary = false;
    importUrl: string | null = null;

    // Revisions State
    isRevisionsModalOpen = false;
    isRevisionsLoading = false;
    revisions: Revision[] = [];
    private episodeContextMap: Map<number, { showName: string; sNum: number; epNum: number; epName: string; }> = new Map();


    // Custom Intro Durations
    showIntroDurations: Map<number, number> = new Map();

    // Theme state
    activeTheme: ThemeName = 'SerieTV';

    // Snackbar State
    snackbarMessage: { message: string, severity: AlertColor, action?: { label: string, onClick: () => void }, isTranslationKey?: boolean, translationValues?: Record<string, any> } | null = null;

    // Debug Mode State
    isDebugModeActive = false;
    debugMessages: string[] = [];

    // Google Auth & Sync State
    googleUser: GoogleUser | null = null;
    isSyncing = false;
    private backupDebounceTimer: number | null = null;
    
    // Translation State
    language: Language = 'it';
    
    get translations() {
        return allTranslations[this.language];
    }


    constructor() {
        makeAutoObservable(this);
        this.isSmartTV = detectSmartTV();
        if (this.isSmartTV) {
            this.isSmartTVPairingVisible = true;
        }
        websocketService.events.on('message', this.handleIncomingMessage);
        websocketService.events.on('open', this.initRemoteSession);
        websocketService.events.on('debug', this.addDebugMessage);
    }

    startPlayback = async (item: PlayableItem) => {
        // --- Step 1: Ensure we have a single, playable URL ---
        // If a URL is already provided, we're good to go. This check prevents
        // an infinite loop when selecting a link from the modal.
        if (!item.video_url) {
            let links: MediaLink[] = [];
            if ('episode_number' in item) { // It's an Episode
                links = await this.getLinksForMedia(item.id);
            } else { // It's a MediaItem (Movie)
                links = await this.getLinksForMedia(item.id);
            }
            // Also attach the full list to the item for reference
            item.video_urls = links;

            if (links.length === 0) {
                this.showSnackbar("notifications.noVideoLinks", "warning", true);
                return; // Can't play, so exit.
            } 
            
            if (links.length === 1) {
                item.video_url = links[0].url;
            } else {
                // Multiple links exist, check for a preferred source.
                const showId = 'show_id' in item ? item.show_id : item.id;
                const preferredSource = this.preferredSources.get(showId);
                const preferredLink = preferredSource ? links.find(l => l.url.startsWith(preferredSource)) : undefined;

                if (preferredLink) {
                    item.video_url = preferredLink.url;
                } else {
                    // No preferred source, so we must ask the user.
                    runInAction(() => {
                        this.itemForLinkSelection = item;
                        this.linksForSelection = links;
                        this.isLinkSelectionModalOpen = true;
                    });
                    return; // Exit and wait for user selection.
                }
            }
        }

        // --- Step 2: If we have a URL, start playback ---
        if (item.video_url) {
            runInAction(() => {
                this.nowPlayingItem = item;
                this.closeDetail();
                this.closeLinkSelectionModal(); // Close modal if it was open.

                if ('show_id' in item) {
                    this.nowPlayingShowDetails = this.cachedItems.get(item.show_id) || null;
                } else {
                    this.nowPlayingShowDetails = null; // It's a movie
                }
            });
        }
    }

    stopPlayback = () => {
        this.nowPlayingItem = null;
        this.nowPlayingShowDetails = null;
        this.isPlaying = false;
    }

    synchronizeWithDrive = async () => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            return;
        }
        this.isSyncing = true;
        try {
            this.showSnackbar('notifications.syncChecking', 'info', true);
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            const lastSyncFileId = (await db.preferences.get('lastSyncFileId'))?.value;

            if (remoteFile) {
                // If the latest remote file is the same one we last synced with, do nothing.
                if (remoteFile.id === lastSyncFileId) {
                    this.showSnackbar('notifications.syncUpToDate', 'success', true);
                    return; // Exit early
                }
                
                // A newer remote file exists, restore it.
                this.showSnackbar('notifications.restoringFromCloud', 'info', true);
                const data = await driveService.readBackupFile(this.googleUser.accessToken, remoteFile.id);
                await db.importData(data);
                await db.preferences.put({ key: 'lastSyncFileId', value: remoteFile.id });
                this.showSnackbar('notifications.restoreComplete', 'success', true);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                // No remote backup exists. Create one from local DB.
                this.showSnackbar('notifications.noBackupFoundCreating', 'info', true);
                const newFile = await this.backupToDrive(false);
                if (newFile) {
                    await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
                }
            }
        } catch (error) {
            console.error("Error during initial sync:", error);
            this.showSnackbar('notifications.syncError', 'error', true);
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    backupToDrive = async (showNotification = true): Promise<driveService.DriveFile | undefined> => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            if (showNotification) this.showSnackbar('notifications.loginRequired', 'warning', true);
            return;
        }
        if (showNotification) this.showSnackbar('notifications.backupInProgress', 'info', true);
        this.isSyncing = true;
        try {
            const tablesToBackup = ['myList', 'viewingHistory', 'cachedItems', 'mediaLinks', 'showIntroDurations', 'preferences', 'episodeProgress', 'preferredSources'];
            const data: { [key: string]: any[] } = {};
            for (const tableName of tablesToBackup) {
                if ((db as any)[tableName]) {
                    data[tableName] = await (db as any)[tableName].toArray();
                }
            }
            
            const newFile = await driveService.writeBackupFile(this.googleUser.accessToken, data);
            await driveService.deleteOldBackups(this.googleUser.accessToken);
            
            if (showNotification) this.showSnackbar('notifications.backupComplete', 'success', true);
            return newFile;
        } catch (error) {
            console.error('Failed to backup to drive:', error);
            if (showNotification) this.showSnackbar('notifications.backupSaveError', 'error', true);
            return undefined;
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    restoreFromDrive = async () => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            this.showSnackbar('notifications.loginRequired', 'warning', true);
            return;
        }
        this.showSnackbar('notifications.restoreInProgress', 'info', true);
        this.isSyncing = true;
        try {
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            if (remoteFile) {
                const data = await driveService.readBackupFile(this.googleUser.accessToken, remoteFile.id);
                await db.importData(data);
                await db.preferences.put({ key: 'lastSyncFileId', value: remoteFile.id });
                this.showSnackbar('notifications.restoreComplete', 'success', true);
                setTimeout(() => window.location.reload(), 2000);
            } else {
                this.showSnackbar('notifications.noBackupFound', 'warning', true);
            }
        } catch (error) {
            console.error("Error during restore:", error);
            this.showSnackbar('notifications.restoreError', 'error', true, { error: (error as Error).message });
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    showSnackbar = (message: string, severity: AlertColor = 'info', isTranslationKey = false, translationValues?: Record<string, any>) => {
        this.snackbarMessage = { message, severity, isTranslationKey, translationValues };
    }

    // --- START OF IMPLEMENTED METHODS ---
    hideSnackbar = () => { this.snackbarMessage = null; };
    closeDetail = () => { this.selectedItem = null; };
    setActiveView = (view: ActiveView) => { 
        this.activeView = view; 
        if (view === 'Serie TV') this.setActiveTheme('SerieTV');
        else if (view === 'Film') this.setActiveTheme('Film');
        else if (view === 'Anime') this.setActiveTheme('Anime');
    };
    setActiveTheme = (theme: ThemeName) => { 
        this.activeTheme = theme; 
        db.preferences.put({ key: 'activeTheme', value: theme });
    };
    setSearchQuery = (query: string) => { 
        this.searchQuery = query;
         if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = window.setTimeout(async () => {
                if (this.searchQuery.trim()) {
                    runInAction(() => { this.isSearching = true; });
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
    toggleSearch = (isActive: boolean) => { this.isSearchActive = isActive; if (!isActive) { this.searchQuery = ''; this.searchResults = []; } };
    setJoinRoomIdFromUrl = (roomId: string | null) => { this.joinRoomIdFromUrl = roomId; };
    setImportUrl = (url: string | null) => { this.importUrl = url; };
    toggleProfileDrawer = (isOpen: boolean) => { this.isProfileDrawerOpen = isOpen; };
    openQRScanner = () => { this.isQRScannerOpen = true; this.isProfileDrawerOpen = false; };
    closeQRScanner = () => { this.isQRScannerOpen = false; };
    enableSmartTVMode = () => {
        this.isSmartTV = true; // Mark this client as acting as a TV
        this.isSmartTVPairingVisible = true;
        this.isProfileDrawerOpen = false;
        // Manually send registration message, as websocket might already be connected
        websocketService.sendMessage({ type: 'quix-register-slave' });
    };
    exitSmartTVPairingMode = () => { this.isSmartTVPairingVisible = false; };
    setLanguage = (lang: Language) => { this.language = lang; db.preferences.put({ key: 'language', value: lang }); };
    openShareModal = () => { this.isShareModalOpen = true; };
    closeShareModal = () => { this.isShareModalOpen = false; };
    openImportModal = () => { this.isImportModalOpen = true; };
    closeImportModal = () => { this.isImportModalOpen = false; if (this.importUrl) this.importUrl = null; };
    openRevisionsModal = () => { this.isRevisionsModalOpen = true; this.fetchRevisions(); };
    closeRevisionsModal = () => { this.isRevisionsModalOpen = false; };
    closeLinkSelectionModal = () => { this.isLinkSelectionModalOpen = false; this.itemForLinkSelection = null; };
    openEpisodesDrawer = () => { this.isEpisodesDrawerOpen = true; };
    closeEpisodesDrawer = () => { this.isEpisodesDrawerOpen = false; };
    setIntroSkippableOnSlave = (isSkippable: boolean) => { this.isIntroSkippableOnSlave = isSkippable; };
    clearRemoteSelectedItem = () => { this.remoteSelectedItem = null; };
    setExpandedLinkAccordionId = (id: number | false) => { this.expandedLinkAccordionId = id; };
    
    // Getters
    get isLoggedIn() { return !!this.googleUser; }
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
    get allMovies() { return [...this.latestMovies].sort((a,b) => (b.release_date || '').localeCompare(a.release_date || '')); }
    get currentShow() { return this.nowPlayingShowDetails; }
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
    get myListItems() { return this.myList.map(id => this.cachedItems.get(id)).filter((item): item is MediaItem => !!item); }
    get continueWatchingItems(): PlayableItem[] {
        const sortedProgress = Array.from(this.episodeProgress.values())
            .filter(p => !p.watched && p.currentTime > 0)
            .sort((a, b) => b.currentTime - a.currentTime); // This is not perfect, needs last watched timestamp

        return sortedProgress.map(p => {
            const ep = this.findEpisodeById(p.episodeId);
            if (!ep) return null;
            return { ...ep, startTime: p.currentTime };
// FIX: A type predicate's type must be assignable to its parameter's type. Removed the predicate and added a cast.
        }).filter(item => !!item) as PlayableItem[];
    }
    get homePageRows() {
        const rows = [
            ...(this.continueWatchingItems.length > 0 ? [{ titleKey: 'misc.continueWatching', items: this.continueWatchingItems as MediaItem[] }] : []),
            ...(this.myListItems.length > 0 ? [{ titleKey: 'misc.myList', items: this.myListItems }] : []),
        ];

        switch (this.activeTheme) {
            case 'Film':
                rows.push({ titleKey: 'misc.latestReleases', items: this.latestMovies });
                rows.push({ titleKey: 'misc.topRated', items: this.trending });
                rows.push({ titleKey: 'misc.popularSeries', items: this.topSeries });
                rows.push({ titleKey: 'misc.mustWatchAnime', items: this.popularAnime });
                break;
            case 'Anime':
                rows.push({ titleKey: 'misc.mustWatchAnime', items: this.popularAnime });
                rows.push({ titleKey: 'misc.topRated', items: this.trending });
                rows.push({ titleKey: 'misc.popularSeries', items: this.topSeries });
                rows.push({ titleKey: 'misc.latestReleases', items: this.latestMovies });
                break;
            case 'SerieTV':
            default:
                rows.push({ titleKey: 'misc.popularSeries', items: this.topSeries });
                rows.push({ titleKey: 'misc.topRated', items: this.trending });
                rows.push({ titleKey: 'misc.latestReleases', items: this.latestMovies });
                rows.push({ titleKey: 'misc.mustWatchAnime', items: this.popularAnime });
                break;
        }
        
        return rows;
    }
    get shareableShows() {
        return Array.from(this.cachedItems.values()).filter(item => item.media_type === 'tv' && this.hasLinks(item.id));
    }

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
        const [myListItems, cachedItems, mediaLinks, introDurations, language, progress, preferredSources, username, activeTheme] = await Promise.all([
            db.myList.orderBy('order').toArray(),
            db.cachedItems.toArray(),
            db.mediaLinks.toArray(),
            db.showIntroDurations.toArray(),
            db.preferences.get('language'),
            db.episodeProgress.toArray(),
            db.preferredSources.toArray(),
            db.preferences.get('username'),
            db.preferences.get('activeTheme'),
        ]);
        runInAction(() => {
            this.myList = myListItems.map(item => item.id);
            this.cachedItems = new Map(cachedItems.map(item => [item.id, item]));
            
            const linksMap = new Map<number, MediaLink[]>();
            mediaLinks.forEach(link => {
                const links = linksMap.get(link.mediaId) || [];
                links.push(link);
                linksMap.set(link.mediaId, links);
            });
            this.mediaLinks = linksMap;
            
            this.showIntroDurations = new Map(introDurations.map(item => [item.id, item.duration]));
            if (language?.value) this.language = language.value;
            if (activeTheme?.value) this.activeTheme = activeTheme.value;
            this.episodeProgress = new Map(progress.map(p => [p.episodeId, p]));
            this.preferredSources = new Map(preferredSources.map(p => [p.showId, p.origin]));
            if (username?.value) this.username = username.value;
        });
    }

    selectMedia = async (item: MediaItem, openModal = true) => {
        const isForWatchTogether = !openModal;
        if (openModal) {
            this.selectedItem = item;
            this.isDetailLoading = true;
        } else {
            this.watchTogetherSelectedItem = item;
        }
        
        try {
            // If the selected item for Watch Together changes, clear the now playing item
            // to ensure the playback check triggers correctly when details are loaded.
            if (isForWatchTogether && this.watchTogetherSelectedItem?.id !== item.id) {
                this.nowPlayingItem = null;
            }

            if (item.media_type === 'tv' && (!item.seasons || item.seasons.some(s => s.episodes.length === 0))) {
                const fullDetails = await getSeriesDetails(item.id);
                const seasonsWithEpisodes = await Promise.all(
                    fullDetails.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(item.id, season.season_number);
                        const episodesWithLinks = await Promise.all(episodes.map(async ep => {
                            const links = await this.getLinksForMedia(ep.id);
                            return { ...ep, video_urls: links, video_url: links[0]?.url };
                        }));
                        return { ...season, episodes: episodesWithLinks };
                    }) || []
                );
                const itemWithEpisodes = { ...fullDetails, seasons: seasonsWithEpisodes };
                
                await db.cachedItems.put(itemWithEpisodes);

                runInAction(() => {
                    this.cachedItems.set(item.id, itemWithEpisodes);
                    if (this.selectedItem?.id === item.id) this.selectedItem = itemWithEpisodes;
                    if (this.watchTogetherSelectedItem?.id === item.id) this.watchTogetherSelectedItem = itemWithEpisodes;

                    // If joining a room that's already playing, start playback now that we have details.
                    if (isForWatchTogether && this.roomId && !this.isHost && !this.nowPlayingItem && this.playbackState.status === 'playing') {
                        this.startPlayback(itemWithEpisodes);
                    }
                });
            } else if (item.media_type === 'movie' && !item.video_urls) {
                const links = await this.getLinksForMedia(item.id);
                const updatedItem = { ...item, video_urls: links, video_url: links[0]?.url };

                await db.cachedItems.put(updatedItem);
                
                runInAction(() => {
                    this.cachedItems.set(item.id, updatedItem);
                    if (this.selectedItem?.id === item.id) this.selectedItem = updatedItem;
                    
                    // Same check for movies
                    if (isForWatchTogether && this.roomId && !this.isHost && !this.nowPlayingItem && this.playbackState.status === 'playing') {
                        this.startPlayback(updatedItem);
                    }
                });
            }
        } catch (error) {
            console.error("Failed to load details", error);
            this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
        } finally {
            runInAction(() => {
                this.isDetailLoading = false;
            });
        }
    }

    toggleMyList = (item: MediaItem) => {
        const itemId = item.id;
        if (this.myList.includes(itemId)) {
            this.myList = this.myList.filter(id => id !== itemId);
            db.myList.delete(itemId);
        } else {
            this.myList.push(itemId);
            db.myList.put({ id: itemId, order: this.myList.length });
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
        
        const itemsToUpdate = this.myList.map((id, index) => ({ id, order: index }));
        await db.myList.bulkPut(itemsToUpdate);
    }
    
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
        const { episodeId, currentTime, duration } = progress;
        if (duration > 0) {
            const watched = currentTime / duration > 0.9;
            const existing = this.episodeProgress.get(episodeId);
            if (!existing || existing.currentTime < currentTime || watched !== existing.watched) {
                const newProgress = { episodeId, currentTime, duration, watched };
                this.episodeProgress.set(episodeId, newProgress);
                db.episodeProgress.put(newProgress);
            }
        }
    }
    
    toggleEpisodeWatchedStatus = async (episodeId: number) => {
        const existingProgress = this.episodeProgress.get(episodeId);
    
        if (existingProgress?.watched) {
            // Mark as unwatched
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
            // Mark as watched
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
    
    setShowIntroDuration = (showId: number, duration: number) => {
        this.showIntroDurations.set(showId, duration);
        db.showIntroDurations.put({ id: showId, duration });
    }
    
    openLinkEpisodesModal = (item: MediaItem) => { this.linkingEpisodesForItem = item; this.isLinkEpisodesModalOpen = true; };
    closeLinkEpisodesModal = () => { this.isLinkEpisodesModalOpen = false; this.linkingEpisodesForItem = null; };
    openLinkMovieModal = (item: MediaItem) => { this.linkingMovieItem = item; this.isLinkMovieModalOpen = true; };
    closeLinkMovieModal = () => { this.isLinkMovieModalOpen = false; this.linkingMovieItem = null; };

    setEpisodeLinksForSeason = async (payload: { seasonNumber: number; method: string; data: any; }) => {
        const { seasonNumber, method, data } = payload;
        const show = this.linkingEpisodesForItem;
        if (!show) return;

        const season = show.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        let linksToAdd: Omit<MediaLink, 'id'>[] = [];
        try {
            switch (method) {
                case 'pattern':
                    for (let i = 1; i <= season.episode_count; i++) {
                        const epNum = String(i).padStart(data.padding, '0');
                        const ep = season.episodes.find(e => e.episode_number === i);
                        if(ep) {
                            linksToAdd.push({
                                mediaId: ep.id,
                                url: data.pattern.replace('[@EP]', epNum),
                                label: data.label.replace('[@EP]', epNum) || `Episodio ${i}`
                            });
                        }
                    }
                    break;
                case 'list':
                    const urls = data.list.split('\n').filter((u: string) => u.trim());
                    if (urls.length !== season.episode_count) {
                        this.showSnackbar('notifications.linkCountMismatch', 'error', true, { linkCount: urls.length, episodeCount: season.episode_count });
                        return;
                    }
                    season.episodes.forEach((ep, index) => {
                        linksToAdd.push({ mediaId: ep.id, url: urls[index], label: new URL(urls[index]).hostname });
                    });
                    break;
                case 'json':
                    const parsedJson = JSON.parse(data.json);
                    if (!Array.isArray(parsedJson)) throw new Error('JSON must be an array.');
                    if (parsedJson.length !== season.episode_count) {
                       this.showSnackbar('notifications.linkCountMismatch', 'error', true, { linkCount: parsedJson.length, episodeCount: season.episode_count });
                       return;
                    }
                    season.episodes.forEach((ep, index) => {
                        const item = parsedJson[index];
                        if (typeof item === 'string') {
                            linksToAdd.push({ mediaId: ep.id, url: item, label: new URL(item).hostname });
                        } else if (typeof item === 'object' && item.url) {
                            linksToAdd.push({ mediaId: ep.id, url: item.url, label: item.label || new URL(item.url).hostname });
                        }
                    });
                    break;
            }

            // Automatically set the first source as preferred if none is set for this show
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
            this.showSnackbar('notifications.linksAddedSuccess', 'success', true, { count: linksToAdd.length });

        } catch (error) {
            console.error(error);
            this.showSnackbar('notifications.processingError', 'error', true, { error: (error as Error).message });
        }
    }
    
    addLinksToMedia = async (mediaId: number, links: { url: string, label: string }[]) => {
        try {
            const linksToAdd: Omit<MediaLink, 'id'>[] = links.map(link => ({
                mediaId, url: link.url, label: link.label || new URL(link.url).hostname,
            }));
            
            // Automatically set the first source as preferred if none is set
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
        const link = await db.mediaLinks.get(linkId);
        if(link) {
            await db.mediaLinks.delete(linkId);
            await this.refreshLinksForMediaId(link.mediaId);
        }
    }

    clearLinksForSeason = async (seasonNumber: number, showId: number) => {
        const show = this.cachedItems.get(showId);
        const season = show?.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(ep => ep.id);
        const linksToDelete = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();
        if (linksToDelete.length > 0) {
            await db.mediaLinks.bulkDelete(linksToDelete.map(l => l.id!));
            await this.refreshLinksForShow(showId);
            this.showSnackbar('notifications.allSeasonLinksDeleted', 'success', true, { count: linksToDelete.length, season: seasonNumber });
        } else {
             this.showSnackbar('notifications.noLinksToDelete', 'warning', true, { season: seasonNumber });
        }
    }
    
    updateLinksDomain = async (payload: { links: MediaLink[], newDomain: string }) => {
        const { links, newDomain } = payload;
        try {
            const updatedLinks = links.map(link => {
                const url = new URL(link.url);
                const newUrl = new URL(url.pathname + url.search, newDomain);
                return { ...link, url: newUrl.toString() };
            });
            await db.mediaLinks.bulkPut(updatedLinks);
            if (this.linkingEpisodesForItem) {
                await this.refreshLinksForShow(this.linkingEpisodesForItem.id);
            }
            this.showSnackbar('notifications.linksUpdated', 'success', true, { count: updatedLinks.length });
        } catch (error) {
            this.showSnackbar('notifications.domainUpdateError', 'error', true, { error: (error as Error).message });
        }
    }
    
    setPreferredSource = async (showId: number, origin: string) => {
        const current = this.preferredSources.get(showId);
        if (current === origin) { // If clicking the same one, unset it
            this.preferredSources.delete(showId);
            await db.preferredSources.delete(showId);
        } else {
            this.preferredSources.set(showId, origin);
            await db.preferredSources.put({ showId, origin });
            this.showSnackbar('notifications.preferredSourceSet', 'success', true);
        }
    }
    
    openWatchTogetherModal = (item: MediaItem | PlayableItem | null) => {
        this.watchTogetherError = null;
        if (item) {
            this.selectMedia(item as MediaItem, false);
            if (item && 'media_type' in item && item.media_type === 'movie') {
                 this.watchTogetherSelectedItem = item;
// FIX: Property 'seasons' does not exist on type '...'. Added a type guard to check for media_type 'tv' first.
            } else if ('media_type' in item && item.media_type === 'tv' && (!item.seasons || item.seasons.length === 0)) {
                 this.selectMedia(item as MediaItem, false); // Fetch details first
            }
        }
        this.watchTogetherModalOpen = true;
    };
    
    closeWatchTogetherModal = () => {
        this.watchTogetherModalOpen = false;
        if (this.roomId) {
            websocketService.sendMessage({ type: 'quix-leave-room' });
            this.roomId = null;
        }
    };
    
    createRoom = (username: string) => {
        this.username = username;
        db.preferences.put({ key: 'username', value: username });
        if(this.watchTogetherSelectedItem) {
            websocketService.sendMessage({ type: 'quix-create-room', payload: { username, media: this.watchTogetherSelectedItem }});
        }
    };

    joinRoom = (roomId: string, username: string) => {
        this.username = username;
        db.preferences.put({ key: 'username', value: username });
        websocketService.sendMessage({ type: 'quix-join-room', payload: { roomId: roomId.toUpperCase(), username } });
    };

    changeWatchTogetherMedia = (item: PlayableItem) => {
        this.watchTogetherSelectedItem = item;
        if (this.isHost) {
            websocketService.sendMessage({ type: 'quix-select-media', payload: { media: item }});
        }
    };
    
    changeRoomCode = () => { websocketService.sendMessage({ type: 'quix-change-room-code' }); };

    connectAsRemoteMaster = (slaveId: string) => {
        runInAction(() => {
            websocketService.sendMessage({ type: 'quix-register-master', payload: { slaveId } });
            this.isRemoteMaster = true;
            // FIX: Store the ID of the TV we are controlling to send commands to it later.
            this.slaveId = slaveId;
            this.isQRScannerOpen = false; // Close scanner on successful scan
            this.showSnackbar('notifications.connectedToTV', 'success', true);
        });
    };

    setRemoteSelectedItem = (item: MediaItem) => {
        this.remoteSelectedItem = item;
        // Pre-fetch details for the remote view
        this.selectMedia(item, false);
    };

    playRemoteItem = async (item: PlayableItem) => {
        // This method is called by the Master remote.
        // It needs to resolve the video URL before sending the command to the Slave.
        const playableItemWithUrl = { ...item };
    
        // If a URL is not already attached, resolve it.
        if (!playableItemWithUrl.video_url) {
            const mediaId = 'episode_number' in playableItemWithUrl ? playableItemWithUrl.id : playableItemWithUrl.id;
            const links = await this.getLinksForMedia(mediaId);
    
            if (links.length === 0) {
                this.showSnackbar("notifications.noVideoLinks", "warning", true);
                return;
            }
    
            const showId = 'show_id' in playableItemWithUrl ? playableItemWithUrl.show_id : playableItemWithUrl.id;
            const preferredSource = this.preferredSources.get(showId);
            const preferredLink = preferredSource ? links.find(l => l.url.startsWith(preferredSource)) : undefined;
    
            if (preferredLink) {
                playableItemWithUrl.video_url = preferredLink.url;
            } else {
                // No preference, just pick the first one for remote play.
                // We can't show a selection modal on the remote.
                playableItemWithUrl.video_url = links[0].url;
            }
        }
    
        if (playableItemWithUrl.video_url) {
            this.sendRemoteCommand({ command: 'play_item', item: playableItemWithUrl });
        } else {
            this.showSnackbar("notifications.noVideoLinks", "warning", true);
        }
    }

    sendRemoteCommand = (payload: any) => {
        // FIX: Cannot find name 'remoteSessions'. Logic rewritten to correctly send command from master to slave.
        // A remote control (master) sends commands to its connected TV (slave).
        if (this.isRemoteMaster && this.slaveId) {
            websocketService.sendMessage({ type: 'quix-remote-command', payload: { ...payload, slaveId: this.slaveId } });
        }
    };
    
    sendSlaveStatusUpdate = () => {
        if(this.isSmartTV && this.slaveId) {
            const video = document.querySelector('video');
            websocketService.sendMessage({
                type: 'quix-slave-status-update',
                payload: {
                    slaveId: this.slaveId,
                    isPlaying: this.isPlaying,
                    nowPlayingItem: this.nowPlayingItem,
                    isIntroSkippable: this.isIntroSkippableOnSlave,
                    currentTime: video?.currentTime,
                    duration: video?.duration
                }
            });
        }
    };

    stopRemotePlayback = () => {
        this.sendRemoteCommand({ command: 'stop' });
    };

    fetchRemoteFullItem = async () => {
        if (!this.remoteSlaveState?.nowPlayingItem) return;
        const item = this.remoteSlaveState.nowPlayingItem;
        const showId = 'show_id' in item ? item.show_id : item.id;

        this.isRemoteFullItemLoading = true;
        try {
            const fullDetails = await getSeriesDetails(showId);
            const seasonsWithEpisodes = await Promise.all(
                fullDetails.seasons?.map(async (season) => {
                    const episodes = await getSeriesEpisodes(showId, season.season_number);
                    const episodesWithLinks = await Promise.all(episodes.map(async ep => {
                        const links = await this.getLinksForMedia(ep.id);
                        return { ...ep, video_urls: links, video_url: links[0]?.url };
                    }));
                    return { ...season, episodes: episodesWithLinks };
                }) || []
            );
            runInAction(() => {
                this.remoteFullItem = { ...fullDetails, seasons: seasonsWithEpisodes };
            });
        } catch (error) {
            console.error("Failed to fetch full remote item details", error);
        } finally {
            runInAction(() => {
                this.isRemoteFullItemLoading = false;
            });
        }
    };
    
    handleRemoteCommand = (payload: any) => {
        const { command, item, time } = payload;
        const video = document.querySelector('video');
        if (!video) return;

        switch(command) {
            case 'play_item': this.startPlayback(item); break;
            case 'play': if (this.nowPlayingItem) this.isPlaying = true; video.play(); break;
            case 'pause': if (this.nowPlayingItem) this.isPlaying = false; video.pause(); break;
            case 'stop': this.stopPlayback(); break;
            case 'seek_forward': video.currentTime += 10; break;
            case 'seek_backward': video.currentTime -= 10; break;
            case 'seek_to': video.currentTime = time; break;
            case 'skip_intro': 
                if (this.nowPlayingItem && 'intro_end_s' in this.nowPlayingItem && this.nowPlayingItem.intro_end_s) {
                    video.currentTime = this.nowPlayingItem.intro_end_s;
                }
                break;
        }
        this.sendSlaveStatusUpdate();
    };

    generateShareableData = (showIds: number[]): SharedLibraryData => {
        const shows: SharedShowData[] = [];
        for (const showId of showIds) {
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
                            label: link.label
                        });
                    });
                }
            }
            if (links.length > 0) {
                shows.push({ tmdbId: showId, links });
            }
        }
        return { version: 1, shows };
    }

    importSharedLibrary = async (data: SharedLibraryData) => {
        this.isImportingLibrary = true;
        try {
            let totalLinksAdded = 0;
            const showIdsToAddToMyList: number[] = [];

            for (const showData of data.shows) {
                showIdsToAddToMyList.push(showData.tmdbId);

                // Ensure show details are in cache
                if (!this.cachedItems.has(showData.tmdbId)) {
                    await this.selectMedia({ id: showData.tmdbId, media_type: 'tv' } as MediaItem, false);
                }
                const show = this.cachedItems.get(showData.tmdbId);
                if (!show || !show.seasons) continue;

                // Prevent duplicate links
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
                            linksToAdd.push({ mediaId: episode.id, url: link.url, label: link.label });
                            existingLinkSet.add(linkIdentifier); // Avoid adding duplicates from within the same import file
                        }
                    }
                }
                if (linksToAdd.length > 0) {
                    await db.mediaLinks.bulkAdd(linksToAdd as MediaLink[]);
                    totalLinksAdded += linksToAdd.length;
                }
            }

            // Add imported shows to "My List"
            if (showIdsToAddToMyList.length > 0) {
                const itemsToAddToMyList = showIdsToAddToMyList
                    .filter(id => !this.myList.includes(id)) // Filter out duplicates
                    .map((id, index) => ({ id, order: this.myList.length + index }));
                
                if (itemsToAddToMyList.length > 0) {
                    await db.myList.bulkAdd(itemsToAddToMyList);
                    runInAction(() => {
                        this.myList.push(...itemsToAddToMyList.map(item => item.id));
                    });
                }
            }

            this.showSnackbar('notifications.importSuccess', 'success', true, { showCount: data.shows.length, linkCount: totalLinksAdded });
            setTimeout(() => window.location.reload(), 3000);
        } catch (error) {
            this.showSnackbar('notifications.importError', 'error', true, { error: (error as Error).message });
            this.isImportingLibrary = false;
        }
    }

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
                case 1: await table.delete(revision.key); break; // Revert create -> delete
                case 2: await table.put(revision.oldObj); break; // Revert update -> put old object
                case 3: await table.put(revision.obj); break; // Revert delete -> put object back
            }
            // Remove the revision itself
            if(revision.id) await db.revisions.delete(revision.id);
            this.showSnackbar('notifications.revertSuccess', 'success', true);
            this.fetchRevisions(); // Refresh list
        } catch(error) {
            this.showSnackbar('notifications.revertError', 'error', true, { error: (error as Error).message });
        }
    }

    triggerDebouncedBackup = () => {
        if (this.backupDebounceTimer) clearTimeout(this.backupDebounceTimer);
        this.backupDebounceTimer = window.setTimeout(async () => {
            if (this.isLoggedIn) {
                const newFile = await this.backupToDrive();
                if (newFile) {
                    await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
                }
            }
        }, 30000); // 30-second debounce
    };

    setGoogleUser = async (user: GoogleUser | null) => { 
        this.googleUser = user;
        if(user) {
            this.showSnackbar('notifications.welcomeUser', 'success', true, { name: user.name });
        } else {
            this.showSnackbar('notifications.logoutSuccess', 'info', true);
        }
    };
    
    // Private helpers
// FIX: Modified findEpisodeById to return an object that is structurally compatible with MediaItem for use in ContentRow/Card components.
    private findEpisodeById(episodeId: number): (Episode & { show_id: number, show_title: string, backdrop_path: string, season_number: number, poster_path: string, title: string, media_type: 'tv', name: string }) | null {
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
                            // Make it MediaItem-like for Card component
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

    private hasLinks(showId: number): boolean {
        const item = this.cachedItems.get(showId);
        if (!item || !item.seasons) return false;
        return item.seasons.some(s => s.episodes.some(ep => this.mediaLinks.has(ep.id)));
    }

    private async getLinksForMedia(mediaId: number): Promise<MediaLink[]> {
        let links = this.mediaLinks.get(mediaId);
        if(!links) {
            links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
            this.mediaLinks.set(mediaId, links);
        }
        return links;
    }

    private async refreshLinksForMediaId(mediaId: number) {
        const links = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
        runInAction(() => {
            this.mediaLinks.set(mediaId, links);
            // This is complex because we don't know which show this episode belongs to without searching.
            // A full refresh of the selected item is safer.
            if (this.linkingEpisodesForItem) this.refreshLinksForShow(this.linkingEpisodesForItem.id);

            // Also refresh the movie item if it's the one being linked
            if (this.linkingMovieItem?.id === mediaId) {
                // By creating a new object, we ensure MobX detects the change and re-renders the observer component.
                this.linkingMovieItem = { ...this.linkingMovieItem, video_urls: links };
            }
        });
    }

    private async refreshLinksForShow(showId: number) {
        const show = this.cachedItems.get(showId);
        if (!show || !show.seasons) return;
        
        for (const season of show.seasons) {
            for (const episode of season.episodes) {
                const links = await db.mediaLinks.where('mediaId').equals(episode.id).toArray();
                this.mediaLinks.set(episode.id, links);
                episode.video_urls = links;
            }
        }
        
        // Force a re-render by creating a new object for the selected item
        if (this.linkingEpisodesForItem?.id === showId) {
             runInAction(() => {
                this.linkingEpisodesForItem = { ...this.linkingEpisodesForItem, seasons: show.seasons };
             });
        }
    }

    // FIX: Add private translation method for use inside the store.
    private t = (key: string, values?: Record<string, any>): string => {
        const translatedString = getNestedValue(this.translations, key);
        if (translatedString) {
            return values ? interpolate(translatedString, values) : translatedString;
        }
        console.warn(`[Translation] Missing key: "${key}" for language: "${this.language}"`);
        return key;
    }

    private async enrichRevisionsWithContext(revs: Revision[]) {
        for (const rev of revs) {
            rev.icon = rev.type === 1 ? 'add' : rev.type === 2 ? 'update' : 'delete';
            const obj = rev.obj || rev.oldObj;
            if (!obj) continue;

            try {
                switch(rev.table) {
                    case 'myList':
                        const myListItem = this.cachedItems.get(obj.id);
                        // FIX: Cannot find name 't'. Use internal translation method.
                        rev.description = this.t('revisions.descriptions.myList.' + (rev.type === 1 ? 'add' : 'remove'), { name: myListItem?.name || obj.id });
                        break;
                    case 'mediaLinks':
                         const context = await this.findEpisodeContext(obj.mediaId);
                         if (context) {
                             // FIX: Cannot find name 't'. Use internal translation method.
                             rev.description = this.t('revisions.descriptions.episodeLinks.' + (rev.type === 1 ? 'add' : rev.type === 2 ? 'update' : 'remove'), context);
                         }
                        break;
                    case 'showIntroDurations':
                        const show = this.cachedItems.get(obj.id);
                        // FIX: Cannot find name 't'. Use internal translation method.
                        rev.description = this.t('revisions.descriptions.showIntroDurations.' + (rev.type === 1 || rev.type === 2 ? 'set' : 'remove'), { show: show?.name || obj.id, duration: obj.duration });
                        break;
                }
            } catch (e) { console.warn("Error enriching revision", e); }
        }
    }

    private async findEpisodeContext(episodeId: number): Promise<any> {
        if(this.episodeContextMap.has(episodeId)) return this.episodeContextMap.get(episodeId);
        
        for (const show of this.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    const episode = season.episodes.find(ep => ep.id === episodeId);
                    if (episode) {
                        // FIX: Property 'epNum' is missing. Renamed 'eNum' to 'epNum'.
                        const context = { showName: show.name, sNum: season.season_number, epNum: episode.episode_number, epName: episode.name };
                        this.episodeContextMap.set(episodeId, context);
                        return context;
                    }
                }
            }
        }
        return null; // Should fetch if not found, but this is for UI display, so fail silently.
    }
    
    // Websocket and remote control methods
    addDebugMessage = (message: string) => { if (this.debugMessages.length > 100) { this.debugMessages.shift(); } this.debugMessages.push(`[${new Date().toLocaleTimeString()}] ${message}`); };
    initRemoteSession = () => { if (this.isSmartTV) { websocketService.sendMessage({ type: 'quix-register-slave' }); } };
    handleIncomingMessage = (message: any) => { runInAction(() => {
        const { type, payload } = message;
        this.addDebugMessage(`IN: ${type} ${JSON.stringify(payload || {})}`);
        switch (type) {
            case 'quix-slave-registered': this.slaveId = payload.slaveId; this.showSnackbar('notifications.tvReady', 'info', true); break;
            case 'quix-master-connected': this.isRemoteMasterConnected = true; this.showSnackbar('notifications.remoteConnected', 'success', true); break;
            case 'quix-room-update':
                this.roomId = payload.roomId;
                this.hostId = payload.hostId;
                this.participants = payload.participants;
                this.playbackState = payload.playbackState;
                this.chatHistory = payload.chatHistory;
                this.isHost = payload.isHost;
                this.myClientId = websocketService.clientId;
                if (payload.selectedMedia) {
                    const existing = this.cachedItems.get(payload.selectedMedia.id);
                    if (existing) {
                        this.watchTogetherSelectedItem = payload.selectedMedia;
                        this.selectMedia(existing, false);
                    } else { // If not cached, fetch it
                        this.selectMedia(payload.selectedMedia, false);
                    }
                }
                break;
            case 'quix-playback-update': 
                this.playbackState = payload.playbackState; 
                this.playbackListeners.forEach(l => l(this.playbackState)); 
                // If we are in a room, not the host, and not currently playing, this update means the host has started playback.
                if (this.roomId && !this.isHost && !this.nowPlayingItem && this.watchTogetherSelectedItem && payload.playbackState.status === 'playing') {
                    this.startPlayback(this.watchTogetherSelectedItem);
                }
                break;
            case 'quix-error': this.watchTogetherError = payload.message; break;
            case 'quix-remote-command-received': this.handleRemoteCommand(payload); break;
            case 'quix-slave-status-update': this.remoteSlaveState = payload; break;
        }
    }); };
    sendPlaybackControl = (state: PlaybackState) => { if (this.roomId) { websocketService.sendMessage({ type: 'quix-playback-control', payload: { playbackState: state } }); } };
    addPlaybackListener = (listener: (state: PlaybackState) => void) => { this.playbackListeners.push(listener); return () => { this.playbackListeners = this.playbackListeners.filter(l => l !== listener); }; };
    sendChatMessage = (message: { text?: string; image?: string; }) => { websocketService.sendMessage({ type: 'quix-chat-message', payload: { message } }); };
    transferHost = (newHostId: string) => { websocketService.sendMessage({ type: 'quix-transfer-host', payload: { newHostId } }); };
}
export const mediaStore = new MediaStore();