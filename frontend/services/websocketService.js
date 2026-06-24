// This service manages the WebSocket connection to the live server.

// Get WebSocket URL from environment or use production default
const WEBSOCKET_URL = import.meta.env?.VITE_WS_URL || 'ws://localhost:3011/ws';

// Parse TURN/STUN servers configuration from environment
// This is used for WebRTC connections and WebSocket-over-TURN tunneling in restrictive networks
const TURN_ENV_URL = import.meta.env?.VITE_TND_TURN_URL;
let ICE_SERVERS = [];

try {
    if (TURN_ENV_URL) {
        ICE_SERVERS = JSON.parse(TURN_ENV_URL);
        console.log(`[WebSocket] ICE servers loaded: ${ICE_SERVERS.length} server(s) configured`);
        // Log server URLs for diagnostics (without credentials)
        ICE_SERVERS.forEach((server, index) => {
            const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
            console.log(`[WebSocket] ICE server ${index + 1}: ${urls.join(', ')}`);
        });
    } else {
        console.log('[WebSocket] No VITE_TND_TURN_URL configured, ICE servers not available');
    }
} catch (error) {
    console.error('[WebSocket] Error parsing VITE_TND_TURN_URL:', error);
    ICE_SERVERS = [];
}

// Diagnostic logging for WebSocket URL
console.log(`[WebSocket] Initializing with URL: ${WEBSOCKET_URL}`);
console.log(`[WebSocket] Environment VITE_WS_URL: ${import.meta.env?.VITE_WS_URL || 'not set'}`);

class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, listener) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(listener);
    }

    off(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(l => l(data));
        }
    }
}

class WebSocketService {
    constructor() {
        this.ws = null;
        this.events = new EventEmitter();
        this.reconnectInterval = 5000; // Reconnect every 5 seconds
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this._clientId = null;
        this.isConnected = false;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = 60000; // Server heartbeat timeout
        this.pingTimeout = null;
        this.connect();
    }

    get clientId() {
        return this._clientId;
    }

    /**
     * Returns the configured ICE servers for TURN/STUN.
     * These can be used for WebRTC connections or WebSocket-over-TURN tunneling.
     * @returns {Array} Array of ICE server configurations
     */
    getIceServers() {
        return ICE_SERVERS;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return; // Don't try to connect if already open or connecting
        }
        console.log(`[WebSocket] Attempting to connect to ${WEBSOCKET_URL}...`);
        this.events.emit('debug', 'Tentativo di connessione...');
        this.ws = new WebSocket(WEBSOCKET_URL);

        this.ws.onopen = () => {
            console.log('WebSocket connection established.');
            this.events.emit('debug', 'Connessione aperta.');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            // Client ID is now null until the server assigns one.
            this._clientId = null;
            this.events.emit('open');

            // Start heartbeat
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log(`[WebSocket] Received message: type=${message.type}`);

                // Handle ping from server (for heartbeat)
                if (message.type === 'ping') {
                    this.sendMessage({type: 'pong'});
                    return;
                }

                // Handle the 'connected' message from the server to get our unique ID
                if (message.type === 'connected' && message.payload?.clientId) {
                    console.log(`[WebSocket] Received client ID: ${message.payload.clientId}`);
                    this.setClientId(message.payload.clientId);
                }

                // Handle slave not connected error
                if (message.type === 'quix-slave-not-connected') {
                    console.log('[WebSocket] Slave not connected:', message.payload);
                    this.events.emit('slave-not-connected', message.payload);
                }

                // Debug log for quix-room-update
                if (message.type === 'quix-room-update') {
                    console.log(`[WebSocket] quix-room-update payload:`, message.payload);
                }

                // Log incoming chat messages with image info
                if (message.type === 'quix-room-update' && message.payload?.chatHistory) {
                    const lastMsg = message.payload.chatHistory[message.payload.chatHistory.length - 1];
                    if (lastMsg) {
                        const hasText = !!lastMsg.text;
                        const hasImage = !!lastMsg.image;
                        const imageSize = lastMsg.image ? Math.round(lastMsg.image.length * 0.75) : 0;
                        console.log(`[WebSocket] Chat message received: hasText=${hasText}, hasImage=${hasImage}, imageSize=~${(imageSize / 1024).toFixed(1)}KB`);
                    }
                }

                this.events.emit('message', message);
            } catch (error) {
                console.error('Error parsing incoming WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket connection closed. Attempting to reconnect...');
            this.events.emit('debug', `Connessione chiusa. Codice: ${event.code}, Motivo: "${event.reason || 'Nessun motivo'}"`);
            this.isConnected = false;
            this.stopHeartbeat();
            this.ws = null;

            // Mark all slaves as offline
            this.events.emit('slaves-offline');

            // Exponential backoff for reconnection
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000);
                console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.connect(), delay);
                this.reconnectAttempts++;
            } else {
                console.error('Max reconnection attempts reached. Please refresh the page.');
                this.events.emit('debug', 'Connessione fallita dopo multipli tentativi. Ricarica la pagina.');
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.events.emit('debug', 'Errore WebSocket.');
            // onclose will be called next, triggering the reconnect logic.
        };
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Log message info, but handle large payloads (like images) gracefully
            const messageType = message.type;
            if (messageType === 'quix-chat-message' && message.payload?.message) {
                const { text, image } = message.payload.message;
                const hasText = !!text;
                const hasImage = !!image;
                const imageSize = image ? Math.round(image.length * 0.75) : 0; // Estimate original size from base64
                console.log(`[WebSocket] Sending message: type=${messageType}, hasText=${hasText}, hasImage=${hasImage}, imageSize=~${(imageSize / 1024).toFixed(1)}KB`);
            } else {
                console.log(`[WebSocket] Sending message: type=${messageType}`);
            }
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', message);
        }
    }

    // ==================== WATCHTOGETHER METHODS ====================

    /**
     * Register as a slave (TV) with the server
     * @param {Object} options - Registration options
     * @param {string} [options.slaveId] - Existing slave ID for reconnection
     * @param {string} [options.shortCode] - Short code for quick reconnection
     */
    registerSlave(options = {}) {
        this.sendMessage({type: 'quix-register-slave', payload: options});
    }

    /**
     * Leave the current watch together room
     */
    leaveRoom() {
        this.sendMessage({type: 'quix-leave-room'});
    }

    /**
     * Create a new watch together room
     * @param {Object} options - Room creation options
     * @param {string} options.username - Host username
     * @param {Object} options.media - Media item to share
     */
    createRoom(options) {
        this.sendMessage({type: 'quix-create-room', payload: options});
    }

    /**
     * Join an existing watch together room
     * @param {Object} options - Join room options
     * @param {string} options.roomId - Room ID to join
     * @param {string} options.username - Username
     */
    joinRoom(options) {
        this.sendMessage({type: 'quix-join-room', payload: options});
    }

    /**
     * Select media to play in the room (host only)
     * @param {Object} media - Media item to select
     */
    selectMedia(media) {
        this.sendMessage({type: 'quix-select-media', payload: {media}});
    }

    /**
     * Change the room code (host only)
     */
    changeRoomCode() {
        this.sendMessage({type: 'quix-change-room-code'});
    }

    /**
     * Register as a master (remote control) for a slave
     * @param {Object} options - Registration options
     * @param {string} options.slaveId - Slave ID to connect to
     */
    registerMaster(options) {
        this.sendMessage({type: 'quix-register-master', payload: options});
    }

    /**
     * Send playback control command (play/pause) in watch together
     * @param {Object} playbackState - Playback state
     */
    playbackControl(playbackState) {
        this.sendMessage({type: 'quix-playback-control', payload: {playbackState}});
    }

    /**
     * Send a chat message in the watch together room
     * @param {Object} message - Chat message object
     * @param {string} [message.text] - Text content
     * @param {string} [message.image] - Image (base64)
     */
    sendChatMessage(message) {
        this.sendMessage({type: 'quix-chat-message', payload: {message}});
    }

    /**
     * Transfer host role to another participant
     * @param {string} newHostId - ID of new host
     */
    transferHost(newHostId) {
        this.sendMessage({type: 'quix-transfer-host', payload: {newHostId}});
    }

    /**
     * Change participant name in the room
     * @param {Object} options - Name change options
     * @param {string} options.participantId - Participant ID
     * @param {string} options.name - New name
     */
    changeName(options) {
        this.sendMessage({type: 'quix-change-name', payload: options});
    }

    // ==================== REMOTE CONTROL METHODS ====================

    /**
     * Send remote command to slave (play, pause, seek, etc.)
     * @param {Object} payload - Command payload (command, item, time, etc.)
     */
    sendRemoteCommand(payload) {
        this.sendMessage({type: 'quix-remote-command', payload});
    }

    /**
     * Send slave status update to master
     * @param {Object} status - Slave status information
     * @param {string} status.slaveId - This slave's ID (auto-filled from connection)
     * @param {boolean} status.isPlaying - Whether slave is playing
     * @param {Object} status.nowPlayingItem - Current playing item
     * @param {boolean} status.isIntroSkippable - Whether intro is skippable
     * @param {number} status.currentTime - Current playback time
     * @param {number} status.duration - Total duration
     */
    sendSlaveStatusUpdate(status) {
        // Always include slaveId from the connection to ensure consistency with backend
        this.sendMessage({type: 'quix-slave-status-update', payload: {slaveId: this._clientId, ...status}});
    }

    /**
     * Send ping to slave for connection health monitoring
     * @param {string} slaveId - Target slave ID
     */
    ping(slaveId) {
        this.sendMessage({type: 'quix-ping', payload: {slaveId}});
    }

    /**
     * Send pong response to master
     * @param {Object} options - Pong options
     * @param {string} options.slaveId - This slave's ID
     * @param {number} [options.timestamp] - Timestamp from ping
     */
    pong(options) {
        this.sendMessage({type: 'quix-pong', payload: {from: 'slave', slaveId: options.slaveId || this._clientId, timestamp: options.timestamp}});
    }

    /**
     * Notify slave that master is disconnecting
     * @param {string} slaveId - Slave ID being disconnected from
     */
    masterDisconnecting(slaveId) {
        this.sendMessage({type: 'quix-master-disconnecting', payload: {slaveId}});
    }

    // ==================== MEDIA SYNC METHODS ====================

    /**
     * Request media sync from master to slave
     * @param {Object} options - Sync request options
     * @param {string} options.slaveId - Target slave ID
     * @param {Array} options.mediaItems - Media items with links to sync
     */
    requestSyncMedia(options) {
        this.sendMessage({type: 'quix-sync-media-request', payload: options});
    }

    /**
     * Send sync progress update to master
     * @param {number} completed - Number of items completed
     * @param {number} total - Total number of items
     * @param {string} slaveId - This slave's ID (auto-filled from connection)
     */
    sendSyncProgressUpdate(completed, total) {
        this.sendMessage({type: 'quix-sync-progress-update', payload: {slaveId: this._clientId, completed, total}});
    }

    /**
     * Notify master that sync is completed
     * @param {string} slaveId - This slave's ID (auto-filled from connection)
     */
    sendSyncCompleted(slaveId) {
        this.sendMessage({type: 'quix-sync-completed', payload: {slaveId: slaveId || this._clientId}});
    }

    /**
     * Notify master that sync failed
     * @param {string} error - Error message
     * @param {string} slaveId - This slave's ID (auto-filled from connection)
     */
    sendSyncError(error, slaveId) {
        this.sendMessage({type: 'quix-sync-error', payload: {slaveId: slaveId || this._clientId, error}});
    }

    // ==================== SMART TV METHODS ====================

    /**
     * Notify server that slave (TV) is intentionally disconnecting
     * @param {string} slaveId - This slave's ID (auto-filled from connection)
     */
    slaveDisconnecting(slaveId) {
        this.sendMessage({type: 'quix-slave-disconnecting', payload: {slaveId: slaveId || this._clientId}});
    }

    setClientId(id) {
        this._clientId = id;
    }

    startHeartbeat() {
        // Clear any existing heartbeat
        this.stopHeartbeat();

        // Send periodic pings to the server
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage({type: 'ping'});

                // Set a timeout to detect if we don't get a response
                this.pingTimeout = setTimeout(() => {
                    console.warn('No pong received from server, connection may be dead');
                    this.events.emit('debug', 'Connessione instabile...');
                }, this.heartbeatTimeout);
            }
        }, 30000); // Send ping every 30 seconds

        console.log('Heartbeat started');
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }
        console.log('Heartbeat stopped');
    }

    disconnect() {
        this.stopHeartbeat();
        this.maxReconnectAttempts = 0; // Prevent reconnection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const websocketService = new WebSocketService();