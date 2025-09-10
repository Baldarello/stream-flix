// This service manages the WebSocket connection to the live server.

const WEBSOCKET_URL = 'ws://localhost:8080'; // For local development
// const WEBSOCKET_URL = 'wss://service.tnl.one'; // Production server

class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(event, listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
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
    this._clientId = null;
    this.connect();
  }

  connect() {
    console.log('Attempting to connect to WebSocket server...');
    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connection established.');
      // Client ID is now null until the server assigns one.
      this._clientId = null; 
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
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

    this.ws.onclose = () => {
      console.log('WebSocket connection closed. Attempting to reconnect...');
      this.ws = null;
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
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

  get clientId() {
    return this._clientId;
  }

  setClientId(id) {
    this._clientId = id;
  }
}

export const websocketService = new WebSocketService();