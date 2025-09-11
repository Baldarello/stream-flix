import {makeAutoObservable, runInAction} from 'mobx';
import type {ChatMessage, Episode, MediaItem, PlayableItem, ViewingHistoryItem} from '../types';
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
import type {EpisodeLink} from '../services/db';
import {db} from '../services/db';
import { isSmartTV as detectSmartTV } from '../utils/device';

export type ActiveView = 'Home' | 'Serie TV' | 'Film' | 'Anime' | 'La mia lista';
export type ThemeName = 'SerieTV' | 'Film' | 'Anime';

type PlaybackState = { status: 'playing' | 'paused'; time: number };

type RemoteSlaveState = {
    isPlaying: boolean;
    nowPlayingItem: PlayableItem | null;
    isIntroSkippable?: boolean;
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
    activeView: ActiveView = 'Home';
    viewingHistory: ViewingHistoryItem[] = [];
    cachedItems: Map<number, MediaItem> = new Map();

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
    episodeLinks: Map<number, string> = new Map();
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem: MediaItem | null = null;

    // Player Episode Drawer State
    isEpisodesDrawerOpen = false;

    // Profile Drawer & QR Scanner State
    isProfileDrawerOpen = false;
    isQRScannerOpen = false;

    // Custom Intro Durations
    showIntroDurations: Map<number, number> = new Map();

    // Theme state
    activeTheme: ThemeName = 'SerieTV';

    // Snackbar State
    snackbarMessage: { message: string, severity: AlertColor } | null = null;


    constructor() {
        makeAutoObservable(this);
        this.isSmartTV = detectSmartTV();
        if (this.isSmartTV) {
            this.isSmartTVPairingVisible = true;
        }
        websocketService.events.on('message', this.handleIncomingMessage);
        websocketService.events.on('open', this.initRemoteSession);
    }

    showSnackbar = (message: string, severity: AlertColor = 'info') => {
        this.snackbarMessage = { message, severity };
    }

    hideSnackbar = () => {
        this.snackbarMessage = null;
    }

    loadPersistedData = async () => {
        try {
            const [
                myListFromDb,
                viewingHistoryFromDb,
                cachedItemsFromDb,
                episodeLinksFromDb,
                introDurationsFromDb,
                themePreference
            ] = await Promise.all([
                db.myList.toArray(),
                db.viewingHistory.orderBy('watchedAt').reverse().limit(100).toArray(),
                db.cachedItems.toArray(),
                db.episodeLinks.toArray(),
                db.showIntroDurations.toArray(),
                db.preferences.get('activeTheme')
            ]);

            runInAction(() => {
                this.myList = myListFromDb.map(item => item.id);
                this.viewingHistory = viewingHistoryFromDb;
                this.cachedItems = new Map(cachedItemsFromDb.map(item => [item.id, item]));
                this.episodeLinks = new Map(episodeLinksFromDb.map(item => [item.id, item.url]));
                this.showIntroDurations = new Map(introDurationsFromDb.map(item => [item.id, item.duration]));
                if (themePreference) {
                    this.activeTheme = themePreference.value;
                }
            });
        } catch (error) {
            console.error("Failed to load persisted data from Dexie.", error);
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
                        this.showSnackbar('Stanza creata! Condividi il codice per invitare amici.', 'success');
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
                    this.showSnackbar('Dispositivo TV pronto. Scansiona il QR code per connetterti.', 'info');
                    break;
                case 'quix-master-connected':
                    this.isRemoteMasterConnected = true;
                    this.isSmartTVPairingVisible = false; // Hide QR code screen on TV
                    if (this.isRemoteMaster) {
                        this.showSnackbar('Connesso alla TV con successo!', 'success');
                    } else if (this.isSmartTV) {
                        this.showSnackbar('Telecomando connesso!', 'success');
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
                        if (this.episodeLinks.has(episode.id)) {
                            episode.video_url = this.episodeLinks.get(episode.id);
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

    startPlayback = (item: PlayableItem) => {
        // If the host starts playback or changes the media, update it for the whole room.
        if (this.roomId && this.isHost) {
            this.changeWatchTogetherMedia(item);
            this.sendPlaybackControl({status: 'playing', time: 0});
        }
    
        // The rest of the logic runs for the user initiating the action (host)
        // or for any user watching solo. Room participants' players are updated
        // by the server broadcast, which sets nowPlayingItem.
        if ('episode_number' in item) {
            this.addViewingHistoryEntry(item.show_id, item.id);
    
            if (item.intro_start_s !== undefined) {
                const customDuration = this.showIntroDurations.get(item.show_id);
                const introDuration = customDuration !== undefined ? customDuration : 80;
                item.intro_end_s = item.intro_start_s + introDuration;
            }
        }
        this.nowPlayingItem = item;
        this.isPlaying = true;
        this.watchTogetherModalOpen = false;
    }

    stopPlayback = () => {
        if (this.roomId) {
            this.leaveRoom();
        }
        this.isPlaying = false;
        this.nowPlayingItem = null;
        this.sendSlaveStatusUpdate();
        this.closeEpisodesDrawer();
    }

    openLinkEpisodesModal = (item: MediaItem) => {
        this.linkingEpisodesForItem = item;
        this.isLinkEpisodesModalOpen = true;
    };

    closeLinkEpisodesModal = () => {
        this.isLinkEpisodesModalOpen = false;
        this.linkingEpisodesForItem = null;
    };

    setEpisodeLinksForSeason = async (payload: {
        seasonNumber: number;
        method: 'pattern' | 'list' | 'json';
        data: any
    }) => {
        const {seasonNumber, method, data} = payload;
        const item = this.linkingEpisodesForItem;

        if (!item || !item.seasons) return;

        const season = item.seasons.find(s => s.season_number === seasonNumber);
        if (!season) return;

        let links: (string | undefined)[] = [];

        switch (method) {
            case 'pattern':
                const {pattern, padding} = data;
                if (!pattern || !pattern.includes('[@EP]')) return;
                links = season.episodes.map(ep =>
                    pattern.replace('[@EP]', String(ep.episode_number).padStart(padding, '0'))
                );
                break;
            case 'list':
                links = data.list.split('\n').filter((line: string) => line.trim() !== '');
                break;
            case 'json':
                try {
                    links = JSON.parse(data.json);
                    if (!Array.isArray(links)) links = [];
                } catch (e) {
                    console.error("Invalid JSON for episode links", e);
                    links = [];
                }
                break;
        }

        const linksToSave: EpisodeLink[] = [];
        season.episodes.forEach((episode, index) => {
            if (links[index]) {
                const url = links[index] as string;
                linksToSave.push({id: episode.id, url});
            }
        });

        if (linksToSave.length > 0) {
            try {
                await db.episodeLinks.bulkPut(linksToSave);
                runInAction(() => {
                    linksToSave.forEach(link => this.episodeLinks.set(link.id, link.url));
                });
            } catch (error) {
                console.error("Failed to save episode links to DB", error);
            }
        }

        this.applyEpisodeLinksToMedia([item]);
        this.closeLinkEpisodesModal();
    };



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

    get homePageRows(): { title: string, items: MediaItem[] }[] {
        const allRows: ({ title: string, items: MediaItem[], type?: ThemeName, condition?: boolean })[] = [
            { title: "Continua a guardare", items: this.continueWatchingItems, condition: this.continueWatchingItems.length > 0 },
            { title: "La mia lista", items: this.myListItems, condition: this.myListItems.length > 0 },
            { title: "Ultime Uscite", items: this.latestMovies, type: 'Film' },
            { title: "I più Votati", items: this.trending },
            { title: "Serie TV Popolari", items: this.topSeries, type: 'SerieTV' },
            { title: "Anime da non Perdere", items: this.popularAnime, type: 'Anime' },
        ];
        
        const visibleRows = allRows.filter(row => row.condition !== false && row.items.length > 0);

        const priorityRow = visibleRows.find(row => row.type === this.activeTheme);
        const otherRows = visibleRows.filter(row => row.type !== this.activeTheme);
        
        if (priorityRow) {
            const topRows = otherRows.filter(r => r.title === 'Continua a guardare' || r.title === 'La mia lista');
            const bottomRows = otherRows.filter(r => r.title !== 'Continua a guardare' && r.title !== 'La mia lista');
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
        if (nowPlayingItem && 'episode_number' in nowPlayingItem) {
            if (this.selectedItem && this.selectedItem.media_type === 'tv' && this.selectedItem.id === nowPlayingItem.show_id) {
                return this.selectedItem;
            }
            return this.allItems.find(item => item.id === nowPlayingItem.show_id);
        }
        return undefined;
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