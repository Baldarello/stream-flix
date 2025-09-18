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
                // FIX: Load from mediaLinks table instead of episodeLinks
                mediaLinksFromDb,
                introDurationsFromDb,
                themePreference,
                languagePreference,
                episodeProgressFromDb,
                preferredSourcesFromDb,
            ] = await Promise.all([
                db.myList.toArray(),
                db.viewingHistory.orderBy('watchedAt').reverse().limit(100).toArray(),
                db.cachedItems.toArray(),
                // FIX: Load from mediaLinks table instead of episodeLinks
                db.mediaLinks.toArray(),
                db.showIntroDurations.toArray(),
                db.preferences.get('activeTheme'),
                db.preferences.get('language'),
                db.episodeProgress.toArray(),
                db.preferredSources.toArray(),
            ]);

            runInAction(() => {
                this.myList = myListFromDb.map(item => item.id);
                this.viewingHistory = viewingHistoryFromDb;
                this.cachedItems = new Map(cachedItemsFromDb.map(item => [item.id, item]));

                // FIX: Group links by mediaId from the mediaLinks table
                const linksMap = new Map<number, MediaLink[]>();
                mediaLinksFromDb.forEach(link => {
                    if (!linksMap.has(link.mediaId)) {
                        linksMap.set(link.mediaId, []);
                    }
                    linksMap.get(link.mediaId)!.push(link);
                });
                this.mediaLinks = linksMap;
                
                this.showIntroDurations = new Map(introDurationsFromDb.map(item => [item.id, item.duration]));
                
                this.episodeProgress = new Map(episodeProgressFromDb.map(p => [p.episodeId, p]));

                this.preferredSources = new Map(preferredSourcesFromDb.map(p => [p.showId, p.origin]));

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
                
                // FIX: Apply locally stored video links using the new applyMediaLinks method
                this.applyMediaLinks([fullItem]);
                
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
                    // FIX: Apply locally stored video links using the new applyMediaLinks method
                    this.applyMediaLinks([fullItem]);
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
    
    setPreferredSource = async (showId: number, origin: string) => {
        const currentPreference = this.preferredSources.get(showId);

        try {
            if (currentPreference === origin) {
                // If clicking the same one, unset it
                await db.preferredSources.delete(showId);
                runInAction(() => {
                    this.preferredSources.delete(showId);
                });
            } else {
                // Set a new preference
                const pref: PreferredSource = { showId, origin };
                await db.preferredSources.put(pref);
                runInAction(() => {
                    this.preferredSources.set(showId, origin);
                });
                 this.showSnackbar('notifications.preferredSourceSet', 'success', true);
            }
        } catch (error) {
            console.error("Failed to set preferred source", error);
            this.showSnackbar('notifications.processingError', 'error', true);
        }
    };

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


    // FIX: Rename from applyEpisodeLinksToMedia to applyMediaLinks and handle both movies and TV shows
    applyMediaLinks = (items: MediaItem[]) => {
        items.forEach(item => {
            if (item.media_type === 'tv' && item.seasons) {
                item.seasons.forEach(season => {
                    season.episodes.forEach(episode => {
                        const links = this.mediaLinks.get(episode.id);
                        if (links && links.length > 0) {
                            episode.video_urls = links;
                            episode.video_url = links[0].url; // For convenience and backward compatibility
                        } else {
                            episode.video_urls = [];
                            episode.video_url = undefined;
                        }
                    });
                });
            } else if (item.media_type === 'movie') {
                const links = this.mediaLinks.get(item.id);
                if (links && links.length > 0) {
                    item.video_urls = links;
                    item.video_url = links[0].url;
                } else {
                    item.video_urls = [];
                    item.video_url = undefined;
                }
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
                    // FIX: Apply locally stored video links using the new applyMediaLinks method
                    this.applyMediaLinks([fullDetails]);
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

    // FIX: Update links parameter to use MediaLink type
    openLinkSelectionModal = (item: PlayableItem, links: MediaLink[]) => {
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
        runInAction(() => { this.isDetailLoading = true; });
        try {
            let episodeToPlay: (Episode & { show_id: number; show_title: string; backdrop_path: string; season_number: number; startTime?: number; video_url?: string; intro_end_s?: number }) | null = null;
            let movieToPlay: MediaItem | null = null;
            let showForContext: MediaItem | null = null;
    
            // Phase 1: Determine the exact item to play and load full context if needed
            if ('episode_number' in item) { // Direct episode click
                episodeToPlay = item;
                if (this.nowPlayingShowDetails?.id !== item.show_id) {
                    const fullShow = await getSeriesDetails(item.show_id);
                    const seasons = await Promise.all(fullShow.seasons?.map(async s => ({ ...s, episodes: await getSeriesEpisodes(item.show_id, s.season_number) })) ?? []);
                    showForContext = { ...fullShow, seasons };
                    this.applyMediaLinks([showForContext]);
                } else {
                    showForContext = this.nowPlayingShowDetails;
                }
                 // Ensure episodeToPlay has the latest links from the full context
                if (showForContext?.seasons) {
                    const season = showForContext.seasons.find(s => s.season_number === item.season_number);
                    const epInContext = season?.episodes.find(e => e.id === item.id);
                    if (epInContext) episodeToPlay = { ...item, ...epInContext };
                }

            } else if (item.media_type === 'tv') { // TV series click
                const details = (item.seasons && item.seasons.every(s => s.episodes.length > 0)) ? item : await getSeriesDetails(item.id);
                const seasons = await Promise.all(details.seasons?.map(async s => ({ ...s, episodes: await getSeriesEpisodes(item.id, s.season_number) })) ?? []);
                showForContext = { ...details, seasons };
                this.applyMediaLinks([showForContext]);
                const allEpisodes = showForContext.seasons?.flatMap(s => s.episodes.map(e => ({ ...e, show_id: showForContext!.id, show_title: showForContext!.name || showForContext!.title, backdrop_path: showForContext!.backdrop_path, season_number: s.season_number }))) || [];
                const inProgress = allEpisodes.find(ep => { const p = this.episodeProgress.get(ep.id); return p && !p.watched; });
                if (inProgress) {
                    episodeToPlay = { ...inProgress, startTime: this.episodeProgress.get(inProgress.id)!.currentTime };
                } else {
                    episodeToPlay = allEpisodes.find(ep => !this.episodeProgress.get(ep.id)?.watched) || allEpisodes[0] || null;
                }
            } else { // It's a movie
                this.applyMediaLinks([item]);
                movieToPlay = item;
            }
    
            const itemToPlay = episodeToPlay || movieToPlay;
            if (!itemToPlay) {
                this.showSnackbar("notifications.noPlayableEpisodes", "warning", true);
                return;
            }
    
            // BUG FIX: Calculate and add intro_end_s if it's an episode
            if (episodeToPlay) {
                const introDuration = this.showIntroDurations.get(episodeToPlay.show_id) ?? 80;
                if (episodeToPlay.intro_start_s) {
                    episodeToPlay.intro_end_s = episodeToPlay.intro_start_s + introDuration;
                }
            }
    
            // Phase 2: Handle link selection (with preferred source logic)
            const allLinks = itemToPlay.video_urls || [];
            let linksToConsider = allLinks;
            const showIdForPreferredSource = 'show_id' in itemToPlay ? itemToPlay.show_id : itemToPlay.id;
            const preferredOrigin = this.preferredSources.get(showIdForPreferredSource);
    
            if (preferredOrigin) {
                const preferredLinks = allLinks.filter(link => {
                    try { return new URL(link.url).origin === preferredOrigin; } catch { return false; }
                });
                if (preferredLinks.length > 0) {
                    linksToConsider = preferredLinks;
                }
            }
    
            const isPlayingFromSelection = 'video_url' in item && !!item.video_url;
            if (linksToConsider.length > 1 && !isPlayingFromSelection) {
                this.openLinkSelectionModal(itemToPlay, linksToConsider);
                return;
            }
    
            const urlToPlay = isPlayingFromSelection ? item.video_url : linksToConsider[0]?.url;
            if (!urlToPlay) {
                this.showSnackbar("notifications.noVideoLinks", "warning", true);
                return;
            }
    
            // Phase 3: Set state and play
            runInAction(() => {
                if (this.roomId && this.isHost) {
                    this.changeWatchTogetherMedia(itemToPlay);
                    this.sendPlaybackControl({ status: 'playing', time: itemToPlay.startTime || 0 });
                }
                
                if (episodeToPlay) {
                    this.addViewingHistoryEntry(episodeToPlay.show_id, episodeToPlay.id);
                    this.nowPlayingShowDetails = showForContext;
                } else {
                    this.nowPlayingShowDetails = null;
                }
                
                let startTime = itemToPlay.startTime || 0;
                if (!startTime && 'id' in itemToPlay) {
                    const progress = this.episodeProgress.get(itemToPlay.id);
                    if (progress && !progress.watched) startTime = progress.currentTime;
                }
                
                this.nowPlayingItem = { ...itemToPlay, video_url: urlToPlay, startTime };
                this.isPlaying = true;
                this.watchTogetherModalOpen = false;
                this.closeLinkSelectionModal();
            });
    
        } catch (e) {
            console.error("Error during playback start:", e);
            this.showSnackbar("notifications.failedToLoadSeriesDetails", "error", true);
        } finally {
            runInAction(() => { this.isDetailLoading = false; });
        }
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
    
    // FIX: Add methods and state for the movie linking modal
    openLinkMovieModal = (item: MediaItem) => {
        this.linkingMovieItem = item;
        this.isLinkMovieModalOpen = true;
    };

    closeLinkMovieModal = () => {
        this.isLinkMovieModalOpen = false;
        this.linkingMovieItem = null;
    };

    setExpandedLinkAccordionId = (panelId: number | false) => {
        this.expandedLinkAccordionId = panelId;
    }

    // FIX: Update to use MediaLink and db.mediaLinks table
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

        // FIX: The type is Omit<MediaLink, 'id'>[]
        const linksToSave: Omit<MediaLink, 'id'>[] = [];
        season.episodes.forEach((episode, index) => {
            if (urls[index]) {
                linksToSave.push({
                    // FIX: The property is mediaId
                    mediaId: episode.id,
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
                // FIX: Save to mediaLinks table
                await db.mediaLinks.bulkAdd(linksToSave);
                this.showSnackbar('notifications.linksAddedSuccess', 'success', true, { count: linksToSave.length });
            }

            // Refresh local state from DB to ensure consistency
            // FIX: Query from mediaLinks table
            const allLinksForSeason = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();
            runInAction(() => {
                // Clear old state for the entire season before re-populating.
                // FIX: Update mediaLinks map
                episodeIds.forEach(epId => this.mediaLinks.delete(epId));
                
                const grouped = allLinksForSeason.reduce((acc, link) => {
                    // FIX: Use mediaId for grouping
                    const mediaId = link.mediaId;
                    if (!acc[mediaId]) acc[mediaId] = [];
                    acc[mediaId].push(link);
                    return acc;
                }, {} as Record<number, MediaLink[]>);
                
                for (const mediaIdStr in grouped) {
                    // FIX: Update mediaLinks map
                    this.mediaLinks.set(parseInt(mediaIdStr), grouped[mediaIdStr]);
                }
                
                if (this.linkingEpisodesForItem) {
                    // FIX: Use new method name
                    this.applyMediaLinks([this.linkingEpisodesForItem]);
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
    
    // FIX: Rename deleteEpisodeLink to deleteMediaLink and update to use mediaLinks table
    deleteMediaLink = async (linkId: number) => {
        const link = await db.mediaLinks.get(linkId);
        if (!link) return;

        await db.mediaLinks.delete(linkId);
        runInAction(() => {
            const mediaLinksForId = this.mediaLinks.get(link.mediaId);
            if (mediaLinksForId) {
                const updatedLinks = mediaLinksForId.filter(l => l.id !== linkId);
                if (updatedLinks.length > 0) {
                    this.mediaLinks.set(link.mediaId, updatedLinks);
                } else {
                    this.mediaLinks.delete(link.mediaId);
                }
                
                // Force a refresh of the selected item if it's open
                if (this.selectedItem) {
                    this.applyMediaLinks([this.selectedItem]);
                    this.selectedItem = {...this.selectedItem}; // Trigger mobx update
                }
                if (this.linkingMovieItem) {
                    this.applyMediaLinks([this.linkingMovieItem]);
                    this.linkingMovieItem = {...this.linkingMovieItem};
                }
            }
        });
    }

    // FIX: Add a generic method to add links to any media (movie or episode)
    addLinksToMedia = async (mediaId: number, links: {url: string, label: string}[]) => {
        const linksToSave: Omit<MediaLink, 'id'>[] = links.map(link => ({
            mediaId,
            url: link.url,
            label: link.label || link.url,
        }));

        if (linksToSave.length > 0) {
            await db.mediaLinks.bulkAdd(linksToSave);
            
            // Refresh local state from DB
            const allLinksForMedia = await db.mediaLinks.where('mediaId').equals(mediaId).toArray();
            runInAction(() => {
                this.mediaLinks.set(mediaId, allLinksForMedia);

                if (this.linkingMovieItem?.id === mediaId) {
                    this.applyMediaLinks([this.linkingMovieItem]);
                    this.linkingMovieItem = { ...this.linkingMovieItem };
                }
                if (this.selectedItem?.id === mediaId) {
                    this.applyMediaLinks([this.selectedItem]);
                    this.selectedItem = { ...this.selectedItem };
                }
            });
            this.showSnackbar('notifications.linksAddedSuccess', 'success', true, { count: linksToSave.length });
        }
    };

    // FIX: Update to use db.mediaLinks
    clearLinksForSeason = async (seasonNumber: number, showId: number) => {
        const item = this.linkingEpisodesForItem?.id === showId ? this.linkingEpisodesForItem : this.allItems.find(i => i.id === showId);
        const season = item?.seasons?.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const episodeIds = season.episodes.map(e => e.id);
        const linksToDelete = await db.mediaLinks.where('mediaId').anyOf(episodeIds).toArray();
        const linkIdsToDelete = linksToDelete.map(l => l.id!);

        if (linkIdsToDelete.length > 0) {
            await db.mediaLinks.bulkDelete(linkIdsToDelete);
            runInAction(() => {
                episodeIds.forEach(epId => this.mediaLinks.delete(epId));
                if (this.selectedItem) {
                    this.applyMediaLinks([this.selectedItem]);
                    this.selectedItem = {...this.selectedItem};
                }
            });
            this.showSnackbar("notifications.allSeasonLinksDeleted", "success", true, { count: linkIdsToDelete.length, season: seasonNumber });
        } else {
            this.showSnackbar("notifications.noLinksToDelete", "info", true, { season: seasonNumber });
        }
    }

    // FIX: Update to use MediaLink and db.mediaLinks
    updateLinksDomain = async (payload: {
        links: MediaLink[];
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
            }).filter((l): l is MediaLink => l !== null);


            if (updatedLinks.length > 0) {
                await db.mediaLinks.bulkPut(updatedLinks);

                runInAction(() => {
                    updatedLinks.forEach(updatedLink => {
                        const mediaLinksForId = this.mediaLinks.get(updatedLink.mediaId);
                        if (mediaLinksForId) {
                            const linkIndex = mediaLinksForId.findIndex(l => l.id === updatedLink.id);
                            if (linkIndex !== -1) {
                                mediaLinksForId.splice(linkIndex, 1, updatedLink);
                            }
                        }
                    });

                    if (this.linkingEpisodesForItem) {
                        this.applyMediaLinks([this.linkingEpisodesForItem]);
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
                        if (this.mediaLinks.has(episode.id)) {
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

    // FIX: Update to use mediaLinks map
    generateShareableData = (showIds: number[]): SharedLibraryData => {
        const showsToShare: SharedShowData[] = [];

        showIds.forEach(id => {
            const show = this.allItems.find(item => item.id === id);
            if (!show || show.media_type !== 'tv' || !show.seasons) return;

            const sharedLinks: SharedEpisodeLink[] = [];
            show.seasons.forEach(season => {
                season.episodes.forEach(episode => {
                    const links = this.mediaLinks.get(episode.id);
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
    
    // FIX: Update to use MediaLink, mediaId, and db.mediaLinks
    importSharedLibrary = async (data: SharedLibraryData) => {
        if (!data || data.version !== 1 || !Array.isArray(data.shows)) {
            this.showSnackbar("notifications.importInvalidFile", "error", true);
            return;
        }

        runInAction(() => { this.isImportingLibrary = true; });
        this.showSnackbar("notifications.importInProgress", "info", true);

        try {
            const allNewLinks: Omit<MediaLink, 'id'>[] = [];
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
                            mediaId: episodeId,
                            url: link.url,
                            label: link.label
                        });
                    }
                });
                totalLinksImported += sharedShow.links.length;
            }

            // 4. Bulk insert everything into the database
            if (allNewLinks.length > 0) {
                await db.mediaLinks.bulkAdd(allNewLinks);
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


    // FIX: Update to use db.mediaLinks
    prepareUserDataBackup = async () => {
        try {
            const [
                myList,
                viewingHistory,
                cachedItems,
                mediaLinks,
                showIntroDurations,
                preferences,
                episodeProgress,
                preferredSources,
            ] = await Promise.all([
                db.myList.toArray(),
                db.viewingHistory.toArray(),
                db.cachedItems.toArray(),
                db.mediaLinks.toArray(),
                db.showIntroDurations.toArray(),
                // Exclude sync timestamp from the backup payload, as a fresh one will be added.
                db.preferences.where('key').notEqual('lastSyncTimestamp').toArray(),
                db.episodeProgress.toArray(),
                db.preferredSources.toArray(),
            ]);

            const backupData = {
                data: {
                    myList,
                    viewingHistory,
                    cachedItems,
                    mediaLinks,
                    showIntroDurations,
                    preferences,
                    episodeProgress,
                    preferredSources,
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

    setGoogleUser = (user: GoogleUser | null) => {
        this.googleUser = user;
        if (user) {
            this.showSnackbar('notifications.welcomeUser', 'success', true, { name: user.name });
        } else {
             this.showSnackbar("notifications.logoutSuccess", "info", true);
        }
    }

    triggerDebouncedBackup = () => {
        if (!this.googleUser || this.isSyncing) return;

        if (this.backupDebounceTimer) {
            clearTimeout(this.backupDebounceTimer);
        }

        this.backupDebounceTimer = window.setTimeout(async () => {
            await this.backupToDrive(true); // isAuto is true for debounced backups
        }, 15000); // 15-second debounce window
    }

    backupToDrive = async (isAuto = false) => {
        if (!this.googleUser || this.isSyncing) {
            return;
        }

        this.isSyncing = true;
        this.showSnackbar(isAuto ? "notifications.syncing" : "notifications.backupInProgress", "info", true);
        try {
            const backupData = await this.prepareUserDataBackup();
            const newSyncTimestamp = Date.now();
            
            if (backupData?.data) {
                // Add the new sync timestamp to the preferences within the backup data itself
                backupData.data.preferences = [
                    ...backupData.data.preferences,
                    { key: 'lastSyncTimestamp', value: newSyncTimestamp }
                ];
            }
            
            if (!backupData || !backupData.data) throw new Error("Could not prepare backup data.");
            
            await driveService.writeBackupFile(this.googleUser.accessToken, backupData.data);
            
            // Update local timestamp AFTER successful backup
            await db.preferences.put({ key: 'lastSyncTimestamp', value: newSyncTimestamp });

            this.showSnackbar("notifications.backupComplete", "success", true);
            
            // Clean up old backups in the background, not critical to wait for it
            driveService.deleteOldBackups(this.googleUser.accessToken);

        } catch (error) {
            console.error("Failed to backup to Google Drive:", error);
            this.showSnackbar("notifications.backupSaveError", "error", true);
        } finally {
            runInAction(() => {
              this.isSyncing = false;
            });
        }
    }

    restoreFromDrive = async (fileId?: string) => {
        if (!this.googleUser || this.isSyncing) {
            this.showSnackbar("notifications.loginRequired", "warning", true);
            return;
        }
        
        this.isSyncing = true;
        this.showSnackbar("notifications.restoreInProgress", "info", true);
        try {
            const backupFile = fileId ? { id: fileId } : await driveService.findLatestBackupFile(this.googleUser.accessToken);
            if (!backupFile) {
                this.showSnackbar("notifications.noBackupFound", "warning", true);
                return;
            }

            const backupData = await driveService.readBackupFile(this.googleUser.accessToken, backupFile.id);
            await db.importData(backupData);

            this.showSnackbar("notifications.restoreComplete", "success", true);
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error("Failed to restore from Google Drive:", error);
            this.showSnackbar("notifications.restoreError", "error", true, { error: (error as Error).message });
        } finally {
            runInAction(() => {
              this.isSyncing = false; // Will be reset on reload anyway, but good practice
            });
        }
    }
    
    synchronizeWithDrive = async () => {
        if (!this.googleUser || this.isSyncing) return;

        this.isSyncing = true;
        this.showSnackbar("notifications.syncChecking", "info", true);

        try {
            const latestDriveBackup = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            const lastSyncRecord = await db.preferences.get('lastSyncTimestamp');
            const lastLocalSyncTimestamp = lastSyncRecord?.value || 0;

            if (!latestDriveBackup) {
                this.showSnackbar("notifications.noBackupFoundCreating", "info", true);
                await this.backupToDrive();
                return;
            }

            const driveTimestampMatch = latestDriveBackup.name.match(/_(\d+)\.json$/);
            const driveTimestamp = driveTimestampMatch ? parseInt(driveTimestampMatch[1], 10) : 0;

            if (driveTimestamp > lastLocalSyncTimestamp) {
                this.showSnackbar("notifications.restoringFromCloud", "info", true);
                await this.restoreFromDrive(latestDriveBackup.id);
            } else {
                this.hideSnackbar();
            }

        } catch (error) {
            console.error("Failed to synchronize with Google Drive:", error);
            this.showSnackbar("notifications.syncError", "error", true);
        } finally {
            runInAction(() => {
                this.isSyncing = false;
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
                    case 'mediaLinks': { // FIX: Renamed from episodeLinks
                        const context = this.episodeContextMap.get(data?.mediaId);
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
