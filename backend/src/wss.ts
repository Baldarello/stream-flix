// ============================================================================
// WebSocket Router for Quix
// Refactored according to Elysia.js Best Practices
// ============================================================================

// Note: Using 'any' for WebSocket types to avoid complex TypeScript type
// instantiation issues with ElysiaWS. The runtime behavior is unchanged.

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
const shortCodeExpiry = new Map<string, number>(); // shortCode -> expiry timestamp
const SHORT_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for shortCodes after slave disconnect
const mediaSyncProgress = new Map<string, SyncProgress>();
// Track slaves that are intentionally disconnecting (for reload) - preserve session for reconnection
const intentionallyDisconnectingSlaves = new Set<string>();

// ShortCode cleanup interval - removes expired shortCodes
setInterval(() => {
    const now = Date.now();
    for (const [code, expiry] of shortCodeExpiry.entries()) {
        if (now > expiry) {
            shortCodeToSlaveId.delete(code);
            shortCodeExpiry.delete(code);
            console.log(`[WebSocket] Cleaned up expired shortCode: ${code}`);
        }
    }
}, 60000); // Check every minute

// ============================================================================
// Utility Functions
// ============================================================================

// Helper function to safely check if WebSocket connection is open
// Uses standard WebSocket API instead of internal Elysia properties
function isConnectionOpen(ws: any): boolean {
    if (!ws) return false;
    try {
        // Standard WebSocket readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        const readyState = ws.raw?.readyState ?? ws.readyState;
        return readyState === 1; // WebSocket.OPEN
    } catch {
        return false;
    }
}

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
        if (isConnectionOpen(clientWs)) {
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
    if (!isConnectionOpen(ws)) {
        console.warn(`[WebSocket] sendError: Connection not open, skipping send`);
        return;
    }
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
    console.log(`[WebSocket] Client disconnected. userName: ${wsData.userName}, slaveId: ${wsData.slaveId}, remoteSlaveId: ${wsData.remoteSlaveId}`);

    // Clean up remote control sessions when master disconnects
    if (wsData.remoteSlaveId) {
        const session = remoteSessions.get(wsData.remoteSlaveId);
        if (session) {
            // Notify slave that master has disconnected
            if (session.slaveWs && isConnectionOpen(session.slaveWs)) {
                session.slaveWs.send(JSON.stringify({
                    type: 'quix-master-disconnected',
                    payload: {}
                }));
            }
            session.masterWs = null;
            console.log(`[WebSocket] Master disconnected from slave ${wsData.remoteSlaveId}`);
        }
    }

    // Clean up when slave disconnects - also clear master's remoteSlaveId
    if (wsData.slaveId && remoteSessions.has(wsData.slaveId)) {
        const session = remoteSessions.get(wsData.slaveId);
        
        // Check if slave is intentionally disconnecting (for reload) - preserve session
        if (intentionallyDisconnectingSlaves.has(wsData.slaveId)) {
            intentionallyDisconnectingSlaves.delete(wsData.slaveId);
            // Just clear the slaveWs but keep the session intact for reconnection
            // Do NOT delete the shortCode mapping - it's needed for reconnection
            session.slaveWs = null;
            console.log(`[WebSocket] Slave ${wsData.slaveId} disconnected intentionally, session preserved for reconnection (shortCode=${wsData.shortCode})`);
            // Don't notify the master - the slave will reconnect
            return;
        }
        
        // Notify master that slave has disconnected (unintentionally)
        if (session?.masterWs && isConnectionOpen(session.masterWs)) {
            (session.masterWs as unknown as { send: (data: string) => void }).send(JSON.stringify({
                type: 'quix-slave-disconnected',
                payload: {}
            }));
            // Clear the master's remoteSlaveId since slave is gone
            setWSData(session.masterWs, 'remoteSlaveId', '');
            console.log(`[WebSocket] Cleared master's remoteSlaveId for slave ${wsData.slaveId}`);
        }
        for (const [, progress] of Array.from(mediaSyncProgress.entries())) {
            if (progress.status === 'in_progress') {
                progress.status = 'failed';
            }
        }
        remoteSessions.delete(wsData.slaveId);
        // FIX: Preserve shortCode with TTL instead of deleting immediately
        // This allows master to reconnect within the TTL window
        if (wsData.shortCode) {
            shortCodeExpiry.set(wsData.shortCode, Date.now() + SHORT_CODE_TTL_MS);
            console.log(`[WebSocket] Preserved shortCode ${wsData.shortCode} with TTL ${SHORT_CODE_TTL_MS}ms for slave ${wsData.slaveId}`);
        }
        console.log(`[WebSocket] Slave ${wsData.slaveId} session deleted.`);
    }

    // FIX: Removed redundant remoteSlaveId check - already handled in master disconnect section above

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
        // Initialize userName if not set - this is when a new client connects
        const wsData = getWSData(ws);
        if (!wsData.userName) {
            wsData.userName = generateId('player');
            console.log(`[WebSocket] New client connected. Assigned ID: ${wsData.userName}, Connection open: ${isConnectionOpen(ws)}`);
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

            console.log(`[WebSocket] Message received: type=${type}, userName=${wsData.userName}, slaveId=${wsData.slaveId}, remoteSlaveId=${wsData.remoteSlaveId}`);

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
                            if (isConnectionOpen(client)) client.send(updateMessage);
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

                case 'quix-change-name': {
                    const typedPayload = payload as { participantId?: string; name?: string };
                    const participantId = typedPayload?.participantId;
                    const newName = typedPayload?.name;
                    if (!room) {
                        break;
                    }
                    if (!participantId || !newName) {
                        break;
                    }
                    if (!room.players.has(participantId)) {
                        break;
                    }
                    const player = room.players.get(participantId);
                    if (player) {
                        // Update the stored WebSocket reference to the current connection
                        // This handles cases where the client reconnected with a new WebSocket
                        player.ws = ws;
                        player.name = newName;
                        broadcastRoomState(wsData.roomId!);
                    }
                    break;
                }

                case 'quix-register-slave': {
                    const typedPayload = payload as { slaveId?: string; shortCode?: string };
                    // Use the slaveId from payload if provided (for reconnection), otherwise use userName (new connection)
                    const persistentId = typedPayload?.slaveId || wsData.userName;
                    if (!persistentId) return;

                    setWSData(ws, 'slaveId', persistentId);

                    // FIX: Check if slave sends shortCode in payload (for reconnection)
                    // This ensures saved shortCodes remain valid on slave reconnection
                    let shortCode = typedPayload?.shortCode || wsData.shortCode;
                    if (!shortCode) {
                        // Only generate new if this is a fresh registration
                        shortCode = generateShortCode();
                    }
                    shortCodeToSlaveId.set(shortCode, persistentId);
                    setWSData(ws, 'shortCode', shortCode);

                    // Preserve existing master connection if slave is reconnecting
                    const existingSession = remoteSessions.get(persistentId);
                    // DEBUG: Log session state
                    console.log(`[DEBUG] quix-register-slave: persistentId=${persistentId}, existingSession=${!!existingSession}`);
                    if (existingSession) {
                        // Check if there's an old WebSocket that needs to be closed
                        // This handles the case where the slave reloads but the old WebSocket is still open
                        if (existingSession.slaveWs && existingSession.slaveWs !== ws && isConnectionOpen(existingSession.slaveWs)) {
                            console.log(`[DEBUG] quix-register-slave: Closing old WebSocket for same slave`);
                            // Close the old WebSocket - the slave has reconnected with a new WebSocket
                            try {
                                existingSession.slaveWs.close(1000, 'Closed due to slave reconnection');
                            } catch (e) {
                                console.log(`[DEBUG] Error closing old WebSocket: ${e}`);
                            }
                        }
                        existingSession.slaveWs = ws; // Update WebSocket reference
                        console.log(`[DEBUG] quix-register-slave: Updated existing session, masterWs=${isConnectionOpen(existingSession.masterWs)}`);
                        // Keep existing masterWs if still connected

                        // Notify the master that the slave reconnected (in case master was trying to reconnect)
                        if (existingSession.masterWs && isConnectionOpen(existingSession.masterWs)) {
                            existingSession.masterWs.send(JSON.stringify({
                                type: 'quix-slave-reconnected',
                                payload: { slaveId: persistentId, shortCode }
                            }));
                            console.log(`[WebSocket] Notified master about slave reconnection: ${persistentId}`);
                        }
                    } else {
                        remoteSessions.set(persistentId, {slaveWs: ws, masterWs: null});
                        console.log(`[DEBUG] quix-register-slave: Created new session`);
                    }

                    ws.send(JSON.stringify({
                        type: 'quix-slave-registered',
                        payload: {slaveId: persistentId, shortCode}
                    }));
                    console.log(`[WebSocket] Slave registered with ID: ${persistentId} and short code: ${shortCode}`);
                    break;
                }

                case 'quix-slave-disconnecting': {
                    // Slave is about to reload/disconnect intentionally - preserve session for reconnection
                    const slaveId = wsData.slaveId;
                    if (slaveId) {
                        intentionallyDisconnectingSlaves.add(slaveId);
                        const session = remoteSessions.get(slaveId);
                        if (session) {
                            // Mark slave as disconnecting but PRESERVE the session and master connection
                            // The session will be reused when the slave reconnects
                            session.slaveWs = null; // Clear WebSocket but keep session
                            console.log(`[WebSocket] Slave ${slaveId} disconnecting intentionally, session preserved for reconnection`);
                        }
                    }
                    break;
                }

                case 'quix-register-master': {
                    const typedPayload = payload as { slaveId?: string };
                    let fullSlaveId = typedPayload?.slaveId;

                    // Check if slaveId is already a full ID (contains hyphen) before doing shortCode lookup
                    // Full IDs have format like: slaveId_<timestamp>_<random>
                    if (fullSlaveId) {
                        const hasHyphen = fullSlaveId.includes('-');
                        console.log(`[WebSocket] Master registration - slaveId: ${fullSlaveId}, isFullId: ${hasHyphen}`);

                        if (!hasHyphen && shortCodeToSlaveId.has(fullSlaveId.toUpperCase())) {
                            fullSlaveId = shortCodeToSlaveId.get(fullSlaveId.toUpperCase()) || fullSlaveId;
                            console.log(`[WebSocket] Resolved short code to full ID: ${fullSlaveId}`);
                        }
                    }

                    if (!fullSlaveId) {
                        console.warn(`[WebSocket] Master registration failed: no slaveId provided`);
                        return;
                    }

                    const session = remoteSessions.get(fullSlaveId);
                    if (session) {
                        // Check if slave is actually connected
                        if (!isConnectionOpen(session.slaveWs)) {
                            // Check if slave is intentionally disconnecting (for reload) - don't delete session
                            if (intentionallyDisconnectingSlaves.has(fullSlaveId)) {
                                console.log(`[WebSocket] Master registration: slave ${fullSlaveId} is intentionally disconnecting, waiting for reconnection`);
                                // Don't delete session - slave will reconnect soon
                                // Notify master to keep trying
                                ws.send(JSON.stringify({
                                    type: 'quix-master-connection-status',
                                    payload: {
                                        status: 'slave-reconnecting',
                                        slaveId: fullSlaveId,
                                        message: 'TV is reconnecting. Please wait...'
                                    }
                                }));
                                return;
                            }
                            console.warn(`[WebSocket] Master registration failed: slave ${fullSlaveId} is not connected (readyState=${session.slaveWs?.raw?.readyState ?? session.slaveWs?.readyState})`);
                            // Clean up stale session
                            remoteSessions.delete(fullSlaveId);
                            ws.send(JSON.stringify({
                                type: 'quix-master-connection-status',
                                payload: {
                                    status: 'slave-not-found',
                                    slaveId: fullSlaveId,
                                    message: 'TV is not connected. Please check the TV and try again.'
                                }
                            }));
                            return;
                        }
                        // Check if a master is already connected - don't silently overwrite
                        if (session.masterWs && isConnectionOpen(session.masterWs)) {
                            console.warn(`[WebSocket] Master registration failed: slave ${fullSlaveId} already has a master connected`);
                            ws.send(JSON.stringify({
                                type: 'quix-master-connection-status',
                                payload: {status: 'slave-busy', slaveId: fullSlaveId}
                            }));
                            return;
                        }
                        session.masterWs = ws;
                        setWSData(ws, 'remoteSlaveId', fullSlaveId);
                        // FIX: Include resolved slaveId in quix-master-connected so master uses correct ID
                        ws.send(JSON.stringify({type: 'quix-master-connected', payload: {slaveId: fullSlaveId}}));
                        // DEBUG: Check slave connection state before notifying slave
                        const slaveReadyState = session.slaveWs?.raw?.readyState ?? session.slaveWs?.readyState;
                        const slaveOpen = isConnectionOpen(session.slaveWs);
                        console.log(`[DEBUG] quix-register-master: slaveWs=${session.slaveWs}, readyState=${slaveReadyState}, isOpen=${slaveOpen}`);
                        if (session && isConnectionOpen(session.slaveWs)) {
                            session.slaveWs.send(JSON.stringify({
                                type: 'quix-master-connected',
                                payload: {slaveId: fullSlaveId}
                            }));
                            console.log(`[WebSocket] Sent quix-master-connected to slave ${fullSlaveId}`);
                        } else {
                            console.log(`[WebSocket] quix-register-master: NOT sending to slave - connection not open`);
                        }
                        console.log(`[WebSocket] Master connected to slave ${fullSlaveId}`);
                    } else {
                        console.warn(`[WebSocket] Master registration failed: no session found for slave ${fullSlaveId}`);
                        ws.send(JSON.stringify({
                            type: 'quix-master-connection-status',
                            payload: {status: 'slave-not-found', slaveId: fullSlaveId}
                        }));
                    }
                    break;
                }

                case 'quix-remote-command': {
                    const typedPayload = payload as { slaveId?: string; command?: string };
                    const slaveId = typedPayload?.slaveId;
                    const command = typedPayload?.command;

                    // DEBUG: Log all active sessions
                    console.log(`[DEBUG] quix-remote-command: Received slaveId='${slaveId}', command='${command}'`);
                    console.log(`[DEBUG] Active remoteSessions (${remoteSessions.size}):`);
                    for (const [key, session] of remoteSessions.entries()) {
                        console.log(`  - ${key}: slaveWs=${isConnectionOpen(session.slaveWs)}, masterWs=${isConnectionOpen(session.masterWs)}`);
                    }

                    if (slaveId) {
                        const session = remoteSessions.get(slaveId);
                        console.log(`[DEBUG] Session lookup for '${slaveId}': ${session ? 'found' : 'NOT found'}`);
                        if (session) {
                            console.log(`[DEBUG] Session state: slaveWs=${isConnectionOpen(session.slaveWs)}, masterWs=${isConnectionOpen(session.masterWs)}`);
                        }

                        console.log(`[WebSocket] quix-remote-command: Received command '${command}' for slave ${slaveId}, master connected: ${!!session?.masterWs}, slave connected: ${!!session?.slaveWs}`);

                        if (session) {
                            // Forward the command to the slave (TV), NOT to the master
                            if (isConnectionOpen(session.slaveWs)) {
                                console.log(`[WebSocket] quix-remote-command: Forwarding command to slave (TV)`);
                                session.slaveWs.send(JSON.stringify({
                                    type: 'quix-remote-command',
                                    payload: typedPayload
                                }));

                                // Send acknowledgment to master (phone/remote)
                                if (isConnectionOpen(session.masterWs)) {
                                    console.log(`[WebSocket] quix-remote-command: Sending acknowledgment to master`);
                                    session.masterWs.send(JSON.stringify({
                                        type: 'quix-remote-command-received',
                                        payload: typedPayload
                                    }));
                                }
                            } else {
                                // Slave not connected - notify the master so they can redirect to QR scan
                                console.log(`[WebSocket] quix-remote-command: Slave not connected, notifying master`);
                                if (isConnectionOpen(session.masterWs)) {
                                    session.masterWs.send(JSON.stringify({
                                        type: 'quix-slave-not-connected',
                                        payload: {
                                            slaveId: slaveId,
                                            message: 'TV not connected. Please scan QR code or enter code to reconnect.'
                                        }
                                    }));
                                }
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
                        if (session && isConnectionOpen(session.masterWs)) {
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

                    // DEBUG: Log all active sessions
                    console.log(`[DEBUG] quix-sync-media-request: Received slaveId='${slaveId}'`);
                    console.log(`[DEBUG] Active remoteSessions (${remoteSessions.size}):`);
                    for (const [key, session] of remoteSessions.entries()) {
                        console.log(`  - ${key}: slaveWs=${isConnectionOpen(session.slaveWs)}, masterWs=${isConnectionOpen(session.masterWs)}`);
                    }

                    if (slaveId) {
                        const session = remoteSessions.get(slaveId);
                        console.log(`[DEBUG] Session lookup for '${slaveId}': ${session ? 'found' : 'NOT found'}`);
                        if (session) {
                            console.log(`[DEBUG] Session state: slaveWs=${isConnectionOpen(session.slaveWs)}, masterWs=${isConnectionOpen(session.masterWs)}`);
                        }

                        if (session && isConnectionOpen(session.slaveWs)) {
                            session.slaveWs.send(JSON.stringify({
                                type: 'quix-sync-media-request',
                                payload: typedPayload
                            }));
                            console.log(`[WebSocket] quix-sync-media-request: Forwarded to slave ${slaveId}`);
                        } else {
                            ws.send(JSON.stringify({
                                type: 'quix-sync-error',
                                payload: {error: 'Slave not connected'}
                            }));
                            console.log(`[WebSocket] quix-sync-media-request: Slave ${slaveId} not connected`);
                        }
                    }
                    break;
                }

                case 'quix-sync-completed': {
                    // Slave sends sync completed - forward to master
                    const wsData = getWSData(ws);
                    // This message comes FROM the slave, so use wsData.slaveId
                    if (wsData.slaveId) {
                        const session = remoteSessions.get(wsData.slaveId);
                        if (session && isConnectionOpen(session.masterWs)) {
                            session.masterWs.send(JSON.stringify({type: 'quix-sync-completed', payload}));
                            console.log(`[WebSocket] quix-sync-completed: Forwarded to master for slave ${wsData.slaveId}`);
                        }
                    }
                    break;
                }

                case 'quix-sync-error': {
                    // Slave sends sync error - forward to master
                    const wsData = getWSData(ws);
                    // This message comes FROM the slave, so use wsData.slaveId
                    if (wsData.slaveId) {
                        const session = remoteSessions.get(wsData.slaveId);
                        if (session && isConnectionOpen(session.masterWs)) {
                            session.masterWs.send(JSON.stringify({type: 'quix-sync-error', payload}));
                        }
                    }
                    break;
                }

                case 'quix-sync-progress-update': {
                    // Slave sends progress updates - forward to master
                    const wsData = getWSData(ws);
                    // This message comes FROM the slave, forward to master
                    if (wsData.slaveId) {
                        const session = remoteSessions.get(wsData.slaveId);
                        if (session && isConnectionOpen(session.masterWs)) {
                            session.masterWs.send(JSON.stringify({type: 'quix-sync-progress-update', payload}));
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
// Exports
// ============================================================================

export {rooms, remoteSessions, mediaSyncProgress};
