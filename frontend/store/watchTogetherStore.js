import {makeAutoObservable, runInAction} from 'mobx';

import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';
import {mediaStore} from './mediaStore';


class WatchTogetherStore {
    // Modal state
    watchTogetherModalOpen = false;
    
    // Room state
    roomId = null;
    hostId = null;
    isHost = false;
    participants = [];
    username = null;
    watchTogetherError = null;
    playbackState = {status: 'paused', time: 0};
    chatHistory = [];
    playbackListeners = [];
    joinRoomIdFromUrl = null;
    watchTogetherSelectedItem = null;
    myClientId = null;
    isCreatingRoom = false; // Flag to manage host's view after room creation

    constructor() {
        makeAutoObservable(this);
        // WebSocket events per Watch Together
        websocketService.events.on('message', this.handleWatchTogetherMessage);
    }
    
    // Playback listeners
    addPlaybackListener = (listener) => {
        this.playbackListeners.push(listener);
        return () => {
            this.playbackListeners = this.playbackListeners.filter(l => l !== listener);
        };
    };
    
    notifyPlaybackListeners = (state) => {
        this.playbackListeners.forEach(listener => listener(state));
    };
    
    // Watch Together Methods
    openWatchTogetherModal = (item) => {
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

    createRoom = (username) => {
        this.username = username;
        db.preferences.put({key: 'username', value: username});
        if (this.watchTogetherSelectedItem) {
            websocketService.createRoom({username, media: this.watchTogetherSelectedItem});
        }
    };

    joinRoom = (roomId, username) => {
        this.username = username;
        db.preferences.put({key: 'username', value: username});
        websocketService.joinRoom({roomId: roomId.toUpperCase(), username});
    };

    changeWatchTogetherMedia = (item) => {
        this.watchTogetherSelectedItem = item;
        if (this.isHost) {
            // Ensure video_url is set from video_urls for WebSocket broadcast
            const mediaToSend = {...item};
            if (!mediaToSend.video_url && (mediaToSend).video_urls?.length > 0) {
                mediaToSend.video_url = (mediaToSend).video_urls[0].url;
            }
            websocketService.selectMedia(mediaToSend);
        }
    };

    changeRoomCode = () => {
        websocketService.changeRoomCode();
    };

    // Send playback control to sync with other clients in Watch Together
    sendPlaybackControl = (state) => {
        if (this.roomId) {
            websocketService.playbackControl(state);
        }
    };

    sendChatMessage = (message) => {
        websocketService.sendChatMessage(message);
    };

    transferHost = (newHostId) => {
        websocketService.transferHost(newHostId);
    };

    changeName = (participantId, newName) => {
        // Optimistically update local participant state for immediate UI feedback
        const updatedParticipants = this.participants.map(p =>
            p.id === participantId ? {...p, name: newName} : p
        );
        const participantExists = updatedParticipants.some(p => p.id === participantId && p.name === newName);
        if (participantExists) {
            this.participants = updatedParticipants;
        }
        // Send to server for broadcast to all room members
        websocketService.changeName({participantId, name: newName});
    };

    // WebSocket message handler for Watch Together events
    handleWatchTogetherMessage = (message) => {
        const {type, payload} = message;

        switch (type) {
            case 'quix-room-update': {
                console.log(`[WatchTogetherStore] quix-room-update received: roomId=${payload.roomId}, participants count=${payload.participants?.length}, myClientId=${websocketService.clientId}`);
                
                runInAction(() => {
                    this.roomId = payload.roomId;
                    this.hostId = payload.hostId;
                    // Create a new array reference to ensure MobX properly detects the change
                    this.participants = payload.participants ? [...payload.participants] : [];
                    this.playbackState = payload.playbackState;
                    this.chatHistory = payload.chatHistory;
                    this.isHost = payload.isHost;
                    this.myClientId = websocketService.clientId;
                });

                if (payload.selectedMedia) {
                    const existing = mediaStore.cachedItems.get(payload.selectedMedia.id);
                    const isNonHost = !this.isHost;
                    const hasNewEpisode = this.watchTogetherSelectedItem?.id !== (payload.selectedMedia)?.id;

                    // Set watchTogetherSelectedItem from the payload's episode (which has video_urls)
                    runInAction(() => {
                        this.watchTogetherSelectedItem = payload.selectedMedia;
                    });

                    if (existing) {
                        mediaStore.selectMedia(existing, 'watchTogether');
                    } else {
                        mediaStore.selectMedia(payload.selectedMedia, 'watchTogether');
                    }

                    // For non-hosts, if the episode changed, start playback with the video_url from video_urls
                    if (isNonHost && hasNewEpisode && (payload.selectedMedia)?.video_urls?.length > 0) {
                        const episodeWithUrl = {
                            ...(payload.selectedMedia),
                            video_url: (payload.selectedMedia).video_urls[0].url
                        };
                        mediaStore.startPlayback(episodeWithUrl);
                    }
                }
                break;
            }
            case 'quix-playback-update': {
                const newState = payload.playbackState;
                runInAction(() => {
                    this.playbackState = newState;
                });
                this.notifyPlaybackListeners(newState);

                // If we are in a room, not the host, and not currently playing, this update means the host has started playback
                if (this.roomId && !this.isHost && !mediaStore.nowPlayingItem && this.watchTogetherSelectedItem && newState.status === 'playing') {
                    mediaStore.startPlayback(this.watchTogetherSelectedItem);
                }
                break;
            }
        }
    };
}

export const watchTogetherStore = new WatchTogetherStore();
