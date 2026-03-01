// Struttura dati migliorata per le stanze
// Map<roomId, { players: Map<playerId, {ws: WebSocket, name: string, mediaStatus: object}>, hostId: string, gameState: object | null }>
const rooms = new Map();
const remoteSessions = new Map(); // slaveId -> { slaveWs, masterWs }
const shortCodeToSlaveId = new Map(); // shortCode -> slaveId
const mediaSyncProgress = new Map(); // syncId -> { total: number, completed: number, status: 'pending' | 'in_progress' | 'completed' | 'failed' }

function generateUniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}


function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateShortCode() {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (shortCodeToSlaveId.has(code)); // Ensure uniqueness
    return code;
}

// Funzione di utility per trasmettere a una stanza
function broadcastToRoom(roomId, data, excludeClient) {
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.players.forEach(({ws: client}) => {
        if (client !== excludeClient && client.readyState === client.OPEN) {
            client.send(data);
        }
    });
}

// Broadcasts the entire, consistent state of a room to all its players.
function broadcastRoomState(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(({ws: clientWs}, clientId) => {
        const payload = {
            roomId: room.id,
            hostId: room.hostId,
            participants: Array.from(room.players.values()).map(p => ({id: p.id, name: p.name})),
            selectedMedia: room.gameState.selectedMedia,
            playbackState: room.gameState.playbackState,
            chatHistory: room.gameState.chatHistory,
            isHost: clientId === room.hostId,
        };
        if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({type: 'quix-room-update', payload}));
        }
    });
}

function handleDisconnectQuix(ws) {
    console.log(`Client ${ws.userName} disconnected.`);

    // Clean up remote control sessions
    if (ws.remoteSlaveId) { // If the client was a master
        const session = remoteSessions.get(ws.remoteSlaveId);
        if (session) {
            session.masterWs = null;
            console.log(`Master ${ws.userName} disconnected from slave ${ws.remoteSlaveId}`);
        }
    }
    if (ws.slaveId && remoteSessions.has(ws.slaveId)) { // If the client was a slave
        const session = remoteSessions.get(ws.slaveId);
        if (session.masterWs && session.masterWs.readyState === session.masterWs.OPEN) {
            session.masterWs.send(JSON.stringify({type: 'quix-error', payload: {message: 'The TV has disconnected.'}}));
        }
        // Clean up any pending sync operations for this slave
        for (const [syncId, progress] of mediaSyncProgress.entries()) {
            if (progress.status === 'in_progress') {
                progress.status = 'failed';
            }
        }
        remoteSessions.delete(ws.slaveId);
        if (ws.shortCode) {
            shortCodeToSlaveId.delete(ws.shortCode);
        }
        console.log(`Slave ${ws.slaveId} session deleted.`);
    }

    // Clean up master-side sync progress when master disconnects
    if (ws.remoteSlaveId) {
        for (const [syncId, progress] of mediaSyncProgress.entries()) {
            if (progress.status === 'in_progress') {
                progress.status = 'failed';
            }
        }
    }

    // Clean up "Watch Together" rooms
    if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId);
        const wasHost = ws.userName === room.hostId;

        room.players.delete(ws.userName);

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


function heartbeat() {
    this.isAlive = true;
}

const webSocketRouter = (wss) => {
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
        ws.userName = generateId('player');

        ws.on('message', (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                const {type, payload, target} = parsedMessage;

                const room = ws.roomId ? rooms.get(ws.roomId) : null;
                const isHost = room && ws.userName === room.hostId;

                switch (type) {
                    case 'quix-create-room': {
                        if (!payload?.username?.trim() || !payload.media) {
                            return ws.send(JSON.stringify({
                                type: 'quix-error',
                                payload: {message: 'Username and media selection are required.'}
                            }));
                        }

                        const roomId = generateId('room').toUpperCase().substring(5, 11);
                        ws.roomId = roomId;

                        const newRoom = {
                            id: roomId,
                            hostId: ws.userName,
                            players: new Map([[ws.userName, {id: ws.userName, ws, name: payload.username}]]),
                            gameState: {
                                selectedMedia: payload.media,
                                playbackState: {status: 'paused', time: 0},
                                chatHistory: [],
                            },
                        };
                        rooms.set(roomId, newRoom);
                        console.log(`User ${payload.username} (${ws.userName}) created room ${roomId}`);
                        broadcastRoomState(roomId);
                        break;
                    }
                    case 'quix-join-room': {
                        const {roomId, username} = payload;
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

                        ws.roomId = roomId;
                        roomToJoin.players.set(ws.userName, {id: ws.userName, ws, name: username});
                        console.log(`User ${username} (${ws.userName}) joined room ${roomId}`);
                        broadcastRoomState(roomId);
                        break;
                    }
                    case 'quix-leave-room': {
                        if (room) handleDisconnectQuix(ws);
                        break;
                    }
                    case 'quix-playback-control': {
                        if (isHost && room && payload.playbackState) {
                            room.gameState.playbackState = payload.playbackState;
                            const updateMessage = JSON.stringify({
                                type: 'quix-playback-update',
                                payload: {playbackState: room.gameState.playbackState}
                            });
                            room.players.forEach(({ws: client}) => {
                                if (client.readyState === client.OPEN) client.send(updateMessage);
                            });
                        }
                        break;
                    }
                    case 'quix-chat-message': {
                        if (room && payload.message) {
                            const sender = room.players.get(ws.userName);
                            const chatMessage = {
                                id: generateId('msg'),
                                senderId: ws.userName,
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
                    case 'quix-kick-player': {
                        if (isHost && room && payload.playerId) {
                            const targetPlayer = room.players.get(payload.playerId);
                            if (targetPlayer && targetPlayer.ws !== ws) {
                                targetPlayer.ws.send(JSON.stringify({
                                    type: 'quix-error',
                                    payload: {message: 'You have been kicked by the host.'}
                                }));
                                handleDisconnectQuix(targetPlayer.ws); // force disconnect
                            }
                        }
                        break;
                    }

                    // --- Remote Control Cases ---
                    case 'quix-register-slave': {
                        const persistentId = payload?.slaveId || ws.userName;
                        ws.slaveId = persistentId; // Tag the websocket connection with its persistent slave ID

                        const shortCode = generateShortCode();
                        shortCodeToSlaveId.set(shortCode, persistentId);
                        ws.shortCode = shortCode;

                        remoteSessions.set(persistentId, {slaveWs: ws, masterWs: null});

                        ws.send(JSON.stringify({
                            type: 'quix-slave-registered',
                            payload: {slaveId: persistentId, shortCode}
                        }));
                        console.log(`Slave registered with ID: ${persistentId} and short code: ${shortCode}`);
                        break;
                    }
                    case 'quix-register-master': {
                        let fullSlaveId = payload.slaveId;
                        if (fullSlaveId && shortCodeToSlaveId.has(fullSlaveId.toUpperCase())) {
                            fullSlaveId = shortCodeToSlaveId.get(fullSlaveId.toUpperCase());
                        }

                        const session = remoteSessions.get(fullSlaveId);
                        if (session) {
                            session.masterWs = ws;
                            ws.remoteSlaveId = fullSlaveId;
                            ws.send(JSON.stringify({type: 'quix-master-connected'}));
                            if (session.slaveWs?.readyState === ws.OPEN) {
                                session.slaveWs.send(JSON.stringify({type: 'quix-master-connected'}));
                            }
                            console.log(`Master ${ws.clientId} connected to slave ${fullSlaveId}`);
                        }
                        break;
                    }
                    case 'quix-remote-command': {
                        const session = remoteSessions.get(payload.slaveId);
                        // Forward the command to the MASTER (phone), not the slave (TV)
                        // The slave sent this command requesting the master to show the media sync modal
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            session.masterWs.send(JSON.stringify({
                                type: 'quix-remote-command-received',
                                payload: payload
                            }));
                        }
                        break;
                    }
                    case 'quix-slave-status-update': {
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            session.masterWs.send(JSON.stringify({type: 'quix-slave-status-update', payload: payload}));
                        }
                        break;
                    }
                    case 'quix-select-media': {
                        if (isHost && room && payload.media) {
                            room.gameState.selectedMedia = payload.media;
                            console.log(`Host of room ${ws.roomId} changed media to ${payload.media.title || payload.media.name}`);
                            broadcastRoomState(ws.roomId);
                        }
                        break;
                    }
                    case 'quix-change-room-code': {
                        if (isHost && room) {
                            const oldRoomId = ws.roomId;
                            const newRoomId = generateUniqueId('room').toUpperCase().substring(5, 11);

                            room.id = newRoomId;
                            room.players.forEach(player => {
                                player.ws.roomId = newRoomId;
                            });

                            rooms.set(newRoomId, room);
                            rooms.delete(oldRoomId);

                            console.log(`Room code for ${oldRoomId} changed to ${newRoomId}`);
                            broadcastRoomState(newRoomId);
                        }
                        break;
                    }


                    // --- Media Sync Cases ---
                    case 'quix-request-media-list': {
                        // Master requests the list of available media from the slave
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.slaveWs && session.slaveWs.readyState === ws.OPEN) {
                            session.slaveWs.send(JSON.stringify({
                                type: 'quix-media-list-request',
                                payload: {requestId: payload.requestId}
                            }));
                        }
                        break;
                    }
                    case 'quix-media-list-response': {
                        // Slave responds with its available media list
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            session.masterWs.send(JSON.stringify({type: 'quix-media-list-response', payload: payload}));
                        }
                        break;
                    }
                    case 'quix-sync-media-request': {
                        // Master requests to sync specific media to the slave
                        const syncId = generateUniqueId('sync');
                        const session = remoteSessions.get(payload.slaveId);

                        if (session?.slaveWs && session.slaveWs.readyState === ws.OPEN) {
                            // Initialize sync progress
                            mediaSyncProgress.set(syncId, {
                                total: payload.mediaItems.length,
                                completed: 0,
                                status: 'in_progress'
                            });

                            // Send sync request to slave with syncId
                            session.slaveWs.send(JSON.stringify({
                                type: 'quix-sync-media-request',
                                payload: {
                                    syncId,
                                    mediaItems: payload.mediaItems
                                }
                            }));

                            // Confirm sync started to master
                            ws.send(JSON.stringify({
                                type: 'quix-sync-started',
                                payload: {
                                    syncId,
                                    totalItems: payload.mediaItems.length
                                }
                            }));

                            console.log(`Media sync initiated: ${syncId} for ${payload.mediaItems.length} items to slave ${payload.slaveId}`);
                        }
                        break;
                    }
                    case 'quix-sync-progress-update': {
                        // Slave reports sync progress
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            // Update local progress tracking
                            if (mediaSyncProgress.has(payload.syncId)) {
                                const progress = mediaSyncProgress.get(payload.syncId);
                                progress.completed = payload.completed;
                                progress.status = payload.completed >= payload.total ? 'completed' : 'in_progress';
                            }

                            session.masterWs.send(JSON.stringify({
                                type: 'quix-sync-progress-update',
                                payload: payload
                            }));
                        }
                        break;
                    }
                    case 'quix-sync-completed': {
                        // Slave confirms sync completion
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            if (mediaSyncProgress.has(payload.syncId)) {
                                const progress = mediaSyncProgress.get(payload.syncId);
                                progress.status = 'completed';
                                progress.completed = progress.total;
                            }

                            session.masterWs.send(JSON.stringify({
                                type: 'quix-sync-completed',
                                payload: payload
                            }));

                            console.log(`Media sync completed: ${payload.syncId}`);
                        }
                        break;
                    }
                    case 'quix-sync-error': {
                        // Slave reports sync error
                        const session = remoteSessions.get(payload.slaveId);
                        if (session?.masterWs && session.masterWs.readyState === ws.OPEN) {
                            if (mediaSyncProgress.has(payload.syncId)) {
                                const progress = mediaSyncProgress.get(payload.syncId);
                                progress.status = 'failed';
                            }

                            session.masterWs.send(JSON.stringify({
                                type: 'quix-sync-error',
                                payload: payload
                            }));

                            console.error(`Media sync error: ${payload.syncId} - ${payload.error}`);
                        }
                        break;
                    }
                    case 'transfer-host': {
                        if (isHost && room && payload?.newHostId) {
                            const newHostId = payload.newHostId;
                            const newHostPlayer = room.players.get(newHostId);

                            if (newHostPlayer) {
                                room.hostId = newHostId;
                                console.log(`Privilegi di host nella stanza ${ws.roomId} trasferiti da ${ws.userName} a ${newHostId}.`);

                                const lastState = room.gameState;
                                if (lastState && lastState.players) {
                                    const updatedPlayers = lastState.players.map(p => ({
                                        ...p,
                                        isHost: p.id === newHostId
                                    }));
                                    const newGameState = {...lastState, players: updatedPlayers};
                                    room.gameState = newGameState;

                                    const updateMessage = JSON.stringify({
                                        type: 'game-state-update',
                                        payload: newGameState
                                    });
                                    broadcastToRoom(ws.roomId, updateMessage);
                                }
                            }
                        }
                        break;
                    }

                    case 'create-room': {
                        if (!payload) {
                            ws.send(JSON.stringify({type: 'error', payload: {message: 'Richiesta non valida.'}}));
                            return;
                        }
                        const {userName, mediaStatus} = payload;
                        if (!userName || !userName.trim()) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                payload: {message: 'Il nome utente non può essere vuoto.'}
                            }));
                            return;
                        }

                        const roomId = generateRoomId();
                        ws.userName = userName; // Usa il nome fornito dal client come ID univoco

                        rooms.set(roomId, {
                            players: new Map([[ws.userName, {ws, name: userName, mediaStatus}]]),
                            hostId: ws.userName,
                            gameState: null,
                        });

                        ws.roomId = roomId;

                        // Invia indietro sia il roomId che il userName per la conferma
                        ws.send(JSON.stringify({type: 'room-created', payload: {roomId, userName}}));
                        console.log(`Utente ${userName} ha creato e si è unito alla stanza ${roomId} come host.`);
                        break;
                    }

                    case 'join-room': {
                        if (!payload) {
                            ws.send(JSON.stringify({type: 'error', payload: {message: 'Richiesta non valida.'}}));
                            return;
                        }
                        const {roomId, userName, mediaStatus} = payload;
                        if (!userName || !userName.trim()) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                payload: {message: 'Il nome utente non può essere vuoto.'}
                            }));
                            return;
                        }
                        if (!rooms.has(roomId)) {
                            ws.send(JSON.stringify({type: 'error', payload: {message: 'Stanza non trovata.'}}));
                            return;
                        }

                        const roomToJoin = rooms.get(roomId);

                        // Case-insensitive duplicate name validation
                        const lowerCaseUserName = userName.toLowerCase();
                        const nameTaken = Array.from(roomToJoin.players.values()).some(p => p.name.toLowerCase() === lowerCaseUserName);

                        if (nameTaken) {
                            ws.send(JSON.stringify({type: 'error', payload: {message: 'lobby.nameTakenError'}}));
                            return;
                        }

                        // Invia l'elenco degli utenti esistenti al nuovo utente per la configurazione di WebRTC
                        const existingUsers = Array.from(roomToJoin.players.keys());
                        ws.send(JSON.stringify({type: 'existing-users', payload: existingUsers}));

                        ws.userName = userName;
                        roomToJoin.players.set(ws.userName, {ws, name: userName, mediaStatus});
                        ws.roomId = roomId;

                        // Invia indietro sia il roomId che il userName per la conferma
                        ws.send(JSON.stringify({type: 'join-success', payload: {roomId, userName}}));

                        // Invia lo stato di gioco attuale al nuovo utente, se esiste.
                        if (roomToJoin.gameState) {
                            ws.send(JSON.stringify({type: 'game-state-update', payload: roomToJoin.gameState}));
                        }

                        // Trasmetti che un nuovo utente si è unito a tutti gli altri nella stanza
                        const joinMessage = JSON.stringify({
                            type: 'user-joined',
                            payload: {user: ws.userName, mediaStatus}
                        });
                        broadcastToRoom(roomId, joinMessage, ws);

                        console.log(`Utente ${userName} si è unito alla stanza ${roomId}`);
                        break;
                    }

                    // Inoltro di messaggi per la segnalazione WebRTC
                    case 'offer':
                    case 'answer':
                    case 'candidate': {
                        if (room && target) {
                            const targetPlayer = room.players.get(target);
                            if (targetPlayer && targetPlayer.ws.readyState === targetPlayer.ws.OPEN) {
                                const messageWithSender = {...parsedMessage, sender: ws.userName};
                                targetPlayer.ws.send(JSON.stringify(messageWithSender));
                            }
                        }
                        break;
                    }

                    // --- Messaggi validi solo se in una stanza ---

                    case 'game-state-update':
                    case 'sync-timer': {
                        if (type === 'game-state-update' && typeof payload === 'undefined') return;
                        if (isHost && room) {
                            if (type === 'game-state-update') {
                                room.gameState = payload; // Salva l'ultimo stato del gioco
                            }
                            broadcastToRoom(ws.roomId, message.toString(), ws);
                        }
                        break;
                    }

                    case 'kick-player': {
                        if (isHost && room && payload?.playerId) {
                            const targetPlayer = room.players.get(payload.playerId);
                            if (targetPlayer && targetPlayer.ws !== ws) { // L'host non può espellere se stesso
                                console.log(`Host ${ws.userName} ha espulso ${payload.playerId}`);
                                targetPlayer.ws.send(JSON.stringify({
                                    type: 'error',
                                    payload: {message: 'Sei stato espulso dall\'host.'}
                                }));
                                targetPlayer.ws.terminate();
                            }
                        }
                        break;
                    }

                    // Messaggi che devono essere inoltrati all'host per l'elaborazione
                    case 'day-vote':
                    case 'night-action':
                    case 'name-sync':
                    case 'special-chat':
                    case 'media-status-update': {
                        if (room) {
                            const hostWs = room.players.get(room.hostId)?.ws;
                            if (hostWs && hostWs.readyState === hostWs.OPEN) {
                                const messageWithSender = {...parsedMessage, sender: ws.userName};
                                hostWs.send(JSON.stringify(messageWithSender));
                            }
                        }
                        break;
                    }

                    case 'chat': {
                        if (room && payload?.text) {
                            const messageToBroadcast = {
                                type: 'chat',
                                payload: {text: payload.text, sender: ws.userName}
                            };
                            broadcastToRoom(ws.roomId, JSON.stringify(messageToBroadcast));
                        }
                        break;
                    }
                }
            } catch (e) {
                console.error(`Errore nel processare il messaggio da ${ws.userName}:`, e);
            }
        });

        ws.on('close', () => {

            if (ws.slaveId) {
                handleDisconnectQuix(ws)
            } else {
                if (!ws.roomId || !rooms.has(ws.roomId)) {
                    console.log(`Client ${ws.userName} disconnesso (non era in una stanza).`);
                    return;
                }

                const room = rooms.get(ws.roomId);
                const playerInfo = room.players.get(ws.userName);
                const wasHost = ws.userName === room.hostId;

                room.players.delete(ws.userName);
                console.log(`Client ${playerInfo?.name || ws.userName} disconnesso dalla stanza ${ws.roomId}.`);

                // Trasmetti l'evento 'user-left' a tutti i client rimanenti
                broadcastToRoom(ws.roomId, JSON.stringify({type: 'user-left', payload: {user: ws.userName}}));

                if (room.players.size === 0) {
                    rooms.delete(ws.roomId);
                    console.log(`Stanza ${ws.roomId} vuota, eliminata.`);
                } else if (wasHost) {
                    // L'host si è disconnesso. Promuovi un nuovo host e trasmetti il nuovo stato.
                    const newHostId = room.players.keys().next().value;
                    room.hostId = newHostId;
                    console.log(`Host disconnesso. Nuovo host per la stanza ${ws.roomId} è ${newHostId}.`);

                    const lastState = room.gameState;
                    if (lastState && lastState.players) {
                        // Aggiorna l'elenco dei giocatori e lo stato dell'host nello stato di gioco memorizzato nella cache
                        const updatedPlayers = lastState.players
                            .filter(p => p.id !== ws.userName) // Rimuovi il vecchio host
                            .map(p => ({...p, isHost: p.id === newHostId})); // Assegna il nuovo host

                        const newGameState = {...lastState, players: updatedPlayers};
                        room.gameState = newGameState; // Aggiorna la cache del server

                        // Trasmetti lo stato aggiornato a tutti i giocatori rimasti
                        const updateMessage = JSON.stringify({
                            type: 'game-state-update',
                            payload: newGameState
                        });
                        broadcastToRoom(ws.roomId, updateMessage);
                    } else {
                        console.warn(`L'host della stanza ${ws.roomId} si è disconnesso, ma non è stato trovato l'ultimo stato di gioco. La migrazione dell'host potrebbe essere incompleta.`);
                    }
                }
            }
        });

        ws.on('error', (error) => {
            console.error(`Errore WebSocket per ${ws.userName}:`, error);
        });
    });
};

module.exports = webSocketRouter;