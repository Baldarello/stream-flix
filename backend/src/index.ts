import {Elysia} from 'elysia';
import {cors} from '@elysiajs/cors';
import {staticPlugin} from '@elysiajs/static';
import {createWebSocketRouter} from './wss.js';
import {readFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';


// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000');
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Path to the frontend dev server (Vite dev server)
const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL || 'http://localhost:3000';

// ============================================================================
// Main Application
// ============================================================================

// Determine the frontend static path (for production)
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_PATH = join(__dirname, '..', 'public');
const isProduction = NODE_ENV === 'production';

console.log(`Starting in ${NODE_ENV} mode`);
console.log(`Public path: ${PUBLIC_PATH}`);

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
        name: 'Quix API',
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
                payload: {message: 'Connected to Quix WebSocket server'}
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
    });

// Handle frontend requests based on environment
if (isProduction) {
    // In production: serve static files from ./public
    console.log('Using static file serving for production');
    
    app.use(staticPlugin({
        assets: PUBLIC_PATH,
        prefix: '/',
    }));
    
    // Fallback to index.html for SPA routing
    app.get('/*', async ({set}) => {
        const indexPath = join(PUBLIC_PATH, 'index.html');
        if (existsSync(indexPath)) {
            set.headers['Content-Type'] = 'text/html';
            return readFileSync(indexPath, 'utf-8');
        }
        set.status = 404;
        return 'Not Found';
    });
} else {
    // In development: proxy all requests to frontend dev server
    console.log(`Proxying to frontend dev server at ${FRONTEND_DEV_URL}`);
    
    app.get('/*', async ({request, set}) => {
        try {
            const url = new URL(request.url);
            const targetUrl = `${FRONTEND_DEV_URL}${url.pathname}${url.search}`;

            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'Host': 'localhost:3000',
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
            return 'Frontend dev server not available. Make sure Vite is running on port 3000.';
        }
    });
}

// Global error handler
app.onError(({code, error, set}) => {
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
 ║                    Quix Backend                       ║
 ╠══════════════════════════════════════════════════════════════╣
 ║  Server running on: http://localhost:${PORT}                   ║
 ║  WebSocket:       ws://localhost:${PORT}/ws                    ║
 ║  Environment:     ${NODE_ENV.padEnd(42)}║
 ╚══════════════════════════════════════════════════════════════╝
    `);
});

export {app};
