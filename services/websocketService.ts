import type { MediaItem } from '../types';

interface PlaybackState {
  status: 'playing' | 'paused' | 'idle';
  time: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  image?: string; // base64 encoded image
  timestamp: number;
}

interface Room {
  id: string;
  host: string; // clientId of the host
  participants: Map<string, string>; // clientId -> username
  selectedMedia: MediaItem | null;
  playbackState: PlaybackState;
  chatHistory: ChatMessage[];
}

interface RemoteSession {
    slaveId: string;
    masterId: string | null;
}

type Listener = (data: any) => void;

class EventEmitter {
  private listeners: { [key: string]: Listener[] } = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }
}

class WebSocketService {
  private rooms: Map<string, Room> = new Map();
  private remoteSessions: Map<string, RemoteSession> = new Map(); // slaveId -> session
  public clientId: string;
  public events = new EventEmitter();

  constructor() {
    this.clientId = `user_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`WebSocketService initialized for client: ${this.clientId}`);
  }

  sendMessage(message: any) {
    setTimeout(() => {
      this._handleMessage(message);
    }, 100);
  }
  
  private _handleMessage(message: any) {
    switch (message.type) {
        // Watch Together
        case 'create-room':
            this._createRoom(message.payload.media, message.payload.username);
            break;
        case 'join-room':
            this._joinRoom(message.payload.roomId, message.payload.username);
            break;
        case 'leave-room':
            this._leaveRoom(message.payload.roomId);
            break;
        case 'playback-control':
            this._updatePlaybackState(message.payload.roomId, message.payload.playbackState);
            break;
        case 'chat-message':
            this._handleChatMessage(message.payload.roomId, message.payload.message);
            break;
        case 'transfer-host':
            this._transferHost(message.payload.roomId, message.payload.newHostId);
            break;

        // Remote Control
        case 'register-slave':
            this._registerSlave();
            break;
        case 'register-master':
            this._registerMaster(message.payload.slaveId);
            break;
        case 'remote-command':
            this._forwardToSlave(message.payload);
            break;
        case 'slave-status-update':
            this._forwardToMaster(message.payload);
            break;
    }
  }

  // --- Remote Control Methods ---
  private _registerSlave() {
    const slaveId = this.clientId; // Use client's unique ID as slave ID
    this.remoteSessions.set(slaveId, { slaveId, masterId: null });
    // Simulate sending a message back to the sender
    this.events.emit('message', {
        type: 'slave-registered',
        payload: { slaveId }
    });
  }

  private _registerMaster(slaveId: string) {
    const session = this.remoteSessions.get(slaveId);
    if (session) {
        session.masterId = this.clientId;
        // Notify both master and slave that they are connected
        this.events.emit('message', { type: 'master-connected' });
    }
  }

  private _forwardToSlave(payload: any) {
    const { slaveId, ...command } = payload;
    const session = this.remoteSessions.get(slaveId);
    if (session && session.masterId === this.clientId) {
      // In a real WebSocket server, you'd send a message to the specific slaveId client.
      // Here, we emit a general event that the slave (if it's the current user) will pick up.
      if (slaveId === this.clientId) { // This check is for simulation purpose
         this.events.emit('message', {
            type: 'remote-command-received',
            payload: command
         });
      }
    }
  }
  
  private _forwardToMaster(payload: any) {
      const { slaveId, ...statusUpdate } = payload;
      const session = this.remoteSessions.get(slaveId);
      if (session && session.slaveId === this.clientId && session.masterId) {
          // In a real WebSocket server, you'd send to the masterId client.
          // For simulation, we assume if masterId is set, it's this user in another tab/device.
          this.events.emit('message', {
            type: 'slave-status-update',
            payload: statusUpdate
          });
      }
  }

  // --- Watch Together Methods ---
  private _transferHost(roomId: string, newHostId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.host === this.clientId) {
        if (room.participants.has(newHostId)) {
            room.host = newHostId;
            this._broadcast(roomId, { type: 'room-update' });
        }
    }
  }
  
  private _handleChatMessage(roomId: string, message: { text?: string; image?: string }) {
    const room = this.rooms.get(roomId);
    const senderName = room?.participants.get(this.clientId);
    if (room && senderName) {
        const chatMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random()}`,
            senderId: this.clientId,
            senderName,
            text: message.text,
            image: message.image,
            timestamp: Date.now(),
        };
        room.chatHistory.push(chatMessage);
        this._broadcast(roomId, { type: 'room-update' });
    }
  }

  private _generateRoomId(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }
  
  private _broadcast(roomId: string, message: any) {
    const room = this.rooms.get(roomId);
    if(room){
       const payload = {
        roomId: room.id,
        hostId: room.host,
        participants: Array.from(room.participants.entries()).map(([id, name]) => ({ id, name })),
        selectedMedia: room.selectedMedia,
        playbackState: room.playbackState,
        chatHistory: room.chatHistory,
      };
      
      this.events.emit('message', {
          ...message,
          payload: { ...payload, isHost: room.host === this.clientId }
      });
    }
  }

  private _createRoom(media: MediaItem, username: string) {
    const roomId = this._generateRoomId();
    const newRoom: Room = {
      id: roomId,
      host: this.clientId,
      participants: new Map([[this.clientId, username]]),
      selectedMedia: media,
      playbackState: { status: 'idle', time: 0 },
      chatHistory: [],
    };
    this.rooms.set(roomId, newRoom);
    this._broadcast(roomId, { type: 'room-update' });
  }
  
  private _joinRoom(roomId: string, username: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      const isUsernameTaken = Array.from(room.participants.values()).some(
        name => name.toLowerCase() === username.toLowerCase()
      );
      
      if (isUsernameTaken) {
        this.events.emit('message', {
          type: 'error',
          payload: { message: 'Questo nome è già stato preso. Scegline un altro.' }
        });
        return;
      }

      room.participants.set(this.clientId, username);
      this._broadcast(roomId, { type: 'room-update' });
    } else {
      this.events.emit('message', { type: 'error', payload: { message: 'Stanza non trovata.' } });
    }
  }

  private _leaveRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
        room.participants.delete(this.clientId);
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
        } else {
            if (room.host === this.clientId) {
              room.host = room.participants.keys().next().value;
            }
            this._broadcast(roomId, { type: 'room-update' });
        }
    }
  }

  private _updatePlaybackState(roomId: string, playbackState: PlaybackState) {
    const room = this.rooms.get(roomId);
    if (room && room.host === this.clientId) {
      room.playbackState = playbackState;
      this._broadcast(roomId, {
        type: 'playback-update',
      });
    }
  }
}

export const websocketService = new WebSocketService();
