// This file simulates a WebSocket service for "Watch Together" and "Remote Control" features.
// It is designed to be a perfect mock of the `wss.js` server, allowing for
// seamless local development without needing a live server connection.

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
    this.rooms = new Map();
    this.remoteSessions = new Map();
    this.userName = `user_${Math.random().toString(36).substring(2, 9)}`;
    this.events = new EventEmitter();
    console.log(`WebSocketService (mock) initialized for client: ${this.userName}`);
  }

  // --- Public Methods ---
  sendMessage(message) {
    // Simulate network latency before processing
    setTimeout(() => this._handleMessage(message), 150);
  }

  // --- Internal Message Handling ---
  _handleMessage(message) {
    const { type, payload } = message;
    const room = payload?.roomId ? this.rooms.get(payload.roomId) : null;
    const isHost = room && room.hostId === this.userName;

    switch (type) {
      // Watch Together
      case 'quix-create-room':
        this._createRoom(payload.username, payload.media);
        break;
      case 'quix-join-room':
        this._joinRoom(payload.roomId, payload.username);
        break;
      case 'quix-leave-room':
        this._leaveRoom(payload.roomId);
        break;
      case 'quix-playback-control':
        if (isHost) this._updatePlaybackState(payload.roomId, payload.playbackState);
        break;
      case 'quix-chat-message':
        this._handleChatMessage(payload.roomId, payload.message);
        break;
      case 'quix-transfer-host':
        if (isHost) this._transferHost(payload.roomId, payload.newHostId);
        break;
      case 'quix-kick-player':
        // In the mock, kicking is just removing them from the state.
        if (isHost) this._kickPlayer(payload.roomId, payload.playerId);
        break;

      // Remote Control
      case 'quix-register-slave':
        this._registerSlave();
        break;
      case 'quix-register-master':
        this._registerMaster(payload.slaveId);
        break;
      case 'quix-remote-command':
        this._forwardToSlave(payload);
        break;
      case 'quix-slave-status-update':
        this._forwardToMaster(payload);
        break;
    }
  }

  // --- State Broadcasting ---
  _broadcastRoomState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // In the mock, we only need to inform our own client.
    const payload = {
      roomId: room.id,
      hostId: room.hostId,
      participants: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })),
      selectedMedia: room.gameState.selectedMedia,
      playbackState: room.gameState.playbackState,
      chatHistory: room.gameState.chatHistory,
      isHost: room.hostId === this.userName,
    };
    this.events.emit('message', { type: 'room-update', payload });
  }

  // --- Watch Together Implementation ---
  _createRoom(username, media) {
    if (!username?.trim() || !media) {
      this.events.emit('message', { type: 'error', payload: { message: 'Username and media selection are required.' } });
      return;
    }
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom = {
      id: roomId,
      hostId: this.userName,
      players: new Map([[this.userName, { id: this.userName, name: username }]]),
      gameState: {
        selectedMedia: media,
        playbackState: { status: 'paused', time: 0 },
        chatHistory: [],
      },
    };
    this.rooms.set(roomId, newRoom);
    this._broadcastRoomState(roomId);
  }

  _joinRoom(roomId, username) {
    if (!roomId || !username?.trim()) {
      this.events.emit('message', { type: 'error', payload: { message: 'Room ID and username are required.' } });
      return;
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      this.events.emit('message', { type: 'error', payload: { message: 'Room not found.' } });
      return;
    }
    const nameTaken = Array.from(room.players.values()).some(p => p.name.toLowerCase() === username.toLowerCase());
    if (nameTaken) {
      this.events.emit('message', { type: 'error', payload: { message: 'That name is already taken in this room.' } });
      return;
    }
    room.players.set(this.userName, { id: this.userName, name: username });
    this._broadcastRoomState(roomId);
  }

  _leaveRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || !room.players.has(this.userName)) return;

    const wasHost = room.hostId === this.userName;
    room.players.delete(this.userName);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return;
    }
    if (wasHost) {
      room.hostId = room.players.keys().next().value;
    }
    this._broadcastRoomState(roomId);
  }

  _updatePlaybackState(roomId, playbackState) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState.playbackState = playbackState;
      // In the mock, we send the update directly back to our client.
      this.events.emit('message', { type: 'quix-playback-update', payload: { playbackState } });
    }
  }

  _handleChatMessage(roomId, message) {
    const room = this.rooms.get(roomId);
    const sender = room?.players.get(this.userName);
    if (room && sender) {
      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: this.userName,
        senderName: sender.name,
        text: message.text,
        image: message.image,
        timestamp: Date.now(),
      };
      room.gameState.chatHistory.push(chatMessage);
      this._broadcastRoomState(roomId);
    }
  }

  _transferHost(roomId, newHostId) {
    const room = this.rooms.get(roomId);
    if (room && room.players.has(newHostId)) {
      room.hostId = newHostId;
      this._broadcastRoomState(roomId);
    }
  }

  _kickPlayer(roomId, playerIdToKick) {
    const room = this.rooms.get(roomId);
    if (room && playerIdToKick !== this.userName && room.players.has(playerIdToKick)) {
        room.players.delete(playerIdToKick);
        this._broadcastRoomState(roomId);
    }
  }

  // --- Remote Control Implementation ---
  _registerSlave() {
    this.remoteSessions.set(this.userName, { masterId: null });
    this.events.emit('message', { type: 'quix-slave-registered', payload: { slaveId: this.userName } });
  }

  _registerMaster(slaveId) {
    // In the mock, the only possible slave is this client.
    if (this.remoteSessions.has(slaveId) && slaveId === this.userName) {
      const session = this.remoteSessions.get(slaveId);
      session.masterId = this.userName;
      this.events.emit('message', { type: 'quix-master-connected' });
    }
  }
  
  _forwardToSlave(payload) {
    // If this client is the intended slave, emit the event locally.
    if (this.remoteSessions.has(payload.slaveId) && payload.slaveId === this.userName) {
      this.events.emit('message', { type: 'quix-remote-command-received', payload });
    }
  }

  _forwardToMaster(payload) {
    const session = this.remoteSessions.get(payload.slaveId);
    // If this client is the slave and has a master (itself in the mock), emit the event.
    if (session && payload.slaveId === this.userName && session.masterId) {
      this.events.emit('message', { type: 'quix-slave-status-update', payload });
    }
  }
}

export const websocketService = new WebSocketService();
