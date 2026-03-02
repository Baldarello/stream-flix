import {readFileSync, existsSync} from 'fs';
import {Elysia, t, type Static} from 'elysia';
import {cors} from '@elysiajs/cors';
import {staticPlugin} from '@elysiajs/static';
import {createWebSocketRouter} from './wss.js';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Environment Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000');
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');
const WS_HEARTBEAT_TIMEOUT = parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '60000');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Path to the frontend dist directory (root/frontend/dist)
const DIST_PATH = join(__dirname, '..', '..', 'frontend', 'dist');

// ============================================================================
// TypeBox Validation Schemas
// ============================================================================

const HealthResponseSchema = t.Object({
    status: t.String(),
    timestamp: t.String(),
    environment: t.String(),
    uptime: t.Number(),
});

const ApiInfoSchema = t.Object({
    name: t.String(),
    version: t.String(),
    endpoints: t.Object({
        websocket: t.String(),
        health: t.String(),
    }),
});

type HealthResponse = Static<typeof HealthResponseSchema>;
type ApiInfo = Static<typeof ApiInfoSchema>;

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

function formatUptime(uptime: number): string {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// ============================================================================
// Decorators
// ============================================================================

function setupDecorators(app: Elysia): Elysia {
    return app
        .decorate('utils', {
            formatUptime,
            getDistPath: () => DIST_PATH,
        })
        .decorate('config', {
            port: PORT,
            nodeEnv: NODE_ENV,
            wsHeartbeatInterval: WS_HEARTBEAT_INTERVAL,
        });
}

// ============================================================================
// Route Groups
// ============================================================================

function setupHealthRoutes(app: Elysia): Elysia {
    return app
        .get('/health', ({utils}): HealthResponse => ({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            uptime: process.uptime(),
        }))
        .get('/api', (): ApiInfo => ({
            name: 'Stream-Flix API',
            version: '1.0.0',
            endpoints: {
                websocket: `ws://localhost:${PORT}/ws`,
                health: 'GET /health',
            },
        }));
}

function setupStaticRoutes(app: Elysia): Elysia {
    return app
        .get('/', async ({send, utils}) => {
            const indexPath = join(DIST_PATH, 'index.html');
            try {
                if (!existsSync(indexPath)) {
                    return send(404, 'Frontend not found. Please build the frontend first.');
                }
                const indexContent = readFileSync(indexPath, 'utf-8');
                return send(200, indexContent, {
                    'Content-Type': 'text/html',
                });
            } catch (error) {
                console.error('Error reading index.html:', error);
                return send(404, 'Frontend not found. Please build the frontend first.');
            }
        })
        .get('/*', async ({send, utils}) => {
            const indexPath = join(DIST_PATH, 'index.html');
            try {
                if (!existsSync(indexPath)) {
                    return send(404, 'Frontend not found. Please build the frontend first.');
                }
                const indexContent = readFileSync(indexPath, 'utf-8');
                return send(200, indexContent, {
                    'Content-Type': 'text/html',
                });
            } catch (error) {
                console.error('Error reading index.html:', error);
                return send(404, 'Frontend not found. Please build the frontend first.');
            }
        });
}

function setupWebSocketRoutes(app: Elysia): Elysia {
    return app.ws('/ws', {
        message: createWebSocketRouter(),
        open(ws) {
            console.log(`WebSocket client connected: ${ws.id}`);

            // Access and set custom data safely
            const wsData = ws.data as { isAlive?: boolean };
            wsData.isAlive = true;

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                payload: {message: 'Connected to Stream-Flix WebSocket server'}
            }));
        },
        close(ws) {
            console.log(`WebSocket client disconnected: ${ws.id}`);
        },
        error(ws, error) {
            console.error(`WebSocket error for ${ws.id}:`, error);
        },
    });
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

function setupLifecycleHooks(app: Elysia): Elysia {
    // Global error handler
    app.onError(({code, error, set}) => {
        console.error(`[Elysia Error] Code: ${code}, Error:`, error.message);

        switch (code) {
            case 'NOT_FOUND':
                set.status = 404;
                return {error: 'Resource not found', code: 'NOT_FOUND'};
            case 'VALIDATION':
                set.status = 400;
                return {error: 'Invalid input', details: error.message, code: 'VALIDATION'};
            case 'INTERNAL_SERVER_ERROR':
                set.status = 500;
                return {error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR'};
            default:
                set.status = 500;
                return {error: 'An unexpected error occurred', code};
        }
    });

    // Request logging (for non-production)
    if (NODE_ENV !== 'production') {
        app.onRequest(({method, path}) => {
            console.log(`[${method}] ${path}`);
        });
    }

    return app;
}

// ============================================================================
// Heartbeat Mechanism
// ============================================================================

function setupHeartbeat(): NodeJS.Timeout {
    return setInterval(() => {
        const wsServer = (app.server as unknown as {
            ws?: { clients: Iterable<{ isAlive?: boolean; terminate?: () => void }> }
        })?.ws;
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
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function setupGracefulShutdown(heartbeatInterval: NodeJS.Timeout): void {
    const cleanup = () => {
        console.log('\nShutting down gracefully...');
        clearInterval(heartbeatInterval);
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
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
    // Apply decorators first
    .use(setupDecorators)
    // Setup lifecycle hooks
    .use(setupLifecycleHooks)
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
    // Setup routes
    .use(setupHealthRoutes)
    .use(setupWebSocketRoutes)
    .use(setupStaticRoutes);

// Setup heartbeat
const heartbeatInterval = setupHeartbeat();

// Setup graceful shutdown
setupGracefulShutdown(heartbeatInterval);

// Start the server
app.listen(PORT, () => {
    console.log(`
 ╔══════════════════════════════════════════════════════════════╗
 ║                    Stream-Flix Backend                       ║
 ╠══════════════════════════════════════════════════════════════╣
 ║  Server running on: http://localhost:${PORT}                   ║
 ║  WebSocket:       ws://localhost:${PORT}/ws                    ║
 ║  Environment:     ${NODE_ENV.padEnd(42)}║
 ║  Frontend path:   ${DIST_PATH.padEnd(42)}║
 ╚══════════════════════════════════════════════════════════════╝
    `);
});

export {app};
