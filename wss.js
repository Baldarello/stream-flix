const rooms = new Map(); // roomId -> { id, hostId, players: Map<clientId, {id, ws, name}>, gameState }
const remoteSessions = new Map(); // slaveId -> { slaveWs, masterWs }

function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Broadcasts the entire, consistent state of a room to all its players.
function broadcastRoomState(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(({ ws: clientWs }, clientId) => {
        const payload = {
            roomId: room.id,
            hostId: room.hostId,
            participants: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })),
            selectedMedia: room.gameState.selectedMedia,
            playbackState: room.gameState.playbackState,
            chatHistory: room.gameState.chatHistory,
            isHost: clientId === room.hostId,
        };
        if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ type: 'quix-room-update', payload }));
        }
    });
}

function handleDisconnect(ws) {
    console.log(`Client ${ws.clientId} disconnected.`);

    // Clean up remote control sessions
    if (ws.remoteSlaveId) { // If the client was a master
        const session = remoteSessions.get(ws.remoteSlaveId);
        if (session) {
            session.masterWs = null;
            console.log(`Master ${ws.clientId} disconnected from slave ${ws.remoteSlaveId}`);
        }
    }
    if (remoteSessions.has(ws.clientId)) { // If the client was a slave
        const session = remoteSessions.get(ws.clientId);
        if (session.masterWs && session.masterWs.readyState === session.masterWs.OPEN) {
            session.masterWs.send(JSON.stringify({ type: 'error', payload: { message: 'The TV has disconnected.' } }));
        }
        remoteSessions.delete(ws.clientId);
        console.log(`Slave ${ws.clientId} session deleted.`);
    }

    // Clean up "Watch Together" rooms
    if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId);
        const wasHost = ws.clientId === room.hostId;

        room.players.delete(ws.clientId);

        if (room.players.size === 0) {
            rooms.delete(ws.roomId);
            console.log(`Room ${ws.roomId} is empty and has been deleted.`);
        } else {
            if (wasHost) {
                const newHostId = room.players.keys().next().value;
                room.hostId = newHostId;
                console.log(`Host disconnected. New host for room ${ws.roomId} is ${newHostId}.`);
            }
            broadcastRoomState(ws.roomId);
        }
    }
}


function heartbeat() { this.isAlive = true; }

const webSocketRouter = (wss) => {
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', heartbeat);

        // Assign a unique ID and notify the client immediately
        ws.clientId = generateUniqueId('client');
        ws.send(JSON.stringify({ type: 'connected', payload: { clientId: ws.clientId } }));
        console.log(`Client connected: ${ws.clientId}`);

        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                const { type, payload } = parsedMessage;

                const room = ws.roomId ? rooms.get(ws.roomId) : null;
                const isHost = room && ws.clientId === room.hostId;

                switch (type) {
                    // --- Watch Together Cases ---
                    case 'quix-create-room': {
                        if (!payload?.username?.trim() || !payload.media) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'Username and media selection are required.' } }));
                        }
                        const roomId = generateUniqueId('room').toUpperCase().substring(5, 11);
                        ws.roomId = roomId;
                        const newRoom = {
                            id: roomId,
                            hostId: ws.clientId,
                            players: new Map([[ws.clientId, { id: ws.clientId, ws, name: payload.username }]]),
                            gameState: {
                                selectedMedia: payload.media,
                                playbackState: { status: 'paused', time: 0 },
                                chatHistory: [],
                            },
                        };
                        rooms.set(roomId, newRoom);
                        console.log(`User ${payload.username} (${ws.clientId}) created room ${roomId}`);
                        broadcastRoomState(roomId);
                        break;
                    }
                    case 'quix-join-room': {
                        const { roomId, username } = payload;
                        if (!roomId || !username?.trim()) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room ID and username are required.' } }));
                        }
                        const roomToJoin = rooms.get(roomId);
                        if (!roomToJoin) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room not found.' } }));
                        }
                        const nameTaken = Array.from(roomToJoin.players.values()).some(p => p.name.toLowerCase() === username.toLowerCase());
                        if (nameTaken) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'That name is already taken in this room.' } }));
                        }
                        ws.roomId = roomId;
                        roomToJoin.players.set(ws.clientId, { id: ws.clientId, ws, name: username });
                        console.log(`User ${username} (${ws.clientId}) joined room ${roomId}`);
                        broadcastRoomState(roomId);
                        break;
                    }
                    case 'quix-leave-room': {
                        if (room) handleDisconnect(ws);
                        break;
                    }
                    case 'quix-playback-control': {
                        if (isHost && room && payload.playbackState) {
                            room.gameState.playbackState = payload.playbackState;
                            const updateMessage = JSON.stringify({ type: 'playback-update', payload: { playbackState: room.gameState.playbackState } });
                            room.players.forEach(({ ws: client }) => {
                                if (client.readyState === client.OPEN) client.send(updateMessage);
                            });
                        }
                        break;
                    }
                    case 'quix-chat-message': {
                        if (room && payload.message) {
                            const sender = room.players.get(ws.clientId);
                            const chatMessage = {
                                id: generateUniqueId('msg'),
                                senderId: ws.clientId,
                                senderName: sender.name,
                                text: payload.message.text,
                                image: payload.message.image,
                                timestamp: Date.now(),
                            };
                            room.gameState.chatHistory.push(chatMessage);
                            broadcastRoomState(ws.roomId);
                        }
                        break;
                    }
                    case 'quix-transfer-host': {
                        if (isHost && room && payload.newHostId && room.players.has(payload.newHostId)) {
                            room.hostId = payload.newHostId;
                            console.log(`Host of room ${ws.roomId} transferred to ${payload.newHostId}`);
                            broadcastRoomState(ws.roomId);
                        }
                        break;
                    }

                    // --- Remote Control Cases ---
                    case 'quix-register-slave': {
                        remoteSessions.set(ws.clientId, { slaveWs: ws, masterWs: null });
                        ws.send(JSON.stringify({ type: 'slave-registered', payload: { slaveId: ws.clientId } }));
                        console.log(`Slave registered: ${ws.clientId}`);
                        break;
                    }
                    case 'quix-register-master': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session) {
                            session.masterWs = ws;
                            ws.remoteSlaveId = payload.slaveId;
                            ws.send(JSON.stringify({ type: 'master-connected' }));
                            if (session.slaveWs?.readyState === ws.OPEN) {
                                session.slaveWs.send(JSON.stringify({ type: 'master-connected' }));
                            }
                            console.log(`Master ${ws.clientId} connected to slave ${payload.slaveId}`);
                        }
                        break;
                    }
                    case 'quix-remote-command': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.slaveWs && session.slaveWs.readyState === ws.OPEN) {
                            // The server just forwards the command; the slave client interprets it.
                            // This supports play, pause, seek_forward, seek_backward, stop, select_media etc.
                            session.slaveWs.send(JSON.stringify({ type: 'quix-remote-command-received', payload: payload }));
                        }
                        break;
                    }
                    case 'quix-slave-status-update': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            session.masterWs.send(JSON.stringify({ type: 'quix-slave-status-update', payload: payload }));
                        }
                        break;
                    }
                }
            } catch (e) {
                console.error(`Error processing message from ${ws.clientId}:`, e);
            }
        });

        ws.on('close', () => handleDisconnect(ws));

        ws.on('error', (error) => {
            console.error(`WebSocket error for ${ws.clientId}:`, error);
        });
    });
};

module.exports = webSocketRouter;