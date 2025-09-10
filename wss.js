// Using Maps for efficient lookups and deletions.
const rooms = new Map(); // roomId -> room object
const remoteSessions = new Map(); // slaveId -> { slaveWs, masterWs }

function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Broadcasts a message to all players in a room.
function broadcastToRoom(roomId, message, excludeWs) {
    const room = rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);
    room.players.forEach(({ ws }) => {
        if (ws !== excludeWs && ws.readyState === ws.OPEN) {
            ws.send(data);
        }
    });
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
            clientWs.send(JSON.stringify({ type: 'room-update', payload }));
        }
    });
}


function heartbeat() {
    this.isAlive = true;
}

const webSocketRouter = (wss) => {
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
        ws.clientId = generateId('player');
        console.log(`Client connected: ${ws.clientId}`);

        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                const { type, payload } = parsedMessage;

                const room = ws.roomId ? rooms.get(ws.roomId) : null;
                const isHost = room && ws.clientId === room.hostId;

                switch (type) {
                    // --- Watch Together Cases ---
                    case 'create-room': {
                        if (!payload?.username?.trim() || !payload.media) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'Username and media selection are required.' } }));
                        }
                        
                        const roomId = generateId('room').toUpperCase().substring(5, 11);
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
                    case 'join-room': {
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
                    case 'leave-room': {
                        if (room) handleLeaveRoom(ws);
                        break;
                    }
                    case 'playback-control': {
                        if (isHost && room && payload.playbackState) {
                            room.gameState.playbackState = payload.playbackState;
                            broadcastToRoom(ws.roomId, { type: 'playback-update', payload: { playbackState: room.gameState.playbackState } });
                        }
                        break;
                    }
                    case 'chat-message': {
                        if (room && payload.message) {
                            const sender = room.players.get(ws.clientId);
                            const chatMessage = {
                                id: generateId('msg'),
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
                    case 'transfer-host': {
                        if (isHost && room && payload.newHostId && room.players.has(payload.newHostId)) {
                            room.hostId = payload.newHostId;
                            console.log(`Host of room ${ws.roomId} transferred to ${payload.newHostId}`);
                            broadcastRoomState(ws.roomId);
                        }
                        break;
                    }
                    case 'kick-player': {
                        if (isHost && room && payload.playerId) {
                            const targetPlayer = room.players.get(payload.playerId);
                            if (targetPlayer && targetPlayer.ws !== ws) {
                                targetPlayer.ws.send(JSON.stringify({ type: 'error', payload: { message: 'You have been kicked by the host.' } }));
                                handleLeaveRoom(targetPlayer.ws, true); // force disconnect
                            }
                        }
                        break;
                    }

                    // --- Remote Control Cases ---
                    case 'register-slave': {
                        remoteSessions.set(ws.clientId, { slaveWs: ws, masterWs: null });
                        ws.send(JSON.stringify({ type: 'slave-registered', payload: { slaveId: ws.clientId } }));
                        console.log(`Slave registered: ${ws.clientId}`);
                        break;
                    }
                    case 'register-master': {
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
                    case 'remote-command': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.slaveWs && session.slaveWs.readyState === ws.OPEN) {
                            session.slaveWs.send(JSON.stringify({ type: 'remote-command-received', payload: payload }));
                        }
                        break;
                    }
                    case 'slave-status-update': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            session.masterWs.send(JSON.stringify({ type: 'slave-status-update', payload: payload }));
                        }
                        break;
                    }
                }
            } catch (e) {
                console.error(`Error processing message from ${ws.clientId}:`, e);
            }
        });

        ws.on('close', () => {
            handleLeaveRoom(ws);
            
            // Handle remote session cleanup
            if (remoteSessions.has(ws.clientId)) { // It was a slave
                const session = remoteSessions.get(ws.clientId);
                if (session.masterWs?.readyState === ws.OPEN) {
                    session.masterWs.send(JSON.stringify({ type: 'error', payload: { message: 'TV disconnected' }}));
                }
                remoteSessions.delete(ws.clientId);
                console.log(`Slave disconnected and removed: ${ws.clientId}`);
            } else if (ws.remoteSlaveId) { // It was a master
                const session = remoteSessions.get(ws.remoteSlaveId);
                if (session) session.masterWs = null;
                 console.log(`Master disconnected from slave ${ws.remoteSlaveId}`);
            }

            console.log(`Client disconnected: ${ws.clientId}`);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for ${ws.clientId}:`, error);
        });
    });

    const handleLeaveRoom = (ws, wasKicked = false) => {
        if (!ws.roomId || !rooms.has(ws.roomId)) return;
        
        const room = rooms.get(ws.roomId);
        if (!room.players.has(ws.clientId)) return;

        const wasHost = ws.clientId === room.hostId;
        room.players.delete(ws.clientId);
        console.log(`Client ${ws.clientId} left room ${ws.roomId}. Kicked: ${wasKicked}`);

        if (room.players.size === 0) {
            rooms.delete(ws.roomId);
            console.log(`Room ${ws.roomId} is empty and has been deleted.`);
        } else {
            if (wasHost) {
                const newHostId = room.players.keys().next().value;
                room.hostId = newHostId;
                console.log(`Host left. New host for ${ws.roomId} is ${newHostId}.`);
            }
            broadcastRoomState(ws.roomId);
        }
        
        ws.roomId = null; // Clear room association
    };
};

module.exports = webSocketRouter;
