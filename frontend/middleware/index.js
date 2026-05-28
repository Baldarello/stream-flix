/**
 * @fileoverview Middleware Chain Composition for StreamFlix App
 * 
 * This module composes all application middlewares into a single chain
 * that handles rendering decisions in priority order.
 * 
 * Middleware Priority Order:
 * 1. System Middleware: Loading, Error
 * 2. Playback Middleware: QR Scanner, SmartTV Slave, Remote Master, Local Player
 * 3. App Mode Middleware: SmartTV Pairing
 * 4. Feature Middleware: Search, Home, Grid views, Library
 */

import { createMiddlewareChain } from './createMiddlewareChain.js';

// System Middleware
import { LoadingMiddleware } from './system/LoadingMiddleware.jsx';
import { ErrorMiddleware } from './system/ErrorMiddleware.jsx';

// Playback Middleware
import { QRScannerMiddleware } from './playback/QRScannerMiddleware.jsx';
import { SlavePlaybackMiddleware } from './playback/SlavePlaybackMiddleware.jsx';
import { MasterPlaybackMiddleware } from './playback/MasterPlaybackMiddleware.jsx';
import { LocalPlaybackMiddleware } from './playback/LocalPlaybackMiddleware.jsx';

// App Mode Middleware
import { SmartTVPairingMiddleware } from './appMode/SmartTVPairingMiddleware.jsx';

// Feature Middleware
import { SearchMiddleware } from './feature/SearchMiddleware.jsx';
import { HomeMiddleware } from './feature/HomeMiddleware.jsx';
import { GridMiddleware } from './feature/GridMiddleware.jsx';
import { LibraryMiddleware } from './feature/LibraryMiddleware.jsx';

/**
 * Main middleware chain for the application.
 * 
 * Each middleware is evaluated in order until one returns a component.
 * If all middlewares return null, nothing is rendered (except overlays).
 * 
 * @type {function({stores: Object, children: React.ReactNode}): React.ReactElement|null}
 */
export const middlewareChain = createMiddlewareChain([
    // System Middleware - handles loading and error states
    LoadingMiddleware,
    ErrorMiddleware,
    
    // Playback Middleware - handles video player modes
    QRScannerMiddleware,
    SlavePlaybackMiddleware,
    MasterPlaybackMiddleware,
    LocalPlaybackMiddleware,
    
    // App Mode Middleware - handles SmartTV pairing
    SmartTVPairingMiddleware,
    
    // Feature Middleware - handles main views
    SearchMiddleware,
    HomeMiddleware,
    GridMiddleware,
    LibraryMiddleware,
]);

/**
 * Overlay middleware group - always rendered on top
 * These are not part of the main chain as they should always be visible
 */
export { 
    LoadingMiddleware,
    ErrorMiddleware,
    QRScannerMiddleware,
    SlavePlaybackMiddleware,
    MasterPlaybackMiddleware,
    LocalPlaybackMiddleware,
    SmartTVPairingMiddleware,
    SearchMiddleware,
    HomeMiddleware,
    GridMiddleware,
    LibraryMiddleware,
};
