// ============================================================================
// WebSocket Router for Stream-Flix
// Refactored according to Elysia.js Best Practices
// ============================================================================

// Note: Using 'any' for WebSocket types to avoid complex TypeScript type
// instantiation issues with ElysiaWS. The runtime behavior is unchanged.
import type {ElysiaWS} from '@elysiajs/websocket';

// ============================================================================
// TypeScript Interfaces
// Using any for WebSocket types to avoid complex ElysiaWS type instantiation
// ============================================================================

interface Player {
    id: string;
    ws: any;
    name: string;
    mediaStatus?: Record<string, unknown>;
}

interface Room {
    id: string;
    hostId: string;
    players: Map<string, Player>;
    gameState: Record<string, unknown> | null;
}

interface RemoteSession {
    slaveWs: any;
    masterWs: any;
}

interface SyncProgress {
    total: number;
    completed: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface WSData {
    userName?: string;
    roomId?: string;
    slaveId?: string;
    remoteSlaveId?: string;
    shortCode?: string;
}

// ============================================================================
// Global State
// ============================================================================

const rooms = new Map<string, Room>();
const remoteSessions = new Map<string, RemoteSession>();
const shortCodeToSlaveId = new Map<string, string>();
const mediaSyncProgress = new Map<string, SyncProgress>();

// ============================================================================
// Utility Functions
// ============================================================================

function generateUniqueId(prefix = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateId(prefix = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateShortCode(): string {
    let code: string;
    do {
        code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (shortCodeToSlaveId.has(code));
    return code;
}

function broadcastToRoom(roomId: string, data: string, excludeClient?: any): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(({ws: client}) => {
        if (client !== excludeClient && (client as any).raw?.readyState === 1) {
            (client as any).send(data);
        }
    });
}

function broadcastRoomState(roomId: string): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(({ws: clientWs}, clientId) => {
        const payload = {
            roomId: room.id,
            hostId: room.hostId,
            participants: Array.from(room.players.values()).map(p => ({id: p.id, name: p.name})),
            selectedMedia: room.gameState?.selectedMedia,
            playbackState: room.gameState?.playbackState,
            chatHistory: room.gameState?.chatHistory,
            isHost: clientId === room.hostId,
        };
        if ((clientWs as any).raw?.readyState === 1) {
            (clientWs as any).send(JSON.stringify({type: 'quix-room-update', payload}));
        }
    });
}

// ===========================================================================
// WebSocket Data Management
// Using any to avoid complex ElysiaWS type instantiation issues
// ===========================================================================

function getWSData(ws: any): WSData {
    if (!ws.data) ws.data = {};
    if (!ws.data.wsData) ws.data.wsData = {};
    return ws.data.wsData as WSData;
}

function setWSData(ws: any, key: keyof WSData, value: string): void {
    if (!ws.data) ws.data = {};
    if (!ws.data.wsData) ws.data.wsData = {};
    (ws.data.wsData as WSData)[key] = value;
}

// ============================================================================
// Error Handling
// ============================================================================

function sendError(ws: any, message: string): void {
    try {
        ws.send(JSON.stringify({
            type: 'quix-error',
            payload: {message}
        }));
    } catch {
        // Ignore send errors during cleanup
    }
}

// ============================================================================
// Disconnect Handlers
// ============================================================================

function handleDisconnectQuix(ws: any): void {
    const wsData = getWSData(ws);
    console.log(`Client disconnected.`);

    // Clean up remote control sessions
    if (wsData.remoteSlaveId) {
        const session = remoteSessions.get(wsData.remoteSlaveId);
        if (session) {
            session.masterWs = null;
            console.log(`Master disconnected from slave ${wsData.remoteSlaveId}`);
        }
    }

    if (wsData.slaveId && remoteSessions.has(wsData.slaveId)) {
        const session = remoteSessions.get(wsData.slaveId);
        if (session?.masterWs && (session.masterWs as unknown as {
            raw: { readyState: number }
        }).raw.readyState === 1) {
            (session.masterWs as unknown as { send: (data: string) => void }).send(JSON.stringify({
                type: 'quix-error',
                payload: {message: 'The TV has disconnected.'}
            }));
        }
        for (const [, progress] of mediaSyncProgress.entries()) {
            if (progress.status === 'in_progress') {
                progress.status = 'failed';
            }
        }
        remoteSessions.delete(wsData.slaveId);
        if (wsData.shortCode) {
            shortCodeToSlaveId.delete(wsData.shortCode);
        }
        console.log(`Slave ${wsData.slaveId} session deleted.`);
    }

    if (wsData.remoteSlaveId) {
        for (const [, progress] of mediaSyncProgress.entries()) {
            if (progress.status === 'in_progress') {
                progress.status = 'failed';
            }
        }
    }

    if (wsData.roomId && rooms.has(wsData.roomId)) {
        const room = rooms.get(wsData.roomId);
        if (!room) return;

        const wasHost = wsData.userName === room.hostId;
        room.players.delete(wsData.userName!);

        if (room.players.size === 0) {
            rooms.delete(wsData.roomId);
            console.log(`Room ${wsData.roomId} is empty and has been deleted.`);
        } else {
            if (wasHost) {
                const newHostResult = room.players.keys().next();
                const newHostId = newHostResult.value;
                if (newHostId) {
                    room.hostId = newHostId;
                    console.log(`Host disconnected. New host for room ${wsData.roomId} is ${newHostId}.`);
                }
            }
            broadcastRoomState(wsData.roomId);
        }
    }
}

// ============================================================================
// Main Message Router (Elysia WebSocket Handler)
// ============================================================================

export function createWebSocketRouter() {
    return function (ws: any, message: unknown): void {
        // Initialize userName if not set
        const wsData = getWSData(ws);
        if (!wsData.userName) {
            wsData.userName = generateId('player');
        }

        try {
            // Handle message parsing
            let parsedMessage: { type: string; payload?: unknown };

            if (typeof message === 'string') {
                parsedMessage = JSON.parse(message);
            } else if (typeof message === 'object' && message !== null) {
                parsedMessage = message as { type: string; payload?: unknown };
            } else {
                return sendError(ws, 'Invalid message format');
            }

            const {type, payload} = parsedMessage;
            const room = wsData.roomId ? rooms.get(wsData.roomId) : null;
            const isHost = room && wsData.userName === room.hostId;

            switch (type) {
                case 'quix-create-room': {
                    const typedPayload = payload as { username?: string; media?: unknown };
                    if (!typedPayload?.username?.trim() || !typedPayload.media) {
                        return sendError(ws, 'Username and media selection are required.');
                    }

                    const roomId = generateId('room').toUpperCase().substring(5, 11);
                    setWSData(ws, 'roomId', roomId);

                    const newRoom: Room = {
                        id: roomId,
                        hostId: wsData.userName!,
                        players: new Map([[wsData.userName!, {id: wsData.userName!, ws, name: typedPayload.username}]]),
                        gameState: {
                            selectedMedia: typedPayload.media,
                            playbackState: {status: 'paused', time: 0},
                            chatHistory: [],
                        },
                    };
                    rooms.set(roomId, newRoom);
                    console.log(`User ${typedPayload.username} (${wsData.userName}) created room ${roomId}`);
                    broadcastRoomState(roomId);
                    break;
                }

                case 'quix-join-room': {
                    const typedPayload = payload as { roomId?: string; username?: string };
                    const roomId = typedPayload?.roomId;
                    const username = typedPayload?.username;

                    if (!roomId || !username?.trim()) {
                        return sendError(ws, 'Room ID and username are required.');
                    }

                    const roomToJoin = rooms.get(roomId);
                    if (!roomToJoin) {
                        return sendError(ws, 'Room not found.');
                    }

                    const nameTaken = Array.from(roomToJoin.players.values()).some(p => p.name.toLowerCase() === username.toLowerCase());
                    if (nameTaken) {
                        return sendError(ws, 'That name is already taken in this room.');
                    }

                    setWSData(ws, 'roomId', roomId);
                    roomToJoin.players.set(wsData.userName!, {id: wsData.userName!, ws, name: username});
                    console.log(`User ${username} (${wsData.userName}) joined room ${roomId}`);
                    broadcastRoomState(roomId);
                    break;
                }

                case 'quix-leave-room': {
                    if (room) handleDisconnectQuix(ws);
                    break;
                }

                case 'quix-playback-control': {
                    const typedPayload = payload as { playbackState?: unknown };
                    if (isHost && room && typedPayload?.playbackState) {
                        room.gameState = room.gameState || {};
                        room.gameState.playbackState = typedPayload.playbackState;
                        const updateMessage = JSON.stringify({
                            type: 'quix-playback-update',
                            payload: {playbackState: room.gameState.playbackState}
                        });
                        room.players.forEach(({ws: client}) => {
                            if (client.raw.readyState === 1) client.send(updateMessage);
                        });
                    }
                    break;
                }

                case 'quix-chat-message': {
                    const typedPayload = payload as { message?: { text?: string; image?: string } };
                    if (room && typedPayload?.message) {
                        room.gameState = room.gameState || {chatHistory: []};
                        const sender = room.players.get(wsData.userName!);
                        const chatMessage = {
                            id: generateId('msg'),
                            senderId: wsData.userName,
                            senderName: sender?.name,
                            text: typedPayload.message?.text,
                            image: typedPayload.message?.image,
                            timestamp: Date.now(),
                        };
                        (room.gameState.chatHistory as unknown[]).push(chatMessage);
                        broadcastRoomState(wsData.roomId!);
                    }
                    break;
                }

                case 'quix-transfer-host': {
                    const typedPayload = payload as { newHostId?: string };
                    const newHostId = typedPayload?.newHostId;
                    if (isHost && room && newHostId && room.players.has(newHostId)) {
                        room.hostId = newHostId;
                        console.log(`Host of room ${wsData.roomId} transferred to ${newHostId}`);
                        broadcastRoomState(wsData.roomId!);
                    }
                    break;
                }

                case 'quix-kick-player': {
                    const typedPayload = payload as { playerId?: string };
                    const playerId = typedPayload?.playerId;
                    if (isHost && room && playerId) {
                        const targetPlayer = room.players.get(playerId);
                        if (targetPlayer && targetPlayer.ws !== ws) {
                            (targetPlayer.ws as any).send(JSON.stringify({
                                type: 'quix-error',
                                payload: {message: 'You have been kicked by the host.'}
                            }));
                            handleDisconnectQuix(targetPlayer.ws);
                        }
                    }
                    break;
                }

                case 'quix-register-slave': {
                    const typedPayload = payload as { slaveId?: string };
                    const persistentId = typedPayload?.slaveId || wsData.userName;
                    if (!persistentId) return;

                    setWSData(ws, 'slaveId', persistentId);

                    const shortCode = generateShortCode();
                    shortCodeToSlaveId.set(shortCode, persistentId);
                    setWSData(ws, 'shortCode', shortCode);

                    remoteSessions.set(persistentId, {slaveWs: ws, masterWs: null});

                    ws.send(JSON.stringify({
                        type: 'quix-slave-registered',
                        payload: {slaveId: persistentId, shortCode}
                    }));
                    console.log(`Slave registered with ID: ${persistentId} and short code: ${shortCode}`);
                    break;
                }

                case 'quix-register-master': {
                    let fullSlaveId = (payload as { slaveId?: string })?.slaveId;
                    if (fullSlaveId && shortCodeToSlaveId.has(fullSlaveId.toUpperCase())) {
                        fullSlaveId = shortCodeToSlaveId.get(fullSlaveId.toUpperCase());
                    }

                    if (!fullSlaveId) return;
                    const session = remoteSessions.get(fullSlaveId);
                    if (session) {
                        session.masterWs = ws;
                        setWSData(ws, 'remoteSlaveId', fullSlaveId);
                        ws.send(JSON.stringify({type: 'quix-master-connected'}));
                        if (session.slaveWs?.raw.readyState === 1) {
                            session.slaveWs.send(JSON.stringify({type: 'quix-master-connected'}));
                        }
                        console.log(`Master connected to slave ${fullSlaveId}`);
                    }
                    break;
                }

                case 'quix-remote-command': {
                    const typedPayload = payload as { slaveId?: string; command?: string };
                    const slaveId = typedPayload?.slaveId;
                    const command = typedPayload?.command;

                    if (slaveId) {
                        const session = remoteSessions.get(slaveId);
                        console.log(`[quix-remote-command] Received command '${command}' for slave ${slaveId}, master connected: ${!!session?.masterWs}, slave connected: ${!!session?.slaveWs}`);

                        if (session) {
                            // Forward the command to the slave (TV), NOT to the master
                            if (session.slaveWs?.raw.readyState === 1) {
                                console.log(`[quix-remote-command] Forwarding command to slave (TV)`);
                                session.slaveWs.send(JSON.stringify({
                                    type: 'quix-remote-command',
                                    payload: typedPayload
                                }));
                            } else {
                                console.log(`[quix-remote-command] Slave not connected, cannot forward command`);
                            }

                            // Send acknowledgment ONLY to the master (phone/remote), not back to itself
                            if (session.masterWs?.raw.readyState === 1) {
                                console.log(`[quix-remote-command] Sending acknowledgment to master`);
                                session.masterWs.send(JSON.stringify({
                                    type: 'quix-remote-command-received',
                                    payload: typedPayload
                                }));
                            }
                        }
                    }
                    break;
                }

                case 'quix-slave-status-update': {
                    const typedPayload = payload as { slaveId?: string };
                    const slaveId = typedPayload?.slaveId;
                    if (slaveId) {
                        const session = remoteSessions.get(slaveId);
                        if (session?.masterWs && session.masterWs.raw.readyState === 1) {
                            session.masterWs.send(JSON.stringify({type: 'quix-slave-status-update', payload}));
                        }
                    }
                    break;
                }

                case 'quix-select-media': {
                    const typedPayload = payload as { media?: unknown };
                    if (isHost && room && typedPayload?.media) {
                        room.gameState = room.gameState || {};
                        room.gameState.selectedMedia = typedPayload.media;
                        console.log(`Host of room ${wsData.roomId} changed media`);
                        broadcastRoomState(wsData.roomId!);
                    }
                    break;
                }

                case 'quix-change-room-code': {
                    if (isHost && room) {
                        const oldRoomId = wsData.roomId!;
                        const newRoomId = generateUniqueId('room').toUpperCase().substring(5, 11);

                        room.id = newRoomId;
                        room.players.forEach(player => {
                            setWSData(player.ws, 'roomId', newRoomId);
                        });

                        rooms.set(newRoomId, room);
                        rooms.delete(oldRoomId);

                        console.log(`Room code for ${oldRoomId} changed to ${newRoomId}`);
                        broadcastRoomState(newRoomId);
                    }
                    break;
                }

                case 'ping': {
                    // Respond with pong to keep connection alive
                    ws.send(JSON.stringify({type: 'pong'}));
                    break;
                }

                case 'quix-sync-media-request': {
                    // Master sends media sync request to slave
                    const typedPayload = payload as { slaveId?: string; mediaItems?: unknown[] };
                    const slaveId = typedPayload?.slaveId;
                    if (slaveId) {
                        const session = remoteSessions.get(slaveId);
                        if (session?.slaveWs && session.slaveWs.raw.readyState === 1) {
                            session.slaveWs.send(JSON.stringify({
                                type: 'quix-sync-media-request',
                                payload: typedPayload
                            }));
                            console.log(`Media sync request forwarded to slave ${slaveId}`);
                        } else {
                            ws.send(JSON.stringify({
                                type: 'quix-sync-error',
                                payload: {error: 'Slave not connected'}
                            }));
                        }
                    }
                    break;
                }

                case 'quix-sync-completed': {
                    // Slave sends sync completed - forward to master
                    const wsData = getWSData(ws);
                    if (wsData.remoteSlaveId) {
                        const session = remoteSessions.get(wsData.remoteSlaveId);
                        if (session?.masterWs && session.masterWs.raw.readyState === 1) {
                            session.masterWs.send(JSON.stringify({
                                type: 'quix-sync-completed',
                                payload
                            }));
                        }
                    }
                    break;
                }

                case 'quix-sync-error': {
                    // Slave sends sync error - forward to master
                    const wsData = getWSData(ws);
                    if (wsData.remoteSlaveId) {
                        const session = remoteSessions.get(wsData.remoteSlaveId);
                        if (session?.masterWs && session.masterWs.raw.readyState === 1) {
                            session.masterWs.send(JSON.stringify({
                                type: 'quix-sync-error',
                                payload
                            }));
                        }
                    }
                    break;
                }

                case 'pong': {
                    // Client responding to server ping - no action needed, connection is alive
                    break;
                }

                default:
                    console.warn(`Unknown message type: ${type}`);
            }
        } catch (e) {
            console.error(`Error processing message:`, e);
            sendError(ws, 'Internal server error processing message');
        }
    };
}

// ============================================================================
// WebSocket Close Handler
// ============================================================================

export function handleWSClose(ws: ElysiaWS): void {
    const wsData = getWSData(ws);

    if (wsData.slaveId) {
        handleDisconnectQuix(ws);
    } else {
        if (!wsData.roomId || !rooms.has(wsData.roomId)) {
            console.log(`Client ${wsData.userName} disconnected (not in a room).`);
            return;
        }

        const room = rooms.get(wsData.roomId)!;
        const playerInfo = room.players.get(wsData.userName!);
        const wasHost = wsData.userName === room.hostId;

        room.players.delete(wsData.userName!);
        console.log(`Client ${playerInfo?.name || wsData.userName} disconnected from room ${wsData.roomId}.`);

        broadcastToRoom(wsData.roomId!, JSON.stringify({type: 'user-left', payload: {user: wsData.userName}}));

        if (room.players.size === 0) {
            rooms.delete(wsData.roomId!);
            console.log(`Room ${wsData.roomId} is empty, deleted.`);
        } else if (wasHost) {
            const newHostResult = room.players.keys().next();
            const newHostId = newHostResult.value;
            if (newHostId) {
                room.hostId = newHostId;
                console.log(`Host disconnected. New host for room ${wsData.roomId} is ${newHostId}.`);

                const lastState = room.gameState;
                if (lastState && Array.isArray((lastState as Record<string, unknown>).players)) {
                    const updatedPlayers = ((lastState as Record<string, unknown>).players as Record<string, unknown>[])
                        .filter((p: Record<string, unknown>) => p.id !== wsData.userName)
                        .map((p: Record<string, unknown>) => ({...p, isHost: p.id === newHostId}));

                    room.gameState = {...lastState, players: updatedPlayers};

                    const updateMessage = JSON.stringify({
                        type: 'game-state-update',
                        payload: room.gameState
                    });
                    broadcastToRoom(wsData.roomId!, updateMessage);
                }
            }
        }
    }
}

// ============================================================================
// Exports
// ============================================================================

export {rooms, remoteSessions, mediaSyncProgress};
