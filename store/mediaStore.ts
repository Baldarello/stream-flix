import { makeAutoObservable, runInAction } from 'mobx';
import type { MediaItem, PlayableItem, Episode, ViewingHistoryItem } from '../types';
import { getTrending, getLatestMovies, getTopRatedSeries, getPopularAnime, getSeriesDetails, getSeriesEpisodes, searchShow } from '../services/apiCall';
import { websocketService, ChatMessage } from '../services/websocketService';
import { isSmartTV as detectSmartTV } from '../utils/device';

export type ActiveView = 'Home' | 'Serie TV' | 'Film' | 'Anime' | 'La mia lista';

type PlaybackState = { status: 'playing' | 'paused'; time: number };

type RemoteSlaveState = {
  isPlaying: boolean;
  nowPlayingItem: MediaItem | null;
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
  playbackState: PlaybackState = { status: 'paused', time: 0 };
  chatHistory: ChatMessage[] = [];
  private playbackListeners: ((state: PlaybackState) => void)[] = [];

  // Remote Control State
  isSmartTV = false;
  isRemoteMaster = false;
  slaveId: string | null = null;
  isRemoteMasterConnected = false;
  remoteSlaveState: RemoteSlaveState | null = null;

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

  constructor() {
    makeAutoObservable(this);
    this.isSmartTV = detectSmartTV();
    this.loadMyListFromStorage();
    this.loadCachedItemsFromStorage();
    this.loadEpisodeLinks();
    this.loadViewingHistoryFromStorage();
    this.loadShowIntroDurationsFromStorage();
    websocketService.events.on('message', this.handleIncomingMessage);
  }
  
  initRemoteSession = () => {
    const params = new URLSearchParams(window.location.search);
    const remoteForId = params.get('remote_for');

    if (remoteForId) {
        runInAction(() => {
            this.isRemoteMaster = true;
            this.slaveId = remoteForId;
        });
        websocketService.sendMessage({ type: 'register-master', payload: { slaveId: remoteForId }});
    } else if (this.isSmartTV) {
        websocketService.sendMessage({ type: 'register-slave' });
    }
  }

  get myClientId(): string {
    return websocketService.clientId;
  }

  transferHost = (newHostId: string) => {
    if (this.roomId && this.isHost) {
        websocketService.sendMessage({
            type: 'transfer-host',
            payload: { roomId: this.roomId, newHostId }
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
        switch(message.type) {
            case 'room-update':
                this.roomId = message.payload.roomId;
                this.hostId = message.payload.hostId;
                this.isHost = message.payload.isHost;
                this.participants = message.payload.participants;
                this.selectedItem = message.payload.selectedMedia;
                this.chatHistory = message.payload.chatHistory ?? [];
                this.watchTogetherError = null;
                if (!this.isHost && this.watchTogetherModalOpen) {
                  // Keep modal open, but view will change to waiting state
                }
                if (message.payload.playbackState.status === 'playing') {
                    this.nowPlayingItem = message.payload.selectedMedia;
                    this.isPlaying = true;
                }
                break;
            case 'playback-update':
                if (this.roomId) {
                    this.playbackState = message.payload.playbackState;
                    this.isPlaying = this.playbackState.status === 'playing';
                    if(this.isPlaying && !this.nowPlayingItem) {
                        this.nowPlayingItem = this.selectedItem;
                    }
                    this.playbackListeners.forEach(l => l(this.playbackState));
                }
                break;
            case 'error':
                this.watchTogetherError = message.payload.message;
                this.username = null; // force user to re-enter username
                break;
            
            // Remote Control Messages
            case 'slave-registered':
                this.slaveId = message.payload.slaveId;
                break;
            case 'master-connected':
                this.isRemoteMasterConnected = true;
                break;
            case 'remote-command-received':
                this.handleRemoteCommand(message.payload);
                break;
            case 'slave-status-update':
                 if (this.isRemoteMaster) {
                    this.remoteSlaveState = message.payload;
                }
                break;
        }
    });
  };
  
  private handleRemoteCommand(payload: { command: string, media?: MediaItem }) {
    if (this.isSmartTV) {
        switch (payload.command) {
            case 'select_media':
                if (payload.media) this.startPlayback(payload.media);
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
        }
    }
  }

  sendSlaveStatusUpdate = () => {
    if (this.isSmartTV && this.isRemoteMasterConnected) {
        websocketService.sendMessage({
            type: 'slave-status-update',
            payload: {
                slaveId: this.slaveId,
                isPlaying: this.isPlaying,
                nowPlayingItem: this.nowPlayingItem && 'media_type' in this.nowPlayingItem ? { ...this.nowPlayingItem, seasons: undefined } : null // Avoid sending bulky data
            }
        });
    }
  }

  sendRemoteCommand = (payload: { command: string, media?: MediaItem }) => {
    if (this.isRemoteMaster && this.slaveId) {
        websocketService.sendMessage({
            type: 'remote-command',
            payload: {
                ...payload,
                slaveId: this.slaveId
            }
        })
    }
  }

  openWatchTogetherModal = (item: MediaItem) => {
    this.selectedItem = item;
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
  };
  
  createRoom = (username: string) => {
    if (this.selectedItem && username.trim()) {
      this.username = username.trim();
      this.watchTogetherError = null;
      websocketService.sendMessage({ type: 'create-room', payload: { media: this.selectedItem, username: this.username } });
    }
  };

  joinRoom = (roomId: string, username: string) => {
    if (roomId.trim() && username.trim()) {
      this.username = username.trim();
      this.watchTogetherError = null;
      websocketService.sendMessage({ type: 'join-room', payload: { roomId: roomId.trim(), username: this.username } });
    }
  };

  leaveRoom = () => {
    if (this.roomId) {
        websocketService.sendMessage({ type: 'leave-room', payload: { roomId: this.roomId } });
    }
    this.resetWatchTogetherState();
  };

  sendPlaybackControl = (state: PlaybackState) => {
    if (this.roomId && this.isHost) {
      websocketService.sendMessage({
        type: 'playback-control',
        payload: { roomId: this.roomId, playbackState: state }
      });
    }
  }

  sendChatMessage = (message: { text?: string, image?: string }) => {
    if (this.roomId && (message.text?.trim() || message.image)) {
        websocketService.sendMessage({
            type: 'chat-message',
            payload: { roomId: this.roomId, message }
        });
    }
  }

  loadMyListFromStorage() {
    const storedList = localStorage.getItem('myList');
    if (storedList) {
      this.myList = JSON.parse(storedList);
    }
  }

  saveMyListToStorage() {
    localStorage.setItem('myList', JSON.stringify(this.myList));
  }
  
  loadCachedItemsFromStorage() {
    const storedCache = localStorage.getItem('cachedItems');
    if (storedCache) {
      try {
        this.cachedItems = new Map(JSON.parse(storedCache));
      } catch (e) {
        console.error("Failed to parse cached items from localStorage", e);
        this.cachedItems = new Map();
      }
    }
  }

  saveCachedItemsToStorage() {
    // Limit cache size to avoid localStorage quota issues
    const CACHE_LIMIT = 50;
    const entries = Array.from(this.cachedItems.entries());
    if (entries.length > CACHE_LIMIT) {
      // Evict oldest entries by keeping the newest ones
      const trimmedEntries = entries.slice(entries.length - CACHE_LIMIT);
      this.cachedItems = new Map(trimmedEntries);
    }
    localStorage.setItem('cachedItems', JSON.stringify(Array.from(this.cachedItems.entries())));
  }

  toggleMyList = (item: MediaItem) => {
    const itemId = item.id;
    if (this.myList.includes(itemId)) {
      this.myList = this.myList.filter(id => id !== itemId);
    } else {
      this.myList.push(itemId);
      this.cachedItems.set(itemId, item);
      this.saveCachedItemsToStorage();
    }
    this.saveMyListToStorage();
  }

  // --- Viewing History Methods ---
  loadViewingHistoryFromStorage = () => {
    const storedHistory = localStorage.getItem('viewingHistory');
    if (storedHistory) {
      this.viewingHistory = JSON.parse(storedHistory);
    }
  }

  saveViewingHistoryToStorage = () => {
    const limitedHistory = this.viewingHistory.slice(0, 100);
    localStorage.setItem('viewingHistory', JSON.stringify(limitedHistory));
  }

  addViewingHistoryEntry = (showId: number, episodeId: number) => {
    const updatedHistory = this.viewingHistory.filter(item => item.episodeId !== episodeId);
    updatedHistory.unshift({
      showId,
      episodeId,
      watchedAt: Date.now(),
    });
    this.viewingHistory = updatedHistory;
    this.saveViewingHistoryToStorage();
  }

  // --- Custom Intro Duration Methods ---
  loadShowIntroDurationsFromStorage = () => {
    const storedDurations = localStorage.getItem('showIntroDurations');
    if (storedDurations) {
        try {
            this.showIntroDurations = new Map(JSON.parse(storedDurations));
        } catch (e) {
            console.error("Failed to parse show intro durations from localStorage", e);
            this.showIntroDurations = new Map();
        }
    }
  }

  saveShowIntroDurationsToStorage = () => {
    localStorage.setItem('showIntroDurations', JSON.stringify(Array.from(this.showIntroDurations.entries())));
  }

  setShowIntroDuration = (showId: number, duration: number) => {
    if (duration >= 0) {
        this.showIntroDurations.set(showId, duration);
    } else {
        this.showIntroDurations.delete(showId);
    }
    this.saveShowIntroDurationsToStorage();
  }

  setActiveView = (view: ActiveView) => {
    if (this.activeView !== view) {
      this.selectedItem = null;
    }
    this.activeView = view;
    window.scrollTo(0, 0);
  }

  // --- Search Methods ---
  toggleSearch = (isActive: boolean) => {
    this.isSearchActive = isActive;
    if (!isActive) {
      this.searchQuery = '';
      this.searchResults = [];
    } else {
      // When opening search, we might want to clear previous selection
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
                // Optionally set an error state here
            });
        }
    }, 500); // 500ms debounce
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
    this.isSearchActive = false; // Close search when an item is selected
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedItem = item; // Show basic info immediately
    window.scrollTo(0, 0);
  
    if (item.media_type === 'tv') {
      this.isDetailLoading = true;
      try {
        const seriesDetails = await getSeriesDetails(item.id);
        const seasonsWithEpisodes = await Promise.all(
          seriesDetails.seasons?.map(async (season) => {
            const episodes = await getSeriesEpisodes(item.id, season.season_number);
            return { ...season, episodes };
          }) ?? []
        );
        runInAction(() => {
          this.selectedItem = { ...seriesDetails, seasons: seasonsWithEpisodes };
          this.applyEpisodeLinksToMedia([this.selectedItem]);
        });
      } catch (error) {
        console.error("Failed to fetch series details and episodes", error);
        // Optionally set an error state
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
    if (this.roomId && this.isHost) {
        this.sendPlaybackControl({ status: 'playing', time: 0 });
    }
    if ('episode_number' in item) {
      this.addViewingHistoryEntry(item.show_id, item.id);
      
      // New logic to calculate intro end time dynamically
      if (item.intro_start_s !== undefined) {
          const customDuration = this.showIntroDurations.get(item.show_id);
          const introDuration = customDuration !== undefined ? customDuration : 80; // Default to 80 seconds
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
    this.sendSlaveStatusUpdate(); // Notify remote master
    this.closeEpisodesDrawer();
  }

  // --- Episode Linking Methods ---

  openLinkEpisodesModal = (item: MediaItem) => {
    this.linkingEpisodesForItem = item;
    this.isLinkEpisodesModalOpen = true;
  };

  closeLinkEpisodesModal = () => {
    this.isLinkEpisodesModalOpen = false;
    this.linkingEpisodesForItem = null;
  };

  loadEpisodeLinks = () => {
    const storedLinks = localStorage.getItem('episodeLinks');
    if (storedLinks) {
      this.episodeLinks = new Map(JSON.parse(storedLinks));
    }
  };

  saveEpisodeLinks = () => {
    localStorage.setItem('episodeLinks', JSON.stringify(Array.from(this.episodeLinks.entries())));
  };

  setEpisodeLinksForSeason = (payload: { seasonNumber: number; method: 'pattern' | 'list' | 'json'; data: any }) => {
    const { seasonNumber, method, data } = payload;
    const item = this.linkingEpisodesForItem;

    if (!item || !item.seasons) return;

    const season = item.seasons.find(s => s.season_number === seasonNumber);
    if (!season) return;

    let links: (string | undefined)[] = [];

    switch (method) {
        case 'pattern':
            const { pattern, padding } = data;
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

    season.episodes.forEach((episode, index) => {
        if (links[index]) {
            this.episodeLinks.set(episode.id, links[index] as string);
        }
    });

    this.saveEpisodeLinks();
    this.applyEpisodeLinksToMedia([item]); // Re-apply to the current item
    this.closeLinkEpisodesModal();
  };

  // --- Player Episode Drawer Methods ---
  openEpisodesDrawer = () => {
    this.isEpisodesDrawerOpen = true;
  }
  closeEpisodesDrawer = () => {
    this.isEpisodesDrawerOpen = false;
  }

  // --- Profile Drawer & QR Scanner Methods ---
  toggleProfileDrawer = (isOpen: boolean) => {
    this.isProfileDrawerOpen = isOpen;
  }

  openQRScanner = () => {
    this.isProfileDrawerOpen = false; // Close drawer when opening scanner
    this.isQRScannerOpen = true;
  }

  closeQRScanner = () => {
    this.isQRScannerOpen = false;
  }

  get heroContent(): MediaItem | undefined {
    return this.trending[0];
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

  // FIX: Replaced `this.nowPlayingItem` with a local constant. This allows TypeScript's
  // type narrowing to correctly infer that `nowPlayingItem` is an episode within the
  // if-block, resolving an error when accessing the episode-specific `show_id` property.
  get currentShow(): MediaItem | undefined {
    const nowPlayingItem = this.nowPlayingItem;
    if (nowPlayingItem && 'episode_number' in nowPlayingItem) {
      // Prioritize selectedItem if it's the show being played, as it's guaranteed to have full season details.
      if (this.selectedItem && this.selectedItem.media_type === 'tv' && this.selectedItem.id === nowPlayingItem.show_id) {
        return this.selectedItem;
      }
      // Fallback for cases where selectedItem is not set (e.g., deep link, history)
      return this.allItems.find(item => item.id === nowPlayingItem.show_id);
    }
    return undefined;
  }

  // FIX: Replaced `this.nowPlayingItem` with a local constant. This allows TypeScript's
  // type narrowing to correctly infer that `nowPlayingItem` is an episode within the
  // if-block, resolving an error when accessing the episode-specific `season_number` property.
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