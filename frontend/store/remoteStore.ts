import {makeAutoObservable, observable, runInAction, computed} from 'mobx';
import type {MediaItem, PlayableItem} from '../types.ts';
import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';
import {isSmartTV as detectSmartTV} from '../utils/device.ts';
import type {Dexie} from 'dexie';

type RemoteSlaveState = {
    isPlaying: boolean;
    nowPlayingItem: PlayableItem | null;
    isIntroSkippable?: boolean;
    currentTime?: number;
    duration?: number;
}

export type ActiveView = 'Home' | 'Serie TV' | 'Film' | 'Anime' | 'La mia lista' | 'Libreria';

class RemoteStore {
    // SmartTV / Remote State
    isSmartTV = false;
    isSmartTVPairingVisible = false;
    isRemoteMaster = false;
    slaveId: string | null = null;
    slaveShortCode: string | null = null;
    isRemoteMasterConnected = false;
    hasLoadedInitialData = false;
    
    // Master reconnection state
    masterReconnectAttempts = 0;
    masterReconnectTimer: number | null = null;
    isReconnecting = false;
    
    // Remote slave state
    remoteSlaveState: RemoteSlaveState | null = null;
    remoteSelectedItem: MediaItem | null = null;
    isRemoteDetailLoading = false;
    remoteAction: { type: string; payload?: any; id: number } | null = null;
    remoteFullItem: MediaItem | null = null;
    isRemoteFullItemLoading = false;
    isIntroSkippableOnSlave = false;
    shouldAutoFullscreen = false;
    
    @observable knownSlaves: { id: string; name: string; lastSeen: number; isOnline?: boolean }[] = [];
    
    // Connection health state
    missedPings = 0;
    connectionHealth: 'good' | 'degraded' | 'poor' = 'good';
    pingInterval: number | null = null;
    lastPingTime: number | null = null;
    
    // Media sync modal
    isMediaSyncModalOpen = false;
    mediaSyncTargetSlaveId: string | null = null;
    
    // QR Scanner state (needed for connectAsRemoteMaster)
    isQRScannerOpen = false;
    
    // Master UI state
    @observable _masterUiActiveView: ActiveView = 'Home';
    @observable _masterUiSelectedItem: MediaItem | null = null;
    
    constructor() {
        makeAutoObservable(this);
        if (detectSmartTV()) {
            this.isSmartTV = true;
        }
        websocketService.events.on('message', this.handleIncomingMessage);
        websocketService.events.on('open', this.initRemoteSession);
        websocketService.events.on('debug', this.addDebugMessage);
        websocketService.events.on('slaves-offline', this.handleSlavesOffline);
    }
    
    // Getters
    @computed get currentActiveView(): ActiveView {
        return this.isRemoteMaster ? this._masterUiActiveView : 'Home'; // Fallback - actual view comes from mediaStore
    }
    
    @computed get currentSelectedItem(): MediaItem | null {
        return this.isRemoteMaster ? this._masterUiSelectedItem : null;
    }
    
    handleSlavesOffline = () => {
        this.knownSlaves.forEach(slave => {
            slave.isOnline = false;
        });
    };
    
    addDebugMessage = (message: string) => {
        console.log('[RemoteStore]', message);
    };

    // Reference to showSnackbar (will be set by mediaStore)
    private showSnackbarFn: ((message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) => void) | null = null;

    setShowSnackbar(fn: (message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) => void) {
        this.showSnackbarFn = fn;
    }

    private showSnackbar(message: string, severity?: any, isTranslationKey?: boolean, translationValues?: any) {
        this.showSnackbarFn?.(message, severity, isTranslationKey, translationValues);
    }

    closeQRScanner = () => {
        this.isQRScannerOpen = false;
    };

    connectAsRemoteMaster = async (slaveId: string) => {
        const existingSlave = await db.knownSlaves.get(slaveId);

        runInAction(() => {
            this.isRemoteMaster = true;
            this.slaveId = slaveId;
            // Note: isQRScannerOpen is managed by mediaStore
            db.preferences.put({key: 'remoteMasterForSlaveId', value: slaveId});
        });

        // Prefer shortCode for reconnection if available, otherwise use full slaveId
        const shortCode = existingSlave?.shortCode;
        websocketService.registerMaster({slaveId: shortCode || slaveId});

        const slaveData = {
            id: slaveId,
            name: existingSlave?.name || `TV ${slaveId.substring(0, 4)}`,
            lastSeen: Date.now(),
            shortCode: shortCode // Preserve existing shortCode
        };
        await db.knownSlaves.put(slaveData);

        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });

        this.showSnackbar('notifications.connectedToTV', 'success', true);
    };

    disconnectRemoteMaster = () => {
        runInAction(() => {
            this.isRemoteMaster = false;
            this.slaveId = null;
            this.remoteSlaveState = null;
            this._masterUiActiveView = 'Home';
            this._masterUiSelectedItem = null;
            db.preferences.delete('remoteMasterForSlaveId');
            this.stopPingInterval();
            this.showSnackbar('notifications.disconnectedFromTV', 'info', true);
        });
    }

    reconnectToSlave = (slaveId: string) => {
        this.connectAsRemoteMaster(slaveId);
    };

    updateSlaveName = async (slaveId: string, name: string) => {
        await db.knownSlaves.update(slaveId, {name});
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    updateSlaveShortCode = async (slaveId: string, shortCode: string) => {
        await db.knownSlaves.update(slaveId, {shortCode});
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    forgetSlave = async (slaveId: string) => {
        if (this.isRemoteMaster && this.slaveId === slaveId) {
            this.disconnectRemoteMaster();
        }
        await db.knownSlaves.delete(slaveId);
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    setSlaveOnlineStatus = (slaveId: string, isOnline: boolean) => {
        runInAction(() => {
            const slave = this.knownSlaves.find(s => s.id === slaveId);
            if (slave) {
                slave.isOnline = isOnline;
            }
        });
    };

    stopPingInterval = () => {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.lastPingTime = null;
        this.missedPings = 0;
        this.connectionHealth = 'good';
        console.log('[RemoteStore] Ping interval stopped');
    };

    // Master reconnection methods
    handleSlaveDisconnected = (shouldOpenQRScanner = true) => {
        this.isRemoteMasterConnected = false;
        this.remoteSlaveState = null;
        this.startMasterReconnectTimer();
        if (shouldOpenQRScanner) {
            this.openQRScanner();
        }
        // Show snackbar will be handled by the component calling this
    };

    startMasterReconnectTimer = () => {
        if (this.masterReconnectTimer) {
            clearInterval(this.masterReconnectTimer);
        }
        this.masterReconnectAttempts = 0;
        this.isReconnecting = true;

        this.masterReconnectTimer = window.setInterval(() => {
            if (!this.isRemoteMasterConnected && this.slaveId && this.masterReconnectAttempts < 12) {
                websocketService.registerMaster({slaveId: this.slaveId});
                this.masterReconnectAttempts++;
                console.log(`[RemoteStore] Master reconnection attempt ${this.masterReconnectAttempts}/12`);
            } else if (this.masterReconnectAttempts >= 12 || this.isRemoteMasterConnected) {
                this.stopMasterReconnectTimer();
            }
        }, 5000);
    };

    stopMasterReconnectTimer = () => {
        if (this.masterReconnectTimer) {
            clearInterval(this.masterReconnectTimer);
            this.masterReconnectTimer = null;
        }
        this.isReconnecting = false;
    };

    // Trigger auto-fullscreen on slave when playback starts from master
    triggerAutoFullscreen = () => {
        if (!document.fullscreenElement) {
            this.shouldAutoFullscreen = true;
        }
    };
}

export const remoteStore = new RemoteStore();
