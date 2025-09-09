import { makeAutoObservable, runInAction } from 'mobx';
import type { MediaItem } from '../types';
import { getTrending, getLatestMovies, getTopRatedSeries, getPopularAnime } from '../services/tmdbService';
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
  myList: number[] = [];
  isPlaying = false;
  nowPlayingItem: MediaItem | null = null;
  activeView: ActiveView = 'Home';

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

  constructor() {
    makeAutoObservable(this);
    this.isSmartTV = detectSmartTV();
    this.loadMyListFromStorage();
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
                nowPlayingItem: this.nowPlayingItem ? { ...this.nowPlayingItem, seasons: undefined } : null // Avoid sending bulky data
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
  
  toggleMyList = (item: MediaItem) => {
    const itemId = item.id;
    if (this.myList.includes(itemId)) {
      this.myList = this.myList.filter(id => id !== itemId);
    } else {
      this.myList.push(itemId);
    }
    this.saveMyListToStorage();
  }

  setActiveView = (view: ActiveView) => {
    if (this.activeView !== view) {
      this.selectedItem = null;
    }
    this.activeView = view;
    window.scrollTo(0, 0);
  }

  selectMedia = (item: MediaItem) => {
    this.selectedItem = item;
    window.scrollTo(0, 0);
  }

  closeDetail = () => {
    this.selectedItem = null;
  }
  
  startPlayback = (item: MediaItem) => {
    if (this.roomId && this.isHost) {
        this.sendPlaybackControl({ status: 'playing', time: 0 });
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
  }

  get heroContent(): MediaItem | undefined {
    return this.trending[0];
  }

  get allMovies(): MediaItem[] {
    const all = [...this.latestMovies, ...this.trending];
    return Array.from(new Map(all.map(item => [item.id, item])).values());
  }

  get allItems(): MediaItem[] {
     const all = [...this.trending, ...this.latestMovies, ...this.topSeries, ...this.popularAnime];
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
