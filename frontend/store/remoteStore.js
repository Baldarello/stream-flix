import {makeAutoObservable, observable, runInAction, computed} from 'mobx';

import {websocketService} from '../services/websocketService.js';
import {db} from '../services/db';
import {isSmartTV as detectSmartTV} from '../utils/device.js';
import {mediaStore} from './mediaStore';
import {getSeriesDetails, getSeriesEpisodes} from '../services/apiCall';






class RemoteStore {
    // ===== PRIVATE FIELDS =====
    _isSmartTV = false;
    _isSmartTVPairingVisible = false;
    _isRemoteMaster = false;
    _slaveId = null;
    _slaveShortCode = null;
    _isRemoteMasterConnected = false;
    _hasLoadedInitialData = false;
    _masterReconnectAttempts = 0;
    _masterReconnectTimer = null;
    _isReconnecting = false;
    _remoteSlaveState = null;
    _remoteSelectedItem = null;
    _isRemoteDetailLoading = false;
    _remoteAction = null;
    _remoteFullItem = null;
    _isRemoteFullItemLoading = false;
    _isIntroSkippableOnSlave = false;
    _shouldAutoFullscreen = false;
    _knownSlaves = [];
    _missedPings = 0;
    _connectionHealth = 'good';
    _pingInterval = null;
    _lastPingTime = null;
    _isMediaSyncModalOpen = false;
    _mediaSyncTargetSlaveId = null;
    __masterUiActiveView = 'Home';
    __masterUiSelectedItem = null;
    _isQRScannerOpen = false;

    // ===== PUBLIC GETTERS/SETTERS (for backwards compatibility) =====
    get isSmartTV() { return this._isSmartTV; }
    set isSmartTV(v) { this._isSmartTV = v; }
    get isSmartTVPairingVisible() { return this._isSmartTVPairingVisible; }
    set isSmartTVPairingVisible(v) { this._isSmartTVPairingVisible = v; }
    get isRemoteMaster() { return this._isRemoteMaster; }
    set isRemoteMaster(v) { this._isRemoteMaster = v; }
    get slaveId() { return this._slaveId; }
    set slaveId(v) { this._slaveId = v; }
    get slaveShortCode() { return this._slaveShortCode; }
    set slaveShortCode(v) { this._slaveShortCode = v; }
    get isRemoteMasterConnected() { return this._isRemoteMasterConnected; }
    set isRemoteMasterConnected(v) { this._isRemoteMasterConnected = v; }
    get hasLoadedInitialData() { return this._hasLoadedInitialData; }
    set hasLoadedInitialData(v) { this._hasLoadedInitialData = v; }
    get masterReconnectAttempts() { return this._masterReconnectAttempts; }
    set masterReconnectAttempts(v) { this._masterReconnectAttempts = v; }
    get masterReconnectTimer() { return this._masterReconnectTimer; }
    set masterReconnectTimer(v) { this._masterReconnectTimer = v; }
    get isReconnecting() { return this._isReconnecting; }
    set isReconnecting(v) { this._isReconnecting = v; }
    get remoteSlaveState() { return this._remoteSlaveState; }
    set remoteSlaveState(v) { this._remoteSlaveState = v; }
    get remoteSelectedItem() { return this._remoteSelectedItem; }
    set remoteSelectedItem(v) { this._remoteSelectedItem = v; }
    get isRemoteDetailLoading() { return this._isRemoteDetailLoading; }
    set isRemoteDetailLoading(v) { this._isRemoteDetailLoading = v; }
    get remoteAction() { return this._remoteAction; }
    set remoteAction(v) { this._remoteAction = v; }
    get remoteFullItem() { return this._remoteFullItem; }
    set remoteFullItem(v) { this._remoteFullItem = v; }
    get isRemoteFullItemLoading() { return this._isRemoteFullItemLoading; }
    set isRemoteFullItemLoading(v) { this._isRemoteFullItemLoading = v; }
    get isIntroSkippableOnSlave() { return this._isIntroSkippableOnSlave; }
    set isIntroSkippableOnSlave(v) { this._isIntroSkippableOnSlave = v; }
    get shouldAutoFullscreen() { return this._shouldAutoFullscreen; }
    set shouldAutoFullscreen(v) { this._shouldAutoFullscreen = v; }
    get knownSlaves() { return this._knownSlaves; }
    set knownSlaves(v) { this._knownSlaves = v; }
    get missedPings() { return this._missedPings; }
    set missedPings(v) { this._missedPings = v; }
    get connectionHealth() { return this._connectionHealth; }
    set connectionHealth(v) { this._connectionHealth = v; }
    get pingInterval() { return this._pingInterval; }
    set pingInterval(v) { this._pingInterval = v; }
    get lastPingTime() { return this._lastPingTime; }
    set lastPingTime(v) { this._lastPingTime = v; }
    get isMediaSyncModalOpen() { return this._isMediaSyncModalOpen; }
    set isMediaSyncModalOpen(v) { this._isMediaSyncModalOpen = v; }
    get mediaSyncTargetSlaveId() { return this._mediaSyncTargetSlaveId; }
    set mediaSyncTargetSlaveId(v) { this._mediaSyncTargetSlaveId = v; }
    get _masterUiActiveView() { return this.__masterUiActiveView; }
    set _masterUiActiveView(v) { this.__masterUiActiveView = v; }
    get _masterUiSelectedItem() { return this.__masterUiSelectedItem; }
    set _masterUiSelectedItem(v) { this.__masterUiSelectedItem = v; }
    get isQRScannerOpen() { return this._isQRScannerOpen; }
    set isQRScannerOpen(v) { this._isQRScannerOpen = v; }

    // Expose showSnackbar for methods that need to show notifications
    get showSnackbar() { return mediaStore.showSnackbar; }
    get hideSnackbar() { return mediaStore.hideSnackbar; }

    constructor() {
        makeAutoObservable(this, {
            _knownSlaves: observable,
            __masterUiActiveView: observable,
            __masterUiSelectedItem: observable,
        });
    }
    
    // Getters
    get currentActiveView() {
        return this.isRemoteMaster ? this._masterUiActiveView : 'Home';
    }
    
    get currentSelectedItem() {
        return this.isRemoteMaster ? this._masterUiSelectedItem : null;
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

    get remotePreviousEpisode() {
        const nowPlaying = this.remoteSlaveState?.nowPlayingItem;
        if (!nowPlaying || !('episode_number' in nowPlaying) || !this.remoteFullItem?.seasons) return null;

        const season = this.remoteFullItem.seasons.find(s => s.season_number === nowPlaying.season_number);
        if (!season?.episodes) return null;

        const currentEpisodeIndex = season.episodes.findIndex(ep => ep.id === nowPlaying.id);
        if (currentEpisodeIndex > 0) {
            return season.episodes[currentEpisodeIndex - 1];
        }
        return null;
    }
    
    handleSlavesOffline = () => {
        this.knownSlaves.forEach(slave => {
            slave.isOnline = false;
        });
    };
    
    addDebugMessage = (message) => {
        console.log('[RemoteStore]', message);
    };

    openQRScanner = () => {
        this.isQRScannerOpen = true;
        // Notify mediaStore to close profile drawer if needed
    };

    closeQRScanner = () => {
        this.isQRScannerOpen = false;
    };

    openMediaSyncModal = (slaveId) => {
        console.log(`[RemoteStore] openMediaSyncModal: slaveId='${slaveId}', current slaveId='${this.slaveId}'`);
        runInAction(() => {
            this.mediaSyncTargetSlaveId = slaveId;
            this.isMediaSyncModalOpen = true;
        });
    };

    closeMediaSyncModal = () => {
        runInAction(() => {
            this.isMediaSyncModalOpen = false;
            this.mediaSyncTargetSlaveId = null;
        });
    };

    connectAsRemoteMaster = async (slaveId) => {
        const existingSlave = await db.knownSlaves.get(slaveId);

        runInAction(() => {
            this.isRemoteMaster = true;
            this.slaveId = slaveId;
            this.isQRScannerOpen = false;
            db.preferences.put({key: 'remoteMasterForSlaveId', value: slaveId});
        });

        // Prefer shortCode for reconnection if available, otherwise use full slaveId
        const shortCode = existingSlave?.shortCode;
        websocketService.registerMaster({slaveId: shortCode || slaveId});

        const slaveData = {
            id: slaveId,
            name: existingSlave?.name || `TV ${slaveId.substring(0, 4)}`,
            lastSeen: Date.now(),
            shortCode: shortCode
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

    reconnectToSlave = (slaveId) => {
        this.connectAsRemoteMaster(slaveId);
    };

    updateSlaveName = async (slaveId, name) => {
        await db.knownSlaves.update(slaveId, {name});
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    updateSlaveShortCode = async (slaveId, shortCode) => {
        await db.knownSlaves.update(slaveId, {shortCode});
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    forgetSlave = async (slaveId) => {
        if (this.isRemoteMaster && this.slaveId === slaveId) {
            this.disconnectRemoteMaster();
        }
        await db.knownSlaves.delete(slaveId);
        const updatedSlaves = await db.knownSlaves.orderBy('lastSeen').reverse().toArray();
        runInAction(() => {
            this.knownSlaves = updatedSlaves;
        });
    };

    setSlaveOnlineStatus = (slaveId, isOnline) => {
        runInAction(() => {
            const slave = this.knownSlaves.find(s => s.id === slaveId);
            if (slave) {
                slave.isOnline = isOnline;
            }
        });
    };

    setRemoteSelectedItem = (item) => {
        this.selectMedia(item, 'remoteControl');
    };

    selectMedia = async (item, context = 'remoteControl') => {
        if (context === 'remoteControl') {
            runInAction(() => {
                this.remoteSelectedItem = item;
                this.isRemoteDetailLoading = true;
            });

            // Send command to slave to select the item
            this.sendRemoteCommand({command: 'select_item', item: item});

            // Fetch details for the master's display
            try {
                let fullItemDetails = mediaStore.cachedItems.get(item.id) || item;
                fullItemDetails = await mediaStore._fetchAndCacheMediaDetails(item.id, fullItemDetails);
                runInAction(() => {
                    if (this.remoteSelectedItem?.id === item.id) {
                        this.remoteSelectedItem = fullItemDetails;
                    }
                });
            } catch (error) {
                console.error("Failed to load details for remote control", error);
                this.showSnackbar('notifications.failedToLoadSeriesDetails', 'error', true);
            } finally {
                runInAction(() => {
                    this.isRemoteDetailLoading = false;
                });
            }
        }
    };

    // Send remote command to slave
    sendRemoteCommand = (command) => {
        if (this.isRemoteMaster && this.slaveId) {
            console.log(`[RemoteStore] sendRemoteCommand: isRemoteMaster=${this.isRemoteMaster}, slaveId='${this.slaveId}'`);
            websocketService.sendMessage({
                type: 'master-playback',
                payload: {...command, slaveId: this.slaveId}
            });
        } else {
            console.log(`[RemoteStore] sendRemoteCommand: NOT sending - isRemoteMaster=${this.isRemoteMaster}, slaveId=${this.slaveId}`);
        }
    };

    sendPlayCommandAndOptimisticallyUpdate = (item) => {
        this.sendRemoteCommand({command: 'play_item', item: item});
        runInAction(() => {
            this.remoteSlaveState = {
                ...(this.remoteSlaveState ?? {}),
                isPlaying: true,
                nowPlayingItem: item,
                currentTime: item.startTime ?? 0,
                duration: this.remoteSlaveState?.nowPlayingItem?.id === item.id ? this.remoteSlaveState.duration : 0,
            };
        });
    };

    playRemoteItem = async (item) => {
        // This method is called by the Master remote.
        // It needs to resolve the video URL before sending the command to the Slave.
        if (item.video_url) {
            this.sendPlayCommandAndOptimisticallyUpdate(item);
            mediaStore.closeLinkSelectionModal();
            return;
        }

        // --- Resolve URL ---
        const mediaId = 'episode_number' in item ? item.id : item.id;
        const allLinks = (item).video_urls || await mediaStore.getLinksForMedia(mediaId);

        if (allLinks.length === 0) {
            this.showSnackbar("notifications.noVideoLinks", "warning", true);
            return;
        }

        let candidateLinks = allLinks;
        const showId = 'show_id' in item ? (item).show_id : item.id;
        const preferredOrigin = mediaStore.preferredSources.get(showId);

        if (preferredOrigin) {
            const linksFromPreferred = allLinks.filter(l => {
                try {
                    return new URL(l.url).origin === preferredOrigin;
                } catch {
                    return false;
                }
            });
            if (linksFromPreferred.length > 0) {
                candidateLinks = linksFromPreferred;
            }
        }

        if (candidateLinks.length === 1) {
            this.sendPlayCommandAndOptimisticallyUpdate({...item, video_url: candidateLinks[0].url});
            return;
        }

        // More than one candidate, try preferred labels.
        const preferredLabels = mediaStore.preferredLabels;
        let bestLink;

        if (preferredLabels.length > 0) {
            bestLink = candidateLinks.find(l => l.label && preferredLabels.includes(l.label));
        }

        if (bestLink) {
            this.sendPlayCommandAndOptimisticallyUpdate({...item, video_url: bestLink.url});
        } else {
            // More than one link, no preferred label, must ask user.
            runInAction(() => {
                mediaStore.linksForSelection = candidateLinks;
                mediaStore.itemForLinkSelection = item;
                mediaStore.linkSelectionContext = 'remote';
                mediaStore.isLinkSelectionModalOpen = true;
            });
        }
    };

    stopRemotePlayback = () => {
        this.sendRemoteCommand({command: 'stop'});
    };

    fetchRemoteFullItem = async () => {
        if (!this.remoteSlaveState?.nowPlayingItem) return;
        const item = this.remoteSlaveState.nowPlayingItem;
        const showId = 'show_id' in item ? (item).show_id : item.id;

        runInAction(() => {
            this.isRemoteFullItemLoading = true;
        });
        try {
            const fullDetails = await getSeriesDetails(showId);
            const seasonsWithEpisodes = await Promise.all(
                fullDetails.seasons?.map(async (season) => {
                    const episodes = await getSeriesEpisodes(showId, season.season_number);
                    const episodesWithLinks = await Promise.all(episodes.map(async ep => {
                        const links = await mediaStore.getLinksForMedia(ep.id);
                        return {...ep, video_urls: links, video_url: links[0]?.url};
                    }));
                    return {...season, episodes: episodesWithLinks};
                }) || []
            );
            runInAction(() => {
                this.remoteFullItem = {...fullDetails, seasons: seasonsWithEpisodes};
            });
        } catch (error) {
            console.error("Failed to fetch full remote item details", error);
        } finally {
            runInAction(() => {
                this.isRemoteFullItemLoading = false;
            });
        }
    };

    // Handle remote command received from master (slave-side)
    handleRemoteCommand = (payload) => {
        const {command, item, time} = payload;

        // Commands that do NOT require an existing video element
        switch (command) {
            case 'play_item':
                mediaStore.startPlayback(item);
                this.sendSlaveStatusUpdate();
                this.triggerAutoFullscreen();
                return;
            case 'stop':
                mediaStore.stopPlayback();
                this.sendSlaveStatusUpdate();
                return;
            case 'select_item':
                mediaStore.selectMedia(item, 'detailView');
                this.sendSlaveStatusUpdate();
                return;
            case 'clear_selection':
                mediaStore.closeDetail();
                this.sendSlaveStatusUpdate();
                return;
            case 'request_status':
                this.sendSlaveStatusUpdate();
                return;
            case 'request-media-sync':
                if (payload.slaveId) {
                    this.openMediaSyncModal(payload.slaveId);
                }
                return;
        }

        // All subsequent commands require a video element
        const video = document.querySelector('video');
        if (!video) return;

        switch (command) {
            case 'play':
                if (mediaStore.nowPlayingItem) mediaStore.isPlaying = true;
                video.play();
                break;
            case 'pause':
                if (mediaStore.nowPlayingItem) mediaStore.isPlaying = false;
                video.pause();
                break;
            case 'seek_forward':
                video.currentTime += 10;
                break;
            case 'seek_backward':
                video.currentTime -= 10;
                break;
            case 'seek_to':
                video.currentTime = time;
                break;
            case 'skip_intro': {
                const remoteItem = this.remoteSlaveState?.nowPlayingItem;
                const activeItem = remoteItem ?? mediaStore.nowPlayingItem;
                if (video && activeItem) {
                    if ('intro_end_s' in activeItem && (activeItem).intro_end_s && (activeItem).intro_end_s > (activeItem).intro_start_s) {
                        video.currentTime = (activeItem).intro_end_s;
                    } else {
                        const showId = 'show_id' in activeItem ? (activeItem).show_id : (activeItem).id;
                        const skipDuration = mediaStore.showIntroDurations.get(showId) || 80;
                        video.currentTime = Math.min(video.duration, video.currentTime + skipDuration);
                    }
                }
                break;
            }
        }
        this.sendSlaveStatusUpdate();
    };

    sendSlaveStatusUpdate = () => {
        if (this.isSmartTV && this.slaveId) {
            const video = document.querySelector('video');
            websocketService.sendMessage({
                type: 'tv-status-update',
                payload: {
                    slaveId: this.slaveId,
                    isPlaying: mediaStore.isPlaying,
                    nowPlayingItem: mediaStore.nowPlayingItem,
                    isIntroSkippable: this.isIntroSkippableOnSlave,
                    currentTime: video?.currentTime,
                    duration: video?.duration
                }
            });
        }
    };

    setIntroSkippableOnSlave = (isSkippable) => {
        runInAction(() => {
            this.isIntroSkippableOnSlave = isSkippable;
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

    startPingInterval = () => {
        this.stopPingInterval();
        
        runInAction(() => {
            this.pingInterval = window.setInterval(() => {
                if (this.isRemoteMaster && this.slaveId && this.isRemoteMasterConnected) {
                    websocketService.sendMessage({
                        type: 'heartbeat-ping',
                        payload: {slaveId: this.slaveId}
                    });
                    this.lastPingTime = Date.now();
                    console.log("[RemoteStore] Sent heartbeat-ping to slave");

                    // Check for missed ping after timeout
                    setTimeout(() => {
                        if (this.lastPingTime && Date.now() - this.lastPingTime >= 12000) {
                            runInAction(() => {
                                this.missedPings++;
                                console.log(`[RemoteStore] Missed ping detected, missedPings=${this.missedPings}`);
                                if (this.missedPings >= 3) {
                                    this.connectionHealth = 'poor';
                                    console.log("[RemoteStore] Connection health: POOR");
                                } else if (this.missedPings >= 1) {
                                    this.connectionHealth = 'degraded';
                                    console.log("[RemoteStore] Connection health: DEGRADED");
                                }
                            });
                        }
                    }, 12000);
                }
            }, 10000);
        });
        console.log('[RemoteStore] Ping interval started');
    };

    // Master reconnection methods
    handleSlaveDisconnected = (shouldOpenQRScanner = true) => {
        runInAction(() => {
            this.isRemoteMasterConnected = false;
            this.remoteSlaveState = null;
        });
        this.startMasterReconnectTimer();
        if (shouldOpenQRScanner) {
            this.openQRScanner();
        }
        this.showSnackbar('notifications.slaveDisconnected', 'warning', true);
    };

    startMasterReconnectTimer = () => {
        if (this.masterReconnectTimer) {
            clearInterval(this.masterReconnectTimer);
        }
        this.masterReconnectAttempts = 0;
        this.isReconnecting = true;

        this.masterReconnectTimer = window.setInterval(() => {
            if (!this.isRemoteMasterConnected && this.slaveId && this.masterReconnectAttempts < 12) {
                // Use shortCode if available, otherwise full slaveId
                const payload = this.slaveShortCode 
                    ? {slaveId: this.slaveShortCode} 
                    : {slaveId: this.slaveId};
                websocketService.sendMessage({type: 'master-connect', payload});
                this.masterReconnectAttempts++;
                console.log(`[RemoteStore] Master reconnection attempt ${this.masterReconnectAttempts}/12 using ${this.slaveShortCode ? "shortCode" : "fullId"}`);
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
            runInAction(() => {
                this.shouldAutoFullscreen = true;
            });
        }
    };

    // Sync media from master to slave
    syncMediaFromMaster = async (mediaItems) => {
        try {
            const {db: localDb} = await import('../services/db.ts');

            for (let i = 0; i < mediaItems.length; i++) {
                const {mediaItem, links} = mediaItems[i];

                // Save the full media item metadata
                await localDb.cachedItems.put(mediaItem);

                // Add to myList
                await localDb.myList.put({id: mediaItem.id, order: Date.now() + i});

                // Save all links (strip the id field to let IndexedDB auto-assign)
                if (links && links.length > 0) {
                    const linksToSave = links.map(({id: _id, ...link}) => link);
                    await localDb.mediaLinks.bulkPut(linksToSave);

                    // Clear the in-memory mediaLinks cache for these media IDs to prevent stale data
                    for (const link of linksToSave) {
                        mediaStore.mediaLinks.delete(link.mediaId);
                    }
                }

                // Send progress update back to master
                websocketService.sendMessage({
                    type: 'sync-progress-update',
                    payload: {completed: i + 1, total: mediaItems.length}
                });
            }

            this.showSnackbar(`Sincronizzati ${mediaItems.length} contenuti sulla TV`, 'success', true);
            websocketService.sendMessage({type: 'tv-sync-completed'});

            // Reload the local data so the slave's UI reflects the new content
            await mediaStore.reloadAllData();

        } catch (error) {
            console.error('Error syncing media from master:', error);
            websocketService.sendMessage({type: 'tv-sync-error', payload: {error: 'Failed to sync media'}});
        }
    };

    // Initialize remote session (register as slave or master)
    initRemoteSession = () => {
        // For slave: only register after initial data has been loaded
        if (this.isSmartTV) {
            if (!this.hasLoadedInitialData) {
                console.log("[RemoteStore] initRemoteSession: waiting for initial data to load before registering slave");
                return;
            }
            if (!websocketService.isConnected) {
                console.log("[RemoteStore] initRemoteSession: websocket not connected, will retry on reconnect");
                return;
            }
            const payload = {};
            if (this.slaveId) payload.slaveId = this.slaveId;
            if (this.slaveShortCode) payload.shortCode = this.slaveShortCode;
            console.log(`[RemoteStore] initRemoteSession: registering slave with slaveId=${this.slaveId || "null (will be created)"}, shortCode=${this.slaveShortCode || "null"}`);
            websocketService.sendMessage({type: 'tv-register', payload});
        } else if (this.isRemoteMaster && this.slaveId) {
            // When the WebSocket connects (or reconnects), if this client is a master,
            // it needs to re-register with its slave to re-establish the control session.
            websocketService.sendMessage({type: 'master-connect', payload: {slaveId: this.slaveId}});
            // Request the current status from the slave to sync the UI
            this.sendRemoteCommand({command: 'request_status'});
        }
    };

    // WebSocket message handler
    handleIncomingMessage = (message) => {
        runInAction(() => {
            const {type, payload} = message;
            this.addDebugMessage(`IN: ${type} ${JSON.stringify(payload || {})}`);

            switch (type) {
                case 'tv-registration-confirmed':
                    this.slaveId = payload.tvId;
                    this.slaveShortCode = payload.shortCode;
                    if (this.isSmartTV) {
                        db.preferences.put({key: 'selfSlaveId', value: payload.tvId});
                        db.preferences.put({key: 'selfShortCode', value: payload.shortCode});
                    }
                    this.showSnackbar('notifications.tvReady', 'info', true);
                    break;
                case 'connection-established':
                    if ((payload)?.role === 'master') {
                        console.log(`[RemoteStore] connection-established: masterId=${(payload).masterId}, tvId=${(payload).tvId}`);
                        runInAction(() => {
                            this.isRemoteMasterConnected = true;
                            this.slaveId = (payload).tvId;
                        });
                        this.startPingInterval();
                        this.stopMasterReconnectTimer();
                        if (this.slaveId) {
                            this.openMediaSyncModal(this.slaveId);
                        }
                        this.showSnackbar('notifications.remoteConnected', 'success', true);
                    } else if ((payload)?.role === 'slave') {
                        console.log(`[RemoteStore] connection-established: slave connected to master ${(payload).masterId}`);
                        runInAction(() => {
                            this.isSmartTVPairingVisible = false;
                            this.isRemoteMasterConnected = true;
                        });
                    }
                    break;
                case 'connection-error':
                    console.log(`[RemoteStore] connection-error: ${(payload).error} - ${(payload).message}`);
                    if ((payload).error === 'TV_BUSY') {
                        this.showSnackbar('notifications.slaveBusy', 'warning', true);
                    } else if ((payload).error === 'TV_NOT_FOUND') {
                        this.showSnackbar('notifications.slaveNotFound', 'error', true);
                        this.handleReconnectFailed((payload).shortCode);
                    } else if ((payload).error === 'TV_OFFLINE') {
                        this.showSnackbar('notifications.slaveOffline', 'warning', true);
                    } else {
                        this.showSnackbar((payload).message || 'Connection failed', 'error', true);
                    }
                    break;
                case 'connection-terminated':
                    console.log(`[RemoteStore] connection-terminated: target=${(payload).target}, reason=${(payload).reason}`);
                    if ((payload).target === 'slave') {
                        this.setSlaveOnlineStatus(this.slaveId, false);
                        this.handleSlaveDisconnected((payload).reason !== 'slave-initiated');
                        this.stopPingInterval();
                    } else if ((payload).target === 'master') {
                        runInAction(() => {
                            this.isRemoteMasterConnected = false;
                        });
                        this.knownSlaves.forEach(slave => {
                            slave.isOnline = false;
                        });
                        this.stopPingInterval();
                        this.showSnackbar('notifications.masterDisconnected', 'info', true);
                    }
                    break;
                case 'playback-status':
                    runInAction(() => {
                        this.remoteSlaveState = payload;
                    });
                    break;
                case 'heartbeat-ping':
                    console.log("[RemoteStore] Received heartbeat-ping from", (payload).source);
                    if (this.slaveId) {
                        websocketService.sendMessage({
                            type: 'heartbeat-pong',
                            payload: {target: 'master', tvId: this.slaveId}
                        });
                    }
                    break;
                case 'heartbeat-pong':
                    console.log("[RemoteStore] Received heartbeat-pong");
                    runInAction(() => {
                        this.missedPings = 0;
                        this.connectionHealth = 'good';
                    });
                    break;
                case 'sync-response':
                    if ((payload).accepted) {
                        this.showSnackbar('notifications.syncCompleted', 'success', true);
                    } else {
                        this.showSnackbar('notifications.syncCancelled', 'info', true);
                    }
                    break;
                case 'error':
                case 'command-error':
                    console.log("[RemoteStore] Error received:", payload);
                    this.showSnackbar((payload).message || 'An error occurred', 'error', true);
                    break;
            }
        });
    };

    // Handle reconnect failure
    handleReconnectFailed = (shortCodeAvailable) => {
        console.log(`[RemoteStore] Reconnect failed. shortCode available: ${!!shortCodeAvailable}`);
        this.stopMasterReconnectTimer();
        if (shortCodeAvailable && this.slaveShortCode === shortCodeAvailable) {
            runInAction(() => {
                this.slaveShortCode = null;
            });
        }
        runInAction(() => {
            this.isReconnecting = false;
        });
        console.log("[RemoteStore] Reconnect stopped. User should scan QR code to reconnect.");
    };
}

export const remoteStore = new RemoteStore();
