import { readFileSync, existsSync } from 'fs';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { createWebSocketRouter } from './wss.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000');
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Path to the frontend dist directory (root/frontend/dist)
const DIST_PATH = join(__dirname, '..', '..', 'frontend', 'dist');

// ============================================================================
// Utility Functions
// ============================================================================

function validateFrontendBuild(): void {
    const frontendIndexPath = join(DIST_PATH, 'index.html');
    if (!existsSync(frontendIndexPath)) {
        console.warn(`\n⚠️  WARNING: Frontend build not found at ${DIST_PATH}`);
        console.warn('   The frontend needs to be built before starting the server.');
        console.warn('   Run: cd frontend && npm run build\n');
    }
}

// ============================================================================
// Main Application
// ============================================================================

// Validate frontend build exists at startup
validateFrontendBuild();

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
    // Serve static files from the frontend dist directory
    .use(staticPlugin({
        assets: DIST_PATH,
        prefix: '/',
        indexHTML: false,
        headers: {
            'Cache-Control': 'public, max-age=31536000',
        },
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
                payload: { message: 'Connected to Stream-Flix WebSocket server' }
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
    // Serve index.html for root path
    .get('/', async ({ set }) => {
        const indexPath = join(DIST_PATH, 'index.html');
        try {
            if (!existsSync(indexPath)) {
                set.status = 404;
                return 'Frontend not found. Please build the frontend first.';
            }
            const indexContent = readFileSync(indexPath, 'utf-8');
            set.headers['Content-Type'] = 'text/html';
            return indexContent;
        } catch (error) {
            console.error('Error reading index.html:', error);
            set.status = 404;
            return 'Frontend not found. Please build the frontend first.';
        }
    })
    // Catch-all route for SPA
    .get('/*', async ({ set }) => {
        const indexPath = join(DIST_PATH, 'index.html');
        try {
            if (!existsSync(indexPath)) {
                set.status = 404;
                return 'Frontend not found. Please build the frontend first.';
            }
            const indexContent = readFileSync(indexPath, 'utf-8');
            set.headers['Content-Type'] = 'text/html';
            return indexContent;
        } catch (error) {
            console.error('Error reading index.html:', error);
            set.status = 404;
            return 'Frontend not found. Please build the frontend first.';
        }
    })
    // Global error handler
    .onError(({ code, error, set }) => {
        console.error(`[Elysia Error] Code: ${code}, Error:`, error);
        
        switch (code) {
            case 'NOT_FOUND':
                set.status = 404;
                return { error: 'Resource not found', code: 'NOT_FOUND' };
            case 'VALIDATION':
                set.status = 400;
                return { error: 'Invalid input', code: 'VALIDATION' };
            case 'INTERNAL_SERVER_ERROR':
                set.status = 500;
                return { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' };
            default:
                set.status = 500;
                return { error: 'An unexpected error occurred', code };
        }
    });

// ============================================================================
// Heartbeat Mechanism
// ============================================================================

const heartbeatInterval = setInterval(() => {
    const wsServer = (app.server as unknown as { ws?: { clients: Iterable<{ isAlive?: boolean; terminate?: () => void }> } })?.ws;
    if (!wsServer?.clients) return;

    for (const ws of wsServer.clients) {
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

export { app };
