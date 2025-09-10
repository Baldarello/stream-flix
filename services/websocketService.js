// This service manages the WebSocket connection to the live server.

const WEBSOCKET_URL = 'wss://service.tnl.one'; // Replace with your production server URL when deploying

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
    this.connect();
  }

  connect() {
    console.log('Attempting to connect to WebSocket server...');
    // Use the global WebSocket object provided by the browser
    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connection established.');
      // You might want to emit a 'connected' event if the UI needs to react
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.events.emit('message', message);
      } catch (error) {
        console.error('Error parsing incoming WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed. Attempting to reconnect...');
      // Clean up the old WebSocket object
      this.ws = null;
      // Set a timeout to try reconnecting
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // The onclose event will fire next, triggering the reconnect logic
    };
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
      // You could implement a message queue here to send messages upon reconnection
    }
  }

  // A getter to expose the client's unique ID from the server
  // Note: The server-side code (`wss.js`) would need to send this ID upon connection.
  // For now, we return a placeholder or handle it in the `message` event.
  get clientId() {
    // This needs to be set by a message from the server, e.g., after connection.
    // The `mediaStore` will need to listen for this message and update its state.
    // This is a placeholder as the client doesn't know its ID until the server assigns one.
    return this._clientId || 'connecting...';
  }

  setClientId(id) {
    this._clientId = id;
  }
}

export const websocketService = new WebSocketService();
