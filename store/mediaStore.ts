import {makeAutoObservable, runInAction} from 'mobx';
import type {ChatMessage, Episode, MediaItem, PlayableItem, ViewingHistoryItem, GoogleUser, EpisodeLink, SharedLibraryData, SharedShowData, SharedEpisodeLink, Revision, EpisodeProgress} from '../types';
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
import { initGoogleAuth } from '../services/googleAuthService';
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
}

const allTranslations = { it, en };

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


    // Episode Linking State
    episodeLinks: Map<number, EpisodeLink[]> = new Map();
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem: MediaItem | null = null;
    isLinkSelectionModalOpen = false;
    itemForLinkSelection: PlayableItem | null = null;
    linksForSelection: EpisodeLink[] = [];
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
    private episodeContextMap: Map<number, { showName: string, epNum: number, sNum: number, epName: string }> = new Map();


    // Custom Intro Durations
    showIntroDurations: Map<number, number> = new Map();

    // Theme state
    activeTheme: ThemeName = 'SerieTV';

    // Snackbar State
    snackbarMessage: { message: string, severity: AlertColor, action?: { label: string, onClick: () => void }, isTranslationKey?: boolean, translationValues?: Record<string, any> } | null = null;

    // Debug Mode State
    debugMessages: string[] = [];

    // Google Auth & Sync State
    googleUser: GoogleUser | null = null;
    isBackingUp = false;
    isRestoring = false;
    
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
        initGoogleAuth();
    }

    showSnackbar = (message: string, severity: AlertColor = 'info', isTranslationKey = false, translationValues?: Record<string, any>) => {
        this.snackbarMessage = { message, severity, isTranslationKey, translationValues };
    }

    showSnackbarWithAction = (message: string, severity: AlertColor, actionLabel: string, onActionClick: () => void) => {
        this.snackbarMessage = { message, severity, action: { label: actionLabel, onClick: onActionClick }, isTranslationKey: true };
    }

    hideSnackbar = () => {
        this.snackbarMessage = null;
    }

    addDebugMessage = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('it-IT');
        const fullMessage = `[${timestamp}] ${message}`;
        runInAction(() => {
            this.debugMessages.push(fullMessage);
            if (this.debugMessages.length > 50) {
                this.debugMessages.shift();
            }
        });
    }

    loadPersistedData = async () => {
        try {
            const [
                myListFromDb,
                viewingHistoryFromDb,
                cachedItemsFromDb,
                episodeLinksFromDb,
                introDurationsFromDb,
                themePreference,
                languagePreference,
                episodeProgressFromDb,
            ] = await Promise.all([
                db.myList.toArray(),
                db.viewingHistory.orderBy('watchedAt').reverse().limit(100).toArray(),
                db.cachedItems.toArray(),
                db.episodeLinks.toArray(),
                db.showIntroDurations.toArray(),
                db.preferences.get('activeTheme'),
                db.preferences.get('language'),
                db.episodeProgress.toArray(),
            ]);

            runInAction(() => {
                this.myList = myListFromDb.map(item => item.id);
                this.viewingHistory = viewingHistoryFromDb;
                this.cachedItems = new Map(cachedItemsFromDb.map(item => [item.id, item]));

                const linksMap = new Map<number, EpisodeLink[]>();
                episodeLinksFromDb.forEach(link => {
                    if (!linksMap.has(link.episodeId)) {
                        linksMap.set(link.episodeId, []);
                    }
                    linksMap.get(link.episodeId)!.push(link);
                });
                this.episodeLinks = linksMap;
                
                this.showIntroDurations = new Map(introDurationsFromDb.map(item => [item.id, item.duration]));
                
                this.episodeProgress = new Map(episodeProgressFromDb.map(p => [p.episodeId, p]));

                if (themePreference) {
                    this.activeTheme = themePreference.value;
                }
                if (languagePreference) {
                    this.language = languagePreference.value;
                }
            });
        } catch (error) {
            console.error("Failed to load persisted data from Dexie.", error);
        }
    }
    
    setLanguage = async (lang: Language) => {
        if (this.language === lang) return;
        this.language = lang;
        try {
            await db.preferences.put({ key: 'language', value: lang });
        } catch (error) {
            console.error("Failed to save language preference", error);
        }
    }


    setActiveTheme = async (theme: ThemeName) => {
        this.activeTheme = theme;
        try {
            await db.preferences.put({ key: 'activeTheme', value: theme });
        } catch (error) {
            console.error("Failed to save theme preference", error);
        }
    }

    initRemoteSession = () => {
        const params = new URLSearchParams(window.location.search);
        const remoteForId = params.get('remote_for');

        if (remoteForId) {
            runInAction(() => {
                this.isRemoteMaster = true;
                this.slaveId = remoteForId;
            });
            websocketService.sendMessage({type: 'quix-register-master', payload: {slaveId: remoteForId}});
        } else if (this.isSmartTV) {
            websocketService.sendMessage({type: 'quix-register-slave'});
        }
    }

    transferHost = (newHostId: string) => {
        if (this.roomId && this.isHost) {
            websocketService.sendMessage({
                type: 'quix-transfer-host',
                payload: {roomId: this.roomId, newHostId}
            });
        }
    }

    addPlaybackListener = (listener: (state: PlaybackState) => void) => {
        this.playbackListeners.push(listener);
        return () => {
            this.playbackListeners = this.playbackListeners.filter(l => l !== listener);
        };
    }

    handleIncomingMessage = (message: any) => {
        runInAction(() => {
            if (message.type === 'connected' && message.payload?.clientId) {
                this.myClientId = message.payload.clientId;
            }

            switch (message.type) {
                case 'quix-room-update': {
                    this.roomId = message.payload.roomId;
                    this.hostId = message.payload.hostId;
                    this.isHost = message.payload.isHost;
                    this.participants = message.payload.participants;
                    this.chatHistory = message.payload.chatHistory ?? [];
                    this.watchTogetherError = null;

                    this.playbackState = message.payload.playbackState;
                    const newMedia = message.payload.selectedMedia;
                    this.watchTogetherSelectedItem = newMedia;

                    // FIX: Prevent host from being sent to player on room creation.
                    // If the user just created the room and is the host, we keep them in the modal.
                    if (this.isCreatingRoom && this.isHost) {
                        this.showSnackbar('notifications.roomCreated', 'success', true);
                        this.isCreatingRoom = false; // Reset the flag
                        return; // Exit here to prevent setting nowPlayingItem
                    }
                    
                    if (newMedia) {
                        this.nowPlayingItem = newMedia;
                        this.isPlaying = this.playbackState.status === 'playing';
                        
                        let showIdToLoad: number | null = null;
                        let mediaType: 'tv' | 'movie' = 'movie';

                        if ('show_id' in newMedia) {
                            showIdToLoad = newMedia.show_id;
                            mediaType = 'tv';
                        } else {
                            showIdToLoad = newMedia.id;
                            mediaType = newMedia.media_type;
                        }
                        
                        if (this.selectedItem?.id !== showIdToLoad) {
                            const partialItem: MediaItem = { id: showIdToLoad, media_type: mediaType } as MediaItem;
                            this.selectMedia(partialItem);
                        }
                    }
                    break;
                }
                case 'quix-playback-update':
                    if (this.roomId) {
                        this.playbackState = message.payload.playbackState;
                        this.isPlaying = this.playbackState.status === 'playing';
                        if (this.isPlaying && !this.nowPlayingItem) {
                            this.nowPlayingItem = this.watchTogetherSelectedItem;
                        }
                        this.playbackListeners.forEach(l => l(this.playbackState));
                    }
                    break;
                case 'quix-error':
                    this.watchTogetherError = message.payload.message;
                    this.username = null; // force user to re-enter username
                    break;

                // Remote Control Messages
                case 'quix-slave-registered':
                    this.slaveId = message.payload.slaveId;
                    this.showSnackbar('notifications.tvReady', 'info', true);
                    break;
                case 'quix-master-connected':
                    this.isRemoteMasterConnected = true;
                    this.isSmartTVPairingVisible = false; // Hide QR code screen on TV
                    if (this.isRemoteMaster) {
                        this.showSnackbar('notifications.connectedToTV', 'success', true);
                    } else if (this.isSmartTV) {
                        this.showSnackbar('notifications.remoteConnected', 'success', true);
                    }
                    break;
                case 'quix-remote-command-received':
                    this.handleRemoteCommand(message.payload);
                    break;
                case 'quix-slave-status-update':
                    if (this.isRemoteMaster) {
                        this.remoteSlaveState = message.payload;
                    }
                    break;
            }
        });
    };

    private handleRemoteCommand(payload: { command: string, item?: PlayableItem }) {
        if (this.isSmartTV) {
            switch (payload.command) {
                case 'select_media':
                    if (payload.item) this.startPlayback(payload.item);
                    break;
                case 'play':
                    if (this.nowPlayingItem && !this.isPlaying) {
                        this.isPlaying = true; // this will trigger the video player to play
                    }
                    break;
                case 'pause':
                    if (this.nowPlayingItem && this.isPlaying) {
                        this.isPlaying = false; // this will trigger the video player to pause
                    }
                    break;
                case 'seek_forward':
                    this.remoteAction = { type: 'seek', payload: 10, id: Date.now() };
                    break;
                case 'seek_backward':
                     this.remoteAction = { type: 'seek', payload: -10, id: Date.now() };
                    break;
                case 'toggle_fullscreen':
                    this.remoteAction = { type: 'fullscreen', id: Date.now() };
                    break;
                case 'skip_intro':
                    this.remoteAction = { type: 'skip_intro', id: Date.now() };
                    break;
                case 'stop':
                    this.stopPlayback();
                    break;
            }
        }
    }
    
    clearRemoteAction = () => {
        this.remoteAction = null;
    };

    sendSlaveStatusUpdate = () => {
        if (this.isSmartTV && this.isRemoteMasterConnected) {
            let itemToSend: PlayableItem | null = this.nowPlayingItem;
            if (itemToSend && 'seasons' in itemToSend) {
                // Don't send bulky season data over the wire
                const { seasons, ...rest } = itemToSend;
                itemToSend = rest as MediaItem;
            }
            websocketService.sendMessage({
                type: 'quix-slave-status-update',
                payload: {
                    slaveId: this.slaveId,
                    isPlaying: this.isPlaying,
                    nowPlayingItem: itemToSend,
                    isIntroSkippable: this.isIntroSkippableOnSlave,
                }
            });
        }
    }

    sendRemoteCommand = (payload: { command: string, item?: PlayableItem }) => {
        if (this.isRemoteMaster && this.slaveId) {
            websocketService.sendMessage({
                type: 'quix-remote-command',
                payload: {
                    ...payload,
                    slaveId: this.slaveId
                }
            })
        }
    }

    playRemoteItem = (item: PlayableItem) => {
        this.sendRemoteCommand({ command: 'select_media', item });
        
        // Optimistically update state for immediate UI transition
        if (!this.remoteSlaveState) {
            this.remoteSlaveState = { isPlaying: true, nowPlayingItem: item };
        } else {
            this.remoteSlaveState.isPlaying = true;
            this.remoteSlaveState.nowPlayingItem = item;
        }
        
        // Clear the detail view item to allow the player view to take over
        this.remoteSelectedItem = null;
    }
    
    stopRemotePlayback = () => {
        this.sendRemoteCommand({ command: 'stop' });
        if (this.remoteSlaveState) {
            this.remoteSlaveState.nowPlayingItem = null;
            this.remoteSlaveState.isPlaying = false;
        }
        this.remoteFullItem = null;
    }

    fetchRemoteFullItem = async () => {
        const nowPlaying = this.remoteSlaveState?.nowPlayingItem;

        if (nowPlaying && 'show_id' in nowPlaying) {
            const showId = nowPlaying.show_id;

            // Avoid refetching if we already have it and it's fully loaded with seasons
            if (this.remoteFullItem?.id === showId && this.remoteFullItem.seasons && this.remoteFullItem.seasons.length > 0) {
                return;
            }

            this.isRemoteFullItemLoading = true;
            try {
                const seriesDetails = await getSeriesDetails(showId);
                const seasonsWithEpisodes = await Promise.all(
                    seriesDetails.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(showId, season.season_number);
                        return { ...season, episodes };
                    }) ?? []
                );
                const fullItem = { ...seriesDetails, seasons: seasonsWithEpisodes };
                
                // Apply locally stored video links
                this.applyEpisodeLinksToMedia([fullItem]);
                
                runInAction(() => {
                    this.remoteFullItem = fullItem;
                });
            } catch (error) {
                console.error("Failed to fetch full details for remote player", error);
                runInAction(() => {
                    this.remoteFullItem = null;
                });
            } finally {
                runInAction(() => {
                    this.isRemoteFullItemLoading = false;
                });
            }
        } else if (nowPlaying && 'media_type' in nowPlaying) {
            runInAction(() => {
                this.remoteFullItem = nowPlaying as MediaItem;
            });
        } else {
            runInAction(() => {
                this.remoteFullItem = null;
            });
        }
    }

    setRemoteSelectedItem = async (item: MediaItem) => {
        this.remoteSelectedItem = item;
        if (item.media_type === 'tv') {
            this.isRemoteDetailLoading = true;
            try {
                const seriesDetails = await getSeriesDetails(item.id);
                const seasonsWithEpisodes = await Promise.all(
                    seriesDetails.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(item.id, season.season_number);
                        return { ...season, episodes };
                    }) ?? []
                );
                runInAction(() => {
                    const fullItem = { ...seriesDetails, seasons: seasonsWithEpisodes };
                    this.applyEpisodeLinksToMedia([fullItem]);
                    this.remoteSelectedItem = fullItem;
                });
            } catch (error) {
                console.error("Failed to fetch series details for remote", error);
            } finally {
                runInAction(() => {
                    this.isRemoteDetailLoading = false;
                });
            }
        }
    }

    clearRemoteSelectedItem = () => {
        this.remoteSelectedItem = null;
    }

    setJoinRoomIdFromUrl = (roomId: string) => {
        this.joinRoomIdFromUrl = roomId;
    }

    openWatchTogetherModal = (item: MediaItem | null) => {
        if (item) {
            this.selectedItem = item;
            this.watchTogetherSelectedItem = item;
        }
        this.watchTogetherModalOpen = true;
    };

    closeWatchTogetherModal = () => {
        if (this.roomId) {
            this.leaveRoom();
        } else {
            // Only reset if not in a room, otherwise leaveRoom handles it
            this.resetWatchTogetherState();
        }
    };

    private resetWatchTogetherState = () => {
        this.roomId = null;
        this.hostId = null;
        this.isHost = false;
        this.participants = [];
        this.watchTogetherModalOpen = false;
        this.username = null;
        this.watchTogetherError = null;
        this.chatHistory = [];
        this.joinRoomIdFromUrl = null;
        this.watchTogetherSelectedItem = null;
    };

    createRoom = (username: string) => {
        if (this.watchTogetherSelectedItem && username.trim()) {
            this.username = username.trim();
            this.watchTogetherError = null;
            this.isCreatingRoom = true; // Set flag to prevent immediate player transition for host
            const plainMediaObject = JSON.parse(JSON.stringify(this.watchTogetherSelectedItem));
            websocketService.sendMessage({
                type: 'quix-create-room',
                payload: {media: plainMediaObject, username: this.username}
            });
        }
    };

    joinRoom = (roomId: string, username: string) => {
        if (roomId.trim() && username.trim()) {
            this.username = username.trim();
            this.watchTogetherError = null;
            websocketService.sendMessage({
                type: 'quix-join-room',
                payload: {roomId: roomId.trim().toUpperCase(), username: this.username}
            });
        }
    };
    
    changeWatchTogetherMedia = (item: PlayableItem) => {
        // This action can now be called before a room exists to "stage" the media,
        // or by the host inside a room to change the media for everyone.
        this.watchTogetherSelectedItem = item;

        if (this.roomId && this.isHost) {
            websocketService.sendMessage({
                type: 'quix-select-media',
                payload: { roomId: this.roomId, media: JSON.parse(JSON.stringify(item)) }
            });
        }
    }
    
    changeRoomCode = () => {
        if (this.roomId && this.isHost) {
            websocketService.sendMessage({
                type: 'quix-change-room-code',
                payload: { roomId: this.roomId }
            });
        }
    }

    leaveRoom = () => {
        if (this.roomId) {
            websocketService.sendMessage({type: 'quix-leave-room', payload: {roomId: this.roomId}});
        }
        this.resetWatchTogetherState();
    };

    sendPlaybackControl = (state: PlaybackState) => {
        if (this.roomId && this.isHost) {
            websocketService.sendMessage({
                type: 'quix-playback-control',
                payload: {roomId: this.roomId, playbackState: state}
            });
        }
    }

    sendChatMessage = (message: { text?: string, image?: string }) => {
        if (this.roomId && (message.text?.trim() || message.image)) {
            websocketService.sendMessage({
                type: 'quix-chat-message',
                payload: {roomId: this.roomId, message}
            });
        }
    }

    toggleMyList = async (item: MediaItem) => {
        const itemId = item.id;
        const isInList = this.myList.includes(itemId);

        try {
            if (isInList) {
                await db.myList.delete(itemId);
                await db.cachedItems.delete(itemId);
                runInAction(() => {
                    this.myList = this.myList.filter(id => id !== itemId);
                    this.cachedItems.delete(itemId);
                });
            } else {
                const plainItem = JSON.parse(JSON.stringify(item));
                await db.myList.put({id: itemId});
                await db.cachedItems.put(plainItem);
                runInAction(() => {
                    this.myList.push(itemId);
                    this.cachedItems.set(itemId, item);
                });
            }
        } catch (error) {
            console.error("Failed to toggle My List in DB", error);
        }
    }

    addViewingHistoryEntry = async (showId: number, episodeId: number) => {
        const newEntry = {showId, episodeId, watchedAt: Date.now()};

        try {
            await db.viewingHistory.where({episodeId}).delete();
            await db.viewingHistory.put(newEntry);

            const historyFromDb = await db.viewingHistory.orderBy('watchedAt').reverse().limit(100).toArray();

            runInAction(() => {
                this.viewingHistory = historyFromDb;
            });
        } catch (error) {
            console.error("Failed to update viewing history in DB", error);
        }
    }

    updateEpisodeProgress = async (payload: { episodeId: number; currentTime: number; duration: number }) => {
        const { episodeId, currentTime, duration } = payload;
        if (!episodeId || !duration || isNaN(duration)) return;
    
        const progressPercent = currentTime / duration;
        const watched = progressPercent >= 0.8;
    
        const newProgress: EpisodeProgress = {
            episodeId,
            currentTime,
            duration,
            watched,
        };
    
        await db.episodeProgress.put(newProgress);
    
        runInAction(() => {
            this.episodeProgress.set(episodeId, newProgress);
        });
    };

    setShowIntroDuration = async (showId: number, duration: number) => {
        try {
            if (duration >= 0) {
                await db.showIntroDurations.put({id: showId, duration});
                runInAction(() => {
                    this.showIntroDurations.set(showId, duration);
                });
            } else {
                await db.showIntroDurations.delete(showId);
                runInAction(() => {
                    this.showIntroDurations.delete(showId);
                });
            }
        } catch (error) {
            console.error("Failed to set intro duration in DB", error);
        }
    }

    setIntroSkippableOnSlave = (isSkippable: boolean) => {
        if (this.isIntroSkippableOnSlave !== isSkippable) {
            this.isIntroSkippableOnSlave = isSkippable;
            this.sendSlaveStatusUpdate();
        }
    }

    setActiveView = (view: ActiveView) => {
        if (this.activeView !== view) {
            this.selectedItem = null;
        }
        this.activeView = view;
        window.scrollTo(0, 0);

        let newTheme: ThemeName | null = null;
        switch (view) {
            case 'Serie TV':
                newTheme = 'SerieTV';
                break;
            case 'Film':
                newTheme = 'Film';
                break;
            case 'Anime':
                newTheme = 'Anime';
                break;
        }

        if (newTheme) {
            this.setActiveTheme(newTheme);
        }
    }

    toggleSearch = (isActive: boolean) => {
        this.isSearchActive = isActive;
        if (!isActive) {
            this.searchQuery = '';
            this.searchResults = [];
        } else {
            this.selectedItem = null;
        }
    }

    setSearchQuery = (query: string) => {
        this.searchQuery = query;
        this.isSearching = true;

        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        if (!query.trim()) {
            this.searchResults = [];
            this.isSearching = false;
            return;
        }

        this.searchDebounceTimer = window.setTimeout(async () => {
            try {
                const results = await searchShow(this.searchQuery);
                runInAction(() => {
                    this.searchResults = results;
                    this.isSearching = false;
                });
            } catch (error) {
                console.error("Failed to search for shows", error);
                runInAction(() => {
                    this.isSearching = false;
                });
            }
        }, 500);
    }


    applyEpisodeLinksToMedia = (items: MediaItem[]) => {
        items.forEach(item => {
            if (item.media_type === 'tv' && item.seasons) {
                item.seasons.forEach(season => {
                    season.episodes.forEach(episode => {
                        const links = this.episodeLinks.get(episode.id);
                        if (links && links.length > 0) {
                            episode.video_urls = links;
                            episode.video_url = links[0].url; // For convenience and backward compatibility
                        } else {
                            episode.video_urls = [];
                            episode.video_url = undefined;
                        }
                    });
                });
            }
        });
    };

    selectMedia = async (item: MediaItem) => {
        this.isSearchActive = false;
        this.searchQuery = '';
        this.searchResults = [];
        this.selectedItem = item;
        window.scrollTo(0, 0);

        if (item.media_type === 'tv') {
            this.isDetailLoading = true;
            try {
                const seriesDetails = await getSeriesDetails(item.id);
                const seasonsWithEpisodes = await Promise.all(
                    seriesDetails.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(item.id, season.season_number);
                        return {...season, episodes};
                    }) ?? []
                );
                runInAction(() => {
                    const fullDetails = {...seriesDetails, seasons: seasonsWithEpisodes};
                    this.applyEpisodeLinksToMedia([fullDetails]);
                    this.selectedItem = fullDetails;
                });
            } catch (error) {
                console.error("Failed to fetch series details and episodes", error);
            } finally {
                runInAction(() => {
                    this.isDetailLoading = false;
                });
            }
        }
    }

    closeDetail = () => {
        this.selectedItem = null;
    }

    openLinkSelectionModal = (item: PlayableItem, links: EpisodeLink[]) => {
        this.itemForLinkSelection = item;
        this.linksForSelection = links;
        this.isLinkSelectionModalOpen = true;
    }

    closeLinkSelectionModal = () => {
        this.isLinkSelectionModalOpen = false;
        this.itemForLinkSelection = null;
        this.linksForSelection = [];
    }

    startPlayback = async (item: PlayableItem) => {
        // Step 1: Ensure we have full details for TV shows.
        if ('media_type' in item && item.media_type === 'tv' && !item.seasons) {
            try {
                runInAction(() => { this.isDetailLoading = true; });
                const seriesDetails = await getSeriesDetails(item.id);
                const seasonsWithEpisodes = await Promise.all(
                    seriesDetails.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(item.id, season.season_number);
                        return { ...season, episodes };
                    }) ?? []
                );
                const fullItem = { ...seriesDetails, seasons: seasonsWithEpisodes };
                this.applyEpisodeLinksToMedia([fullItem]);
                
                await this.startPlayback(fullItem); // Re-run with full data
    
            } catch (e) {
                console.error("Failed to load series details for playback", e);
                this.showSnackbar("notifications.failedToLoadSeriesDetails", "error", true);
            } finally {
                runInAction(() => { this.isDetailLoading = false; });
            }
            return;
        }
    
        // Step 2: Handle playing a whole series by finding the right episode.
        if ('media_type' in item && item.media_type === 'tv' && !('episode_number' in item)) {
            const allEpisodes = item.seasons?.flatMap(s => 
                s.episodes.map(e => ({
                    ...e,
                    show_id: item.id,
                    show_title: item.name || item.title,
                    backdrop_path: item.backdrop_path,
                    season_number: s.season_number
                }))
            ) || [];
    
            const inProgressEpisode = allEpisodes.find(ep => {
                const progress = this.episodeProgress.get(ep.id);
                return progress && !progress.watched;
            });
    
            if (inProgressEpisode) {
                const progress = this.episodeProgress.get(inProgressEpisode.id)!;
                await this.startPlayback({ ...inProgressEpisode, startTime: progress.currentTime });
                return;
            }
    
            const firstUnwatchedEpisode = allEpisodes.find(ep => !this.episodeProgress.get(ep.id)?.watched);
    
            if (firstUnwatchedEpisode) {
                await this.startPlayback(firstUnwatchedEpisode);
                return;
            }
            
            this.showSnackbar("notifications.noPlayableEpisodes", "warning", true);
            return;
        }
    
        // Step 3: Handle individual episode or movie.
        let urlToPlay: string | undefined;
        if ('episode_number' in item) {
            if (item.video_urls && item.video_urls.length > 1) {
                this.openLinkSelectionModal(item, item.video_urls);
                return;
            }
            urlToPlay = item.video_urls?.[0]?.url || item.video_url;

            if (!urlToPlay) {
                this.showSnackbar("notifications.noVideoLinks", "warning", true);
                return;
            }
        }
        
        let startTime = item.startTime || 0;
        if ('episode_number' in item && !startTime) {
            const progress = this.episodeProgress.get(item.id);
            if (progress && !progress.watched) {
                startTime = progress.currentTime;
            }
        }

        this.startPlaybackConfirmed({ ...item, video_url: urlToPlay }, startTime);
    }
    
    startPlaybackConfirmed = async (item: PlayableItem, startTime: number = 0) => {
        if (this.roomId && this.isHost) {
            this.changeWatchTogetherMedia(item);
            this.sendPlaybackControl({ status: 'playing', time: startTime });
        }
    
        if ('episode_number' in item) {
            this.addViewingHistoryEntry(item.show_id, item.id);
    
            // Ensure full show details are loaded and stored for the player context
            if (this.nowPlayingShowDetails?.id !== item.show_id) {
                try {
                    const seriesDetails = await getSeriesDetails(item.show_id);
                    const seasonsWithEpisodes = await Promise.all(
                        seriesDetails.seasons?.map(async (season) => {
                            const episodes = await getSeriesEpisodes(item.show_id, season.season_number);
                            return { ...season, episodes };
                        }) ?? []
                    );
                    const fullItem = { ...seriesDetails, seasons: seasonsWithEpisodes };
                    this.applyEpisodeLinksToMedia([fullItem]);
                    runInAction(() => { this.nowPlayingShowDetails = fullItem; });
                } catch (e) { console.error("Could not fetch show details for player", e); }
            }
        } else {
            runInAction(() => { this.nowPlayingShowDetails = null; });
        }
    
        this.nowPlayingItem = { ...item, startTime };
        this.isPlaying = true;
        this.watchTogetherModalOpen = false;
        this.closeLinkSelectionModal();
    }

    stopPlayback = () => {
        if (this.roomId) {
            this.leaveRoom();
        }
        this.isPlaying = false;
        this.nowPlayingItem = null;
        this.nowPlayingShowDetails = null;
        this.sendSlaveStatusUpdate();
        this.closeEpisodesDrawer();
    }

    openLinkEpisodesModal = (item: MediaItem) => {
        this.linkingEpisodesForItem = item;
        this.isLinkEpisodesModalOpen = true;
        this.expandedLinkAccordionId = false;
    };

    closeLinkEpisodesModal = () => {
        this.isLinkEpisodesModalOpen = false;
        // Do not nullify linkingEpisodesForItem here, modal might need it while closing
    };

    setExpandedLinkAccordionId = (panelId: number | false) => {
        this.expandedLinkAccordionId = panelId;
    }

    setEpisodeLinksForSeason = async (payload: {
        seasonNumber: number;
        method: 'pattern' | 'list' | 'json';
        data: any
    }) => {
        const { seasonNumber, method, data } = payload;
        const item = this.linkingEpisodesForItem;

        if (!item || !item.seasons) return;

        const season = item.seasons.find(s => s.season_number === seasonNumber);
        if (!season) return;

        let urls: (string | undefined)[] = [];
        let labels: (string | undefined)[] = [];

        try {
            switch (method) {
                case 'pattern':
                    const { pattern, padding, label } = data;
                    urls = season.episodes.map(ep =>
                        pattern.replace(/\[@EP\]/g, String(ep.episode_number).padStart(padding, '0'))
                    );
                    labels = season.episodes.map(ep =>
                        label.replace(/\[@EP\]/g, String(ep.episode_number).padStart(padding, '0'))
                    );
                    break;
                case 'list':
                    urls = data.list.split('\n').filter((line: string) => line.trim() !== '');
                    if (urls.length !== season.episodes.length) {
                        this.showSnackbar('notifications.linkCountMismatch', 'error', true, { linkCount: urls.length, episodeCount: season.episodes.length });
                        return;
                    }
                    break;
                case 'json':
                    const parsed = JSON.parse(data.json);
                    if (!Array.isArray(parsed)) throw new Error("JSON must be an array.");
                    urls = parsed.map(entry => typeof entry === 'string' ? entry : entry.url);
                    labels = parsed.map(entry => typeof entry === 'string' ? '' : entry.label);
                    break;
            }
        } catch (e) {
            this.showSnackbar('notifications.processingError', "error", true, { error: (e as Error).message });
            return;
        }

        const linksToSave: Omit<EpisodeLink, 'id'>[] = [];
        season.episodes.forEach((episode, index) => {
            if (urls[index]) {
                linksToSave.push({
                    episodeId: episode.id,
                    url: urls[index] as string,
                    label: labels[index] || urls[index] as string,
                });
            }
        });

        try {
            const episodeIds = season.episodes.map(ep => ep.id);
            
            // By removing the deletion of existing links, this function now appends
            // new links instead of replacing them. This allows multiple sources for episodes.

            if (linksToSave.length > 0) {
                await db.episodeLinks.bulkAdd(linksToSave);
                this.showSnackbar('notifications.linksAddedSuccess', 'success', true, { count: linksToSave.length });
            }

            // Refresh local state from DB to ensure consistency
            const allLinksForSeason = await db.episodeLinks.where('episodeId').anyOf(episodeIds).toArray();
            runInAction(() => {
                // Clear old state for the entire season before re-populating.
                episodeIds.forEach(epId => this.episodeLinks.delete(epId));
                
                const grouped = allLinksForSeason.reduce((acc, link) => {
                    const epId = link.episodeId;
                    if (!acc[epId]) acc[epId] = [];
                    acc[epId].push(link);
                    return acc;
                }, {} as Record<number, EpisodeLink[]>);
                
                for (const epIdStr in grouped) {
                    this.episodeLinks.set(parseInt(epIdStr), grouped[epIdStr]);
                }
                
                if (this.linkingEpisodesForItem) {
                    this.applyEpisodeLinksToMedia([this.linkingEpisodesForItem]);
                    this.linkingEpisodesForItem = { ...this.linkingEpisodesForItem }; // Mobx trigger
                    if (this.selectedItem?.id === this.linkingEpisodesForItem.id) {
                        this.selectedItem = this.linkingEpisodesForItem;
                    }
                }
            });

        } catch (error) {
            console.error("Failed to save episode links to DB", error);
            this.showSnackbar("notifications.savingLinksError", 'error', true);
        }
    };
    
    deleteEpisodeLink = async (linkId: number) => {
        const link = await db.episodeLinks.get(linkId);
        if (!link) return;

        await db.episodeLinks.delete(linkId);
        runInAction(() => {
            const episodeLinks = this.episodeLinks.get(link.episodeId);
            if (episodeLinks) {
                const updatedLinks = episodeLinks.filter(l => l.id !== linkId);
                if (updatedLinks.length > 0) {
                    this.episodeLinks.set(link.episodeId, updatedLinks);
                } else {
                    this.episodeLinks.delete(link.episodeId);
                }
                
                // Force a refresh of the selected item if it's open
                if (this.selectedItem) {
                    this.applyEpisodeLinksToMedia([this.selectedItem]);
                    this.selectedItem = {...this.selectedItem}; // Trigger mobx update
                }
            }
        });
    }

    clearLinksForSeason = async (seasonNumber: number, showId: number) => {
        const item = this.linkingEpisodesForItem?.id === showId ? this.linkingEpisodesForItem : this.allItems.find(i => i.id === showId);
        const season = item?.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(e => e.id);
        const linksToDelete = await db.episodeLinks.where('episodeId').anyOf(episodeIds).toArray();
        const linkIdsToDelete = linksToDelete.map(l => l.id!);

        if (linkIdsToDelete.length > 0) {
            await db.episodeLinks.bulkDelete(linkIdsToDelete);
            runInAction(() => {
                episodeIds.forEach(epId => this.episodeLinks.delete(epId));
                if (this.selectedItem) {
                    this.applyEpisodeLinksToMedia([this.selectedItem]);
                    this.selectedItem = {...this.selectedItem};
                }
            });
            this.showSnackbar("notifications.allSeasonLinksDeleted", "success", true, { count: linkIdsToDelete.length, season: seasonNumber });
        } else {
            this.showSnackbar("notifications.noLinksToDelete", "info", true, { season: seasonNumber });
        }
    }

    updateLinksDomain = async (payload: {
        links: EpisodeLink[];
        newDomain: string;
    }) => {
        const { links, newDomain } = payload;
        if (!links || links.length === 0 || !newDomain.trim()) {
            this.showSnackbar('notifications.processingError', 'error', true, { error: 'Dati per aggiornamento non validi.' });
            return;
        }

        try {
            const validatedNewUrl = new URL(newDomain); // This will throw if the new domain is not a valid URL structure.

            const updatedLinks = links.map(link => {
                try {
                    const oldUrl = new URL(link.url);
                    const newUrl = `${validatedNewUrl.origin}${oldUrl.pathname}${oldUrl.search}${oldUrl.hash}`;
                    // Also update the label if it contains the old domain
                    const newLabel = link.label.includes(oldUrl.origin)
                        ? link.label.replace(oldUrl.origin, validatedNewUrl.origin)
                        : link.label;
                    return { ...link, url: newUrl, label: newLabel };
                } catch (e) {
                    console.warn(`Skipping invalid URL for update: ${link.url}`);
                    return null;
                }
            }).filter((l): l is EpisodeLink => l !== null);


            if (updatedLinks.length > 0) {
                await db.episodeLinks.bulkPut(updatedLinks);

                runInAction(() => {
                    updatedLinks.forEach(updatedLink => {
                        const episodeLinks = this.episodeLinks.get(updatedLink.episodeId);
                        if (episodeLinks) {
                            const linkIndex = episodeLinks.findIndex(l => l.id === updatedLink.id);
                            if (linkIndex !== -1) {
                                episodeLinks.splice(linkIndex, 1, updatedLink);
                            }
                        }
                    });

                    if (this.linkingEpisodesForItem) {
                        this.applyEpisodeLinksToMedia([this.linkingEpisodesForItem]);
                        this.linkingEpisodesForItem = { ...this.linkingEpisodesForItem };
                        if (this.selectedItem?.id === this.linkingEpisodesForItem.id) {
                            this.selectedItem = this.linkingEpisodesForItem;
                        }
                    }
                });
                
                this.showSnackbar('notifications.linksUpdated', 'success', true, { count: updatedLinks.length });
            }

        } catch (error) {
            this.showSnackbar('notifications.domainUpdateError', 'error', true, { error: (error as Error).message });
        }
    }

    // --- Library Sharing Actions ---
    openShareModal = () => { this.isShareModalOpen = true; }
    closeShareModal = () => { this.isShareModalOpen = false; }
    openImportModal = () => { this.isImportModalOpen = true; }
    closeImportModal = () => { 
        this.isImportModalOpen = false; 
        this.importUrl = null;
    }
    setImportUrl = (url: string) => { this.importUrl = url; }
    
    get shareableShows(): MediaItem[] {
        // Find all show IDs that have at least one episode link
        const showIdsWithLinks = new Set<number>();
        this.allItems.forEach(item => {
            if (item.media_type === 'tv' && item.seasons) {
                for (const season of item.seasons) {
                    for (const episode of season.episodes) {
                        if (this.episodeLinks.has(episode.id)) {
                            showIdsWithLinks.add(item.id);
                            return; // Go to next show
                        }
                    }
                }
            }
        });

        // Return the full MediaItem objects for those IDs
        return this.allItems.filter(item => showIdsWithLinks.has(item.id));
    }

    generateShareableData = (showIds: number[]): SharedLibraryData => {
        const showsToShare: SharedShowData[] = [];

        showIds.forEach(id => {
            const show = this.allItems.find(item => item.id === id);
            if (!show || show.media_type !== 'tv' || !show.seasons) return;

            const sharedLinks: SharedEpisodeLink[] = [];
            show.seasons.forEach(season => {
                season.episodes.forEach(episode => {
                    const links = this.episodeLinks.get(episode.id);
                    if (links) {
                        links.forEach(link => {
                            sharedLinks.push({
                                seasonNumber: season.season_number,
                                episodeNumber: episode.episode_number,
                                url: link.url,
                                label: link.label,
                            });
                        });
                    }
                });
            });
            
            if (sharedLinks.length > 0) {
                 showsToShare.push({
                    tmdbId: show.id,
                    links: sharedLinks
                 });
            }
        });

        return { version: 1, shows: showsToShare };
    }
    
    importSharedLibrary = async (data: SharedLibraryData) => {
        if (!data || data.version !== 1 || !Array.isArray(data.shows)) {
            this.showSnackbar("notifications.importInvalidFile", "error", true);
            return;
        }

        runInAction(() => { this.isImportingLibrary = true; });
        this.showSnackbar("notifications.importInProgress", "info", true);

        try {
            const allNewLinks: Omit<EpisodeLink, 'id'>[] = [];
            const showsToCache: MediaItem[] = [];
            const showsToMyList: { id: number }[] = [];
            let totalLinksImported = 0;

            for (const sharedShow of data.shows) {
                // 1. Fetch fresh show data from TMDB
                const fullShow = await getSeriesDetails(sharedShow.tmdbId);
                const seasonsWithEpisodes = await Promise.all(
                    fullShow.seasons?.map(async (season) => {
                        const episodes = await getSeriesEpisodes(fullShow.id, season.season_number);
                        return { ...season, episodes };
                    }) ?? []
                );
                const showWithData = { ...fullShow, seasons: seasonsWithEpisodes };
                
                showsToCache.push(showWithData);
                showsToMyList.push({ id: showWithData.id });

                // 2. Create a map for easy lookup: "S1-E1" -> episodeId
                const episodeIdMap = new Map<string, number>();
                showWithData.seasons?.forEach(s => {
                    s.episodes.forEach(e => {
                        episodeIdMap.set(`S${s.season_number}-E${e.episode_number}`, e.id);
                    });
                });
                
                // 3. Map shared links to new episode IDs
                sharedShow.links.forEach(link => {
                    const key = `S${link.seasonNumber}-E${link.episodeNumber}`;
                    const episodeId = episodeIdMap.get(key);
                    if (episodeId) {
                        allNewLinks.push({
                            episodeId: episodeId,
                            url: link.url,
                            label: link.label
                        });
                    }
                });
                totalLinksImported += sharedShow.links.length;
            }

            // 4. Bulk insert everything into the database
            if (allNewLinks.length > 0) {
                await db.episodeLinks.bulkAdd(allNewLinks);
            }
            if (showsToCache.length > 0) {
                await db.cachedItems.bulkPut(showsToCache);
            }
            if (showsToMyList.length > 0) {
                 await db.myList.bulkPut(showsToMyList);
            }

            this.showSnackbar("notifications.importSuccess", "success", true, { showCount: data.shows.length, linkCount: totalLinksImported });
            
            // Reload the app to reflect all changes
            setTimeout(() => window.location.reload(), 2000);

        } catch (error) {
            console.error("Failed to import library:", error);
            this.showSnackbar("notifications.importError", "error", true, { error: (error as Error).message });
        } finally {
             runInAction(() => { this.isImportingLibrary = false; });
        }
    }


    prepareUserDataBackup = async () => {
        try {
            const [
                myList,
                viewingHistory,
                cachedItems,
                episodeLinks,
                showIntroDurations,
                preferences,
                revisions,
                episodeProgress,
            ] = await Promise.all([
                db.myList.toArray(),
                db.viewingHistory.toArray(),
                db.cachedItems.toArray(),
                db.episodeLinks.toArray(),
                db.showIntroDurations.toArray(),
                db.preferences.toArray(),
                db.revisions.toArray(),
                db.episodeProgress.toArray(),
            ]);

            const backupData = {
                data: {
                    myList,
                    viewingHistory,
                    cachedItems,
                    episodeLinks,
                    showIntroDurations,
                    preferences,
                    revisions,
                    episodeProgress,
                }
            };
            
            return backupData;
        } catch (error) {
            console.error("Failed to prepare user data backup:", error);
            this.showSnackbar("notifications.backupError", "error", true);
            return null;
        }
    }


    openEpisodesDrawer = () => {
        this.isEpisodesDrawerOpen = true;
    }
    closeEpisodesDrawer = () => {
        this.isEpisodesDrawerOpen = false;
    }

    toggleProfileDrawer = (isOpen: boolean) => {
        this.isProfileDrawerOpen = isOpen;
    }

    openQRScanner = () => {
        this.isProfileDrawerOpen = false;
        this.isQRScannerOpen = true;
    }

    closeQRScanner = () => {
        this.isQRScannerOpen = false;
    }

    connectAsRemoteMaster = (slaveId: string) => {
        runInAction(() => {
            this.isRemoteMaster = true;
            this.slaveId = slaveId;
            this.closeQRScanner();
        });
        websocketService.sendMessage({ type: 'quix-register-master', payload: { slaveId } });
    }

    enableSmartTVMode = () => {
        runInAction(() => {
            this.isSmartTV = true;
            this.isSmartTVPairingVisible = true;
            this.isProfileDrawerOpen = false;
        });
        websocketService.sendMessage({ type: 'quix-register-slave' });
    }

    exitSmartTVPairingMode = () => {
        this.isSmartTVPairingVisible = false;
    }
    
    get isLoggedIn(): boolean {
        return this.googleUser !== null;
    }

    setGoogleUser = async (user: GoogleUser | null) => {
        this.googleUser = user;
        if (user) {
            this.showSnackbar('notifications.welcomeUser', 'success', true, { name: user.name });
            // After user is set, check for a backup
            await this.checkForRemoteBackup();
        } else {
             this.showSnackbar("notifications.logoutSuccess", "info", true);
        }
    }

    checkForRemoteBackup = async () => {
        if (!this.googleUser) return;
        try {
            const backupFile = await driveService.findBackupFile(this.googleUser.accessToken);
            if (backupFile) {
                this.showSnackbarWithAction("notifications.backupFound", "info", "notifications.restore", () => {
                    this.restoreFromDrive();
                });
            }
        } catch (error) {
            console.error("Failed to check for remote backup:", error);
            // Don't bother the user with an error here, it's a background check.
        }
    }

    backupToDrive = async () => {
        if (!this.googleUser) {
            this.showSnackbar("notifications.loginRequired", "warning", true);
            return;
        }

        this.isBackingUp = true;
        this.showSnackbar("notifications.backupInProgress", "info", true);
        try {
            const backupData = await this.prepareUserDataBackup();
            if (!backupData || !backupData.data) throw new Error("Could not prepare backup data.");
            
            const existingFile = await driveService.findBackupFile(this.googleUser.accessToken);
            await driveService.writeBackupFile(this.googleUser.accessToken, backupData.data, existingFile?.id || null);

            this.showSnackbar("notifications.backupComplete", "success", true);
        } catch (error) {
            console.error("Failed to backup to Google Drive:", error);
            this.showSnackbar("notifications.backupSaveError", "error", true);
        } finally {
            runInAction(() => {
              this.isBackingUp = false;
            });
        }
    }

    restoreFromDrive = async () => {
        if (!this.googleUser) {
            this.showSnackbar("notifications.loginRequired", "warning", true);
            return;
        }
        
        this.isRestoring = true;
        this.showSnackbar("notifications.restoreInProgress", "info", true);
        try {
            const backupFile = await driveService.findBackupFile(this.googleUser.accessToken);
            if (!backupFile) {
                this.showSnackbar("notifications.noBackupFound", "warning", true);
                return;
            }

            const backupData = await driveService.readBackupFile(this.googleUser.accessToken, backupFile.id);
            await db.importData(backupData);

            this.showSnackbar("notifications.restoreComplete", "success", true);
            
            // Reload the app to reflect changes from the DB
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error("Failed to restore from Google Drive:", error);
            this.showSnackbar("notifications.restoreError", "error", true, { error: (error as Error).message });
        } finally {
            runInAction(() => {
              this.isRestoring = false;
            });
        }
    }

    // --- Revisions Actions ---
    openRevisionsModal = () => {
        this.fetchRevisions();
        this.isRevisionsModalOpen = true;
    }
    closeRevisionsModal = () => {
        this.isRevisionsModalOpen = false;
        this.revisions = []; // Clear data on close
    }

    private buildContextMaps = () => {
        this.episodeContextMap.clear();
        
        const itemsForContext = new Map<number, MediaItem>();
        
        // Add all items from the allItems getter
        this.allItems.forEach(item => itemsForContext.set(item.id, item));
        
        // Add the currently selected item if it exists and is a TV show
        if (this.selectedItem && this.selectedItem.media_type === 'tv') {
            itemsForContext.set(this.selectedItem.id, this.selectedItem);
        }

        itemsForContext.forEach(show => {
            if (show.seasons) {
                show.seasons.forEach(season => {
                    season.episodes.forEach(episode => {
                        this.episodeContextMap.set(episode.id, {
                            showName: show.name || show.title,
                            epNum: episode.episode_number,
                            sNum: season.season_number,
                            epName: episode.name,
                        });
                    });
                });
            }
        });
    }

    fetchRevisions = async () => {
        this.isRevisionsLoading = true;
        this.buildContextMaps();

        try {
            const revs = await db.revisions.orderBy('timestamp').reverse().limit(100).toArray();
            
            const processedRevs = revs.map(rev => {
                let description = `Azione sconosciuta`;
                let icon: Revision['icon'] = 'unknown';

                const data = rev.type === 1 ? rev.obj : (rev.oldObj || rev.obj);

                switch (rev.table) {
                    case 'myList': {
                        const show = this.cachedItems.get(rev.key);
                        const name = show?.name || show?.title || `ID ${rev.key}`;
                        if (rev.type === 1) { // Add
                            description = this.translations.revisions.descriptions.myList.add.replace('{name}', name);
                            icon = 'add';
                        } else { // Delete
                            description = this.translations.revisions.descriptions.myList.remove.replace('{name}', name);
                            icon = 'delete';
                        }
                        break;
                    }
                    case 'cachedItems': {
                        const name = data?.name || data?.title || `ID ${rev.key}`;
                        if (rev.type === 1) {
                            description = this.translations.revisions.descriptions.cachedItems.add.replace('{name}', name);
                            icon = 'add';
                        } else if (rev.type === 2) {
                            description = this.translations.revisions.descriptions.cachedItems.update.replace('{name}', name);
                            icon = 'update';
                        } else {
                            description = this.translations.revisions.descriptions.cachedItems.remove.replace('{name}', name);
                            icon = 'delete';
                        }
                        break;
                    }
                    case 'episodeLinks': {
                        const context = this.episodeContextMap.get(data?.episodeId);
                        const showName = context?.showName || 'Show sconosciuto';
                        const seasonNum = context?.sNum || '?';
                        const epNum = context?.epNum || '?';
                        
                        if (rev.type === 1) { // Add
                           description = this.translations.revisions.descriptions.episodeLinks.add.replace('{show}', showName).replace('{s}', String(seasonNum)).replace('{e}', String(epNum));
                           icon = 'add';
                        } else if (rev.type === 2) { // Update
                           description = this.translations.revisions.descriptions.episodeLinks.update.replace('{show}', showName).replace('{s}', String(seasonNum)).replace('{e}', String(epNum));
                           icon = 'update';
                        } else { // Delete
                           description = this.translations.revisions.descriptions.episodeLinks.remove.replace('{show}', showName).replace('{s}', String(seasonNum)).replace('{e}', String(epNum));
                           icon = 'delete';
                        }
                        break;
                    }
                     case 'showIntroDurations': {
                        const show = this.allItems.find(item => item.id === rev.key);
                        const name = show?.name || show?.title || `ID ${rev.key}`;
                        if (rev.type === 1 || rev.type === 2) { // Set/Update
                           description = this.translations.revisions.descriptions.showIntroDurations.set.replace('{show}', name).replace('{duration}', data.duration);
                           icon = 'update';
                        } else { // Delete
                           description = this.translations.revisions.descriptions.showIntroDurations.remove.replace('{show}', name);
                           icon = 'delete';
                        }
                        break;
                    }
                    case 'viewingHistory': {
                         const context = this.episodeContextMap.get(data?.episodeId);
                         const showName = context?.showName || 'Show sconosciuto';
                         const seasonNum = context?.sNum || '?';
                         const epNum = context?.epNum || '?';
                         if (rev.type === 1) {
                            description = this.translations.revisions.descriptions.viewingHistory.add.replace('{show}', showName).replace('{s}', String(seasonNum)).replace('{e}', String(epNum));
                            icon = 'add';
                         }
                         break;
                    }
                    default:
                        description = this.translations.revisions.descriptions.unknown.replace('{table}', rev.table).replace('{type}', String(rev.type));
                        break;
                }
                return { ...rev, description, icon };
            });

            runInAction(() => {
                this.revisions = processedRevs;
            });

        } catch (error) {
            console.error("Failed to fetch revisions:", error);
        } finally {
            runInAction(() => {
                this.isRevisionsLoading = false;
            });
        }
    }
    
    revertRevision = async (revision: Revision) => {
        const { table, type, key, oldObj, obj } = revision;
        try {
            const tableInstance = (db as any)[table];
            if (!tableInstance) throw new Error(`Table ${table} not found in DB`);

            if (type === 1) { // Revert CREATE by deleting
                await tableInstance.delete(key);
            } else if (type === 2) { // Revert UPDATE by putting back old object
                 if (oldObj) {
                    await tableInstance.put(oldObj);
                } else {
                    throw new Error(`Cannot revert update because the previous state (oldObj) is missing.`);
                }
            } else if (type === 3) { // Revert DELETE by putting back the deleted object
                const objectToRestore = oldObj || obj;
                if (objectToRestore) {
                    await tableInstance.put(objectToRestore);
                } else {
                    throw new Error(`Cannot revert delete because the object to restore is missing.`);
                }
            }
            this.showSnackbar('notifications.revertSuccess', 'success', true);
            this.fetchRevisions(); // Refresh the list
            this.loadPersistedData(); // Reload core app data
        } catch (e) {
            console.error("Failed to revert revision:", e);
            this.showSnackbar('notifications.revertError', 'error', true, { error: (e as Error).message });
        }
    }


    get isDebugModeActive(): boolean {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === 'true';
    }

    get heroContent(): MediaItem | undefined {
        switch (this.activeTheme) {
            case 'Anime':
                return this.popularAnime[0] || this.trending[0];
            case 'Film':
                return this.latestMovies[0] || this.trending.find(i => i.media_type === 'movie') || this.trending[0];
            case 'SerieTV':
                return this.topSeries[0] || this.trending.find(i => i.media_type === 'tv') || this.trending[0];
            default:
                return this.trending[0];
        }
    }

    get homePageRows(): { titleKey: string, items: MediaItem[] }[] {
        const allRows: ({ titleKey: string, items: MediaItem[], type?: ThemeName, condition?: boolean })[] = [
            { titleKey: "misc.continueWatching", items: this.continueWatchingItems, condition: this.continueWatchingItems.length > 0 },
            { titleKey: "misc.myList", items: this.myListItems, condition: this.myListItems.length > 0 },
            { titleKey: "misc.latestReleases", items: this.latestMovies, type: 'Film' },
            { titleKey: "misc.topRated", items: this.trending },
            { titleKey: "misc.popularSeries", items: this.topSeries, type: 'SerieTV' },
            { titleKey: "misc.mustWatchAnime", items: this.popularAnime, type: 'Anime' },
        ];
        
        const visibleRows = allRows.filter(row => row.condition !== false && row.items.length > 0);

        const priorityRow = visibleRows.find(row => row.type === this.activeTheme);
        const otherRows = visibleRows.filter(row => row.type !== this.activeTheme);
        
        if (priorityRow) {
            const topRows = otherRows.filter(r => r.titleKey === 'misc.continueWatching' || r.titleKey === 'misc.myList');
            const bottomRows = otherRows.filter(r => r.titleKey !== 'misc.continueWatching' && r.titleKey !== 'misc.myList');
            return [...topRows, priorityRow, ...bottomRows];
        }

        return visibleRows;
    }

    get continueWatchingItems(): MediaItem[] {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        const recentHistory = this.viewingHistory.filter(h => h.watchedAt > thirtyDaysAgo);

        const uniqueShowIds: number[] = [];
        for (const item of recentHistory) {
            if (!uniqueShowIds.includes(item.showId)) {
                uniqueShowIds.push(item.showId);
            }
        }

        return uniqueShowIds
            .map(showId => this.allItems.find(item => item.id === showId))
            .filter((item): item is MediaItem => !!item && item.media_type === 'tv');
    }

    get currentShow(): MediaItem | undefined {
        const nowPlayingItem = this.nowPlayingItem;
        if (!nowPlayingItem || !('show_id' in nowPlayingItem)) {
            return undefined;
        }
        // Prioritize the fully-loaded show details for the player.
        if (this.nowPlayingShowDetails && this.nowPlayingShowDetails.id === nowPlayingItem.show_id) {
            return this.nowPlayingShowDetails;
        }
        // Fallback for safety, though nowPlayingShowDetails should be set.
        return this.allItems.find(item => item.id === nowPlayingItem.show_id);
    }

    get currentSeasonEpisodes(): Episode[] {
        const nowPlayingItem = this.nowPlayingItem;
        if (nowPlayingItem && 'episode_number' in nowPlayingItem && this.currentShow) {
            const season = this.currentShow.seasons?.find(s => s.season_number === nowPlayingItem.season_number);
            return season?.episodes ?? [];
        }
        return [];
    }

    get nextEpisode(): Episode | undefined {
        if (this.nowPlayingItem && 'episode_number' in this.nowPlayingItem) {
            const currentEpisodeNumber = this.nowPlayingItem.episode_number;
            const nextEpisode = this.currentSeasonEpisodes.find(ep => ep.episode_number === currentEpisodeNumber + 1);
            return nextEpisode;
        }
        return undefined;
    }

    get allMovies(): MediaItem[] {
        const all = [...this.latestMovies, ...this.trending.filter(i => i.media_type === 'movie')];
        return Array.from(new Map(all.map(item => [item.id, item])).values());
    }

    get allItems(): MediaItem[] {
        const all = [
            ...this.trending,
            ...this.latestMovies,
            ...this.topSeries,
            ...this.popularAnime,
            ...Array.from(this.cachedItems.values())
        ];
        return Array.from(new Map(all.map(item => [item.id, item])).values());
    }

    get myListItems(): MediaItem[] {
        return this.allItems.filter(item => this.myList.includes(item.id));
    }

    fetchAllData = async () => {
        this.loading = true;
        this.error = null;
        try {

            const [
                trendingData,
                latestMoviesData,
                topSeriesData,
                popularAnimeData,
            ] = await Promise.all([
                getTrending(),
                getLatestMovies(),
                getTopRatedSeries(),
                getPopularAnime(),
            ]);

            runInAction(() => {
                this.trending = trendingData;
                this.latestMovies = latestMoviesData;
                this.topSeries = topSeriesData;
                this.popularAnime = popularAnimeData;
            });

        } catch (err) {
            runInAction(() => {
                this.error = 'Failed to fetch data. Please try again later.';
                console.error(err);
            });
        } finally {
            runInAction(() => {
                this.loading = false;
            });
        }
    }
}

export const mediaStore = new MediaStore();