// WebSocket Router for Stream-Flix
// Adapted from the original wss.js to work with ElysiaJS

import type {ElysiaWS} from '@elysiajs/websocket';

// Types for room management
interface Player {
    id: string;
    ws: ElysiaWS;
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
    slaveWs: ElysiaWS | null;
    masterWs: ElysiaWS | null;
}

interface SyncProgress {
    total: number;
    completed: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// Global state
const rooms = new Map<string, Room>();
const remoteSessions = new Map<string, RemoteSession>();
const shortCodeToSlaveId = new Map<string, string>();
const mediaSyncProgress = new Map<string, SyncProgress>();

// Extended WebSocket data interface
interface WSData {
    userName?: string;
    roomId?: string;
    slaveId?: string;
    remoteSlaveId?: string;
    shortCode?: string;
}

// Utility functions
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

function broadcastToRoom(roomId: string, data: string, excludeClient?: ElysiaWS): void {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(({ws: client}) => {
        if (client !== excludeClient && client.raw.readyState === 1) { // WebSocket.OPEN = 1
            client.send(data);
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
        if (clientWs.raw.readyState === 1) {
            clientWs.send(JSON.stringify({type: 'quix-room-update', payload}));
        }
    });
}

function getWSData(ws: ElysiaWS): WSData {
    // Access custom data through the raw websocket
    const data = ws.data as { wsData?: WSData };
    if (!data.wsData) {
        data.wsData = {};
    }
    return data.wsData;
}

function setWSData(ws: ElysiaWS, key: keyof WSData, value: string): void {
    const data = ws.data as { wsData?: WSData };
    if (!data.wsData) {
        data.wsData = {};
    }
    data.wsData[key] = value;
}

function handleDisconnectQuix(ws: ElysiaWS): void {
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
        if (session?.masterWs && session.masterWs.raw.readyState === 1) {
            session.masterWs.send(JSON.stringify({type: 'quix-error', payload: {message: 'The TV has disconnected.'}}));
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
                const newHostId = room.players.keys().next().value;
                room.hostId = newHostId;
                console.log(`Host disconnected. New host for room ${wsData.roomId} is ${newHostId}.`);
            }
            broadcastRoomState(wsData.roomId);
        }
    }
}

// Message handler for Elysia WebSocket
export function createWebSocketRouter() {
    return (ws: ElysiaWS, message: unknown) => {
        // Initialize userName if not set
        const wsData = getWSData(ws);
        if (!wsData.userName) {
            wsData.userName = generateId('player');
        }

        try {
            // Handle message parsing - Elysia may already parse JSON
            let parsedMessage: { type: string; payload: unknown };

            if (typeof message === 'string') {
                parsedMessage = JSON.parse(message);
            } else if (typeof message === 'object' && message !== null) {
                parsedMessage = message as { type: string; payload: unknown };
            } else {
                return ws.send(JSON.stringify({
                    type: 'quix-error',
                    payload: {message: 'Invalid message format'}
                }));
            }

            const {type, payload} = parsedMessage;
            const wsDataInner = getWSData(ws);
            const room = wsDataInner.roomId ? rooms.get(wsDataInner.roomId) : null;
            const isHost = room && wsDataInner.userName === room.hostId;

            switch (type) {
                case 'quix-create-room': {
                    if (!payload?.username?.trim() || !payload.media) {
                        return ws.send(JSON.stringify({
                            type: 'quix-error',
                            payload: {message: 'Username and media selection are required.'}
                        }));
                    }

                    const roomId = generateId('room').toUpperCase().substring(5, 11);
                    setWSData(ws, 'roomId', roomId);

                    const newRoom: Room = {
                        id: roomId,
                        hostId: wsDataInner.userName!,
                        players: new Map([[wsDataInner.userName!, {
                            id: wsDataInner.userName!,
                            ws,
                            name: payload.username
                        }]]),
                        gameState: {
                            selectedMedia: payload.media,
                            playbackState: {status: 'paused', time: 0},
                            chatHistory: [],
                        },
                    };
                    rooms.set(roomId, newRoom);
                    console.log(`User ${payload.username} (${wsDataInner.userName}) created room ${roomId}`);
                    broadcastRoomState(roomId);
                    break;
                }
                case 'quix-join-room': {
                    const {roomId, username} = payload as { roomId?: string; username?: string };
                    if (!roomId || !username?.trim()) {
                        return ws.send(JSON.stringify({
                            type: 'quix-error',
                            payload: {message: 'Room ID and username are required.'}
                        }));
                    }

                    const roomToJoin = rooms.get(roomId);
                    if (!roomToJoin) {
                        return ws.send(JSON.stringify({type: 'quix-error', payload: {message: 'Room not found.'}}));
                    }

                    const nameTaken = Array.from(roomToJoin.players.values()).some(p => p.name.toLowerCase() === username.toLowerCase());
                    if (nameTaken) {
                        return ws.send(JSON.stringify({
                            type: 'quix-error',
                            payload: {message: 'That name is already taken in this room.'}
                        }));
                    }

                    setWSData(ws, 'roomId', roomId);
                    roomToJoin.players.set(wsDataInner.userName!, {id: wsDataInner.userName!, ws, name: username});
                    console.log(`User ${username} (${wsDataInner.userName}) joined room ${roomId}`);
                    broadcastRoomState(roomId);
                    break;
                }
                case 'quix-leave-room': {
                    if (room) handleDisconnectQuix(ws);
                    break;
                }
                case 'quix-playback-control': {
                    if (isHost && room && payload && typeof payload === 'object' && 'playbackState' in payload) {
                        room.gameState = room.gameState || {};
                        room.gameState.playbackState = (payload as { playbackState: unknown }).playbackState;
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
                    if (room && payload && typeof payload === 'object' && 'message' in payload) {
                        room.gameState = room.gameState || {chatHistory: []};
                        const msgPayload = payload as { message: { text?: string; image?: string } };
                        const sender = room.players.get(wsDataInner.userName!);
                        const chatMessage = {
                            id: generateId('msg'),
                            senderId: wsDataInner.userName,
                            senderName: sender?.name,
                            text: msgPayload.message?.text,
                            image: msgPayload.message?.image,
                            timestamp: Date.now(),
                        };
                        (room.gameState.chatHistory as unknown[]).push(chatMessage);
                        broadcastRoomState(wsDataInner.roomId!);
                    }
                    break;
                }
                case 'quix-transfer-host': {
                    if (isHost && room && payload && typeof payload === 'object' && 'newHostId' in payload) {
                        const newHostId = (payload as { newHostId: string }).newHostId;
                        if (room.players.has(newHostId)) {
                            room.hostId = newHostId;
                            console.log(`Host of room ${wsDataInner.roomId} transferred to ${newHostId}`);
                            broadcastRoomState(wsDataInner.roomId!);
                        }
                    }
                    break;
                }
                case 'quix-kick-player': {
                    if (isHost && room && payload && typeof payload === 'object' && 'playerId' in payload) {
                        const playerId = (payload as { playerId: string }).playerId;
                        const targetPlayer = room.players.get(playerId);
                        if (targetPlayer && targetPlayer.ws !== ws) {
                            targetPlayer.ws.send(JSON.stringify({
                                type: 'quix-error',
                                payload: {message: 'You have been kicked by the host.'}
                            }));
                            handleDisconnectQuix(targetPlayer.ws);
                        }
                    }
                    break;
                }
                case 'quix-register-slave': {
                    const slavePayload = payload as { slaveId?: string } | undefined;
                    const persistentId = slavePayload?.slaveId || wsDataInner.userName;
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
                        fullSlaveId = shortCodeToSlaveId.get(fullSlaveId.toUpperCase())!;
                    }

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
                    const cmdPayload = payload as { slaveId?: string } | undefined;
                    const session = remoteSessions.get(cmdPayload?.slaveId || '');
                    if (session?.masterWs && session.masterWs.raw.readyState === 1) {
                        session.masterWs.send(JSON.stringify({
                            type: 'quix-remote-command-received',
                            payload
                        }));
                    }
                    break;
                }
                case 'quix-slave-status-update': {
                    const statusPayload = payload as { slaveId?: string } | undefined;
                    const session = remoteSessions.get(statusPayload?.slaveId || '');
                    if (session?.masterWs && session.masterWs.raw.readyState === 1) {
                        session.masterWs.send(JSON.stringify({type: 'quix-slave-status-update', payload}));
                    }
                    break;
                }
                case 'quix-select-media': {
                    if (isHost && room && payload && typeof payload === 'object' && 'media' in payload) {
                        room.gameState = room.gameState || {};
                        room.gameState.selectedMedia = (payload as { media: unknown }).media;
                        console.log(`Host of room ${wsDataInner.roomId} changed media`);
                        broadcastRoomState(wsDataInner.roomId!);
                    }
                    break;
                }
                case 'quix-change-room-code': {
                    if (isHost && room) {
                        const oldRoomId = wsDataInner.roomId!;
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
            }
        } catch (e) {
            console.error(`Error processing message:`, e);
        }
    };
}

// Handle WebSocket close
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
            const newHostId = room.players.keys().next().value;
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

export {rooms, remoteSessions, mediaSyncProgress};
