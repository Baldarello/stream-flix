// This service manages the WebSocket connection to the live server.

// Get WebSocket URL from environment or use production default
const WEBSOCKET_URL = import.meta.env?.VITE_WS_URL || 'ws://localhost:3000/ws';

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

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return; // Don't try to connect if already open or connecting
        }
        console.log('Attempting to connect to WebSocket server...');
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

                // Handle ping from server (for heartbeat)
                if (message.type === 'ping') {
                    this.sendMessage({ type: 'pong' });
                    return;
                }

                // Handle the 'connected' message from the server to get our unique ID
                if (message.type === 'connected' && message.payload?.clientId) {
                    console.log(`Received client ID: ${message.payload.clientId}`);
                    this.setClientId(message.payload.clientId);
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
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', message);
        }
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
                this.sendMessage({ type: 'ping' });
                
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