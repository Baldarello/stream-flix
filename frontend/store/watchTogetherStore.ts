import {makeAutoObservable} from 'mobx';
import type {ChatMessage, PlayableItem} from '../types.ts';
import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';

type PlaybackState = { status: 'playing' | 'paused'; time: number };

class WatchTogetherStore {
    // Modal state
    watchTogetherModalOpen = false;
    
    // Room state
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
    
    // Reference to showSnackbar (will be set by mediaStore)
    private showSnackbarFn: ((message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) => void) | null = null;

    setShowSnackbar(fn: (message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) => void) {
        this.showSnackbarFn = fn;
    }

    private showSnackbar(message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) {
        this.showSnackbarFn?.(message, severity, isTranslationKey, translationValues);
    }
    
    constructor() {
        makeAutoObservable(this);
        // WebSocket events per Watch Together
        websocketService.events.on('message', this.handleWatchTogetherMessage);
    }
    
    // Playback listeners
    addPlaybackListener = (listener: (state: PlaybackState) => void) => {
        this.playbackListeners.push(listener);
        return () => {
            this.playbackListeners = this.playbackListeners.filter(l => l !== listener);
        };
    };
    
    private notifyPlaybackListeners = (state: PlaybackState) => {
        this.playbackListeners.forEach(listener => listener(state));
    };
    
    // Watch Together Methods
    openWatchTogetherModal = (item: PlayableItem | null) => {
        this.watchTogetherError = null;
        if (item) {
            this.watchTogetherSelectedItem = item;
        }
        this.watchTogetherModalOpen = true;
    };

    closeWatchTogetherModal = () => {
        this.watchTogetherModalOpen = false;
        if (this.roomId) {
            websocketService.leaveRoom();
            this.roomId = null;
        }
    };

    createRoom = (username: string) => {
        this.username = username;
        db.preferences.put({key: 'username', value: username});
        if (this.watchTogetherSelectedItem) {
            websocketService.createRoom({username, media: this.watchTogetherSelectedItem});
        }
    };

    joinRoom = (roomId: string, username: string) => {
        this.username = username;
        db.preferences.put({key: 'username', value: username});
        websocketService.joinRoom({roomId: roomId.toUpperCase(), username});
    };

    changeWatchTogetherMedia = (item: PlayableItem) => {
        this.watchTogetherSelectedItem = item;
        if (this.isHost) {
            // Ensure video_url is set from video_urls for WebSocket broadcast
            const mediaToSend = {...item};
            if (!mediaToSend.video_url && (mediaToSend as any).video_urls?.length > 0) {
                mediaToSend.video_url = (mediaToSend as any).video_urls[0].url;
            }
            websocketService.selectMedia(mediaToSend);
        }
    };

    changeRoomCode = () => {
        websocketService.changeRoomCode();
    };
    
    // Placeholder per messaggi WebSocket
    handleWatchTogetherMessage = (message: any) => {
        // TODO: Implementare gestione messaggi Watch Together
    };
    
    // TODO: Implementare metodi Watch Together
}

export const watchTogetherStore = new WatchTogetherStore();
