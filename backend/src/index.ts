import {Elysia} from 'elysia';
import {cors} from '@elysiajs/cors';
import {createWebSocketRouter} from './wss.js';


// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000');
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Path to the frontend dev server (Vite dev server)
const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL || 'http://localhost:5173';

// ============================================================================
// Main Application
// ============================================================================

// Create Elysia app with proper configuration
const app = new Elysia({
    websocket: {
        idleTimeout: 30,
        maxPayloadLength: 65536,
    },
})
    // Configure CORS
    .use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }))
    // Health check endpoint
    .get('/health', () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime(),
    }))
    // API info endpoint
    .get('/api', () => ({
        name: 'Stream-Flix API',
        version: '1.0.0',
        endpoints: {
            websocket: `ws://localhost:${PORT}/ws`,
            health: 'GET /health',
        },
    }))
    // WebSocket connection handler
    .ws('/ws', {
        message: createWebSocketRouter(),
        open(ws: unknown) {
            const socket = ws as { id: string; send: (data: string) => void };
            console.log(`WebSocket client connected: ${socket.id}`);

            // Send welcome message
            socket.send(JSON.stringify({
                type: 'connected',
                payload: {message: 'Connected to Stream-Flix WebSocket server'}
            }));
        },
        close(ws: unknown) {
            const socket = ws as { id: string };
            console.log(`WebSocket client disconnected: ${socket.id}`);
        },
        error(ws: unknown) {
            const socket = ws as { id: string };
            console.error(`WebSocket error for ${socket.id}`);
        },
    })
    // Proxy all other requests to frontend dev server
    .get('/*', async ({request, set}) => {
        try {
            const url = new URL(request.url);
            const targetUrl = `${FRONTEND_DEV_URL}${url.pathname}${url.search}`;

            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'Host': 'localhost:5173',
                },
                body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
            });

            set.status = response.status;
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            set.headers = headers;

            return await response.text();
        } catch (error) {
            console.error('Proxy error:', error);
            set.status = 502;
            return 'Frontend dev server not available. Make sure Vite is running on port 5173.';
        }
    })
    // Global error handler
    .onError(({code, error, set}) => {
        console.error(`[Elysia Error] Code: ${code}, Error:`, error);

        switch (code) {
            case 'NOT_FOUND':
                set.status = 404;
                return {error: 'Resource not found', code: 'NOT_FOUND'};
            case 'VALIDATION':
                set.status = 400;
                return {error: 'Invalid input', code: 'VALIDATION'};
            case 'INTERNAL_SERVER_ERROR':
                set.status = 500;
                return {error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR'};
            default:
                set.status = 500;
                return {error: 'An unexpected error occurred', code};
        }
    });

// ============================================================================
// Heartbeat Mechanism
// ============================================================================

const heartbeatInterval = setInterval(() => {
    const wsServer = (app.server as unknown as {
        ws?: { clients: Iterable<{ isAlive?: boolean; terminate?: () => void }> }
    })?.ws;
    if (!wsServer?.clients) return;

    for (const ws of Array.from(wsServer.clients)) {
        if (ws.isAlive === false) {
            console.log('Terminating dead WebSocket connection');
            ws.terminate?.();
            continue;
        }

        ws.isAlive = false;
    }
}, WS_HEARTBEAT_INTERVAL);

// ============================================================================
// Graceful Shutdown
// ============================================================================

const cleanup = () => {
    console.log('\nShutting down gracefully...');
    clearInterval(heartbeatInterval);
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// ============================================================================
// Start the Server
// ============================================================================

app.listen(PORT, () => {
    console.log(`
 ╔══════════════════════════════════════════════════════════════╗
 ║                    Stream-Flix Backend                       ║
 ╠══════════════════════════════════════════════════════════════╣
 ║  Server running on: http://localhost:${PORT}                   ║
 ║  WebSocket:       ws://localhost:${PORT}/ws                    ║
 ║  Environment:     ${NODE_ENV.padEnd(42)}║
 ╚══════════════════════════════════════════════════════════════╝
    `);
});

export {app};
