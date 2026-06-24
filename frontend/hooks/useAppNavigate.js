/**
 * @fileoverview useAppNavigate - MobX state to URL synchronization hook
 *
 * This hook bridges MobX application state with react-router URLs.
 * It keeps URL in sync with MobX state and vice versa.
 *
 * Route mapping:
 * - `/` → Home (currentActiveView)
 * - `/search` → Search view
 * - `/preferences` → Preferences view
 * - `/player` → Local playback
 * - `/master` → Master remote
 * - `/slave` → Slave playback
 * - `/pairing` → SmartTV pairing
 * - `/qr` → QR scanner
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { mediaStore } from '../store/mediaStore.js';
import { remoteStore } from '../store/remoteStore.js';

/**
 * Get the current route from MobX state
 */
export const getRouteFromState = () => {
    if (mediaStore.loading || mediaStore.isReloadingData || mediaStore.isGoogleAuthLoading) {
        return { path: '/', viewKey: 'loading' };
    }
    if (mediaStore.error) {
        return { path: '/', viewKey: 'error' };
    }
    if (remoteStore.isQRScannerOpen) {
        return { path: '/qr', viewKey: 'qr' };
    }
    if (remoteStore.isSmartTVPairingVisible && !mediaStore.nowPlayingItem) {
        return { path: '/pairing', viewKey: 'pairing' };
    }
    if (remoteStore.isRemoteMaster && remoteStore.remoteSlaveState?.nowPlayingItem) {
        return { path: '/master', viewKey: 'master' };
    }
    if (remoteStore.isSmartTV && mediaStore.nowPlayingItem) {
        return { path: '/slave', viewKey: 'slave' };
    }
    if (mediaStore.nowPlayingItem) {
        return { path: '/player', viewKey: 'player' };
    }
    if (mediaStore.isSearchActive) {
        return { path: '/search', viewKey: 'search' };
    }
    if (mediaStore.currentActiveView === 'Preferences') {
        return { path: '/preferences', viewKey: 'preferences' };
    }
    return { path: '/', viewKey: 'home' };
};

/**
 * Hook to synchronize MobX state with URL
 */
export const useAppNavigate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // null means "first render, don't skip"
    const prevPathnameRef = useRef(null);

    // Sync URL -> MobX state on navigation
    useEffect(() => {
        const currentPath = prevPathnameRef.current;
        const newPath = location.pathname;

        // On first render (currentPath is null), just set the ref and don't skip
        if (currentPath === null) {
            prevPathnameRef.current = newPath;
            return;
        }

        // Skip if pathname didn't actually change
        if (currentPath === newPath) return;

        // Update ref for next change
        prevPathnameRef.current = newPath;

        // Handle navigation away from player route - stop playback
        if (currentPath === '/player' && newPath !== '/player') {
            mediaStore.stopPlayback();
        }

        // Handle navigation away from search route
        if (currentPath === '/search' && newPath !== '/search' && mediaStore.isSearchActive) {
            mediaStore.toggleSearch(false);
        }

        // Handle navigation to search
        if (newPath === '/search' && !mediaStore.isSearchActive) {
            mediaStore.toggleSearch(true);
        }

        // Handle navigation to/from preferences
        if (newPath === '/preferences' && mediaStore.currentActiveView !== 'Preferences') {
            mediaStore.setActiveView('Preferences');
        } else if (currentPath === '/preferences' && newPath !== '/preferences' && mediaStore.currentActiveView === 'Preferences') {
            mediaStore.setActiveView('Home');
        }

        // Handle QR scanner route
        if (newPath === '/qr' && !remoteStore.isQRScannerOpen) {
            remoteStore.openQRScanner();
        }
        if (currentPath === '/qr' && newPath !== '/qr' && remoteStore.isQRScannerOpen) {
            remoteStore.closeQRScanner();
        }

        // Handle pairing route
        if (newPath === '/pairing' && !remoteStore.isSmartTVPairingVisible) {
            remoteStore.showSmartTVPairing();
        }
        if (currentPath === '/pairing' && newPath !== '/pairing' && remoteStore.isSmartTVPairingVisible && !mediaStore.nowPlayingItem) {
            remoteStore.exitSmartTVPairingMode();
        }

    }, [location.pathname]);

    // Navigate to a route based on MobX state
    const syncToUrl = useCallback((path) => {
        if (location.pathname !== path) {
            navigate(path, { replace: true });
        }
    }, [navigate, location.pathname]);

    // Navigation methods
    const goHome = useCallback(() => {
        mediaStore.toggleSearch(false);
        mediaStore.setActiveView('Home');
        syncToUrl('/');
    }, [syncToUrl]);

    const goSearch = useCallback(() => {
        mediaStore.toggleSearch(true);
        syncToUrl('/search');
    }, [syncToUrl]);

    const goPreferences = useCallback(() => {
        mediaStore.setActiveView('Preferences');
        syncToUrl('/preferences');
    }, [syncToUrl]);

    const goPairing = useCallback(() => {
        remoteStore.showSmartTVPairing();
        syncToUrl('/pairing');
    }, [syncToUrl]);

    const goQRScanner = useCallback(() => {
        remoteStore.openQRScanner();
        syncToUrl('/qr');
    }, [syncToUrl]);

    const goPlayer = useCallback(() => {
        syncToUrl('/player');
    }, [syncToUrl]);

    const goMaster = useCallback(() => {
        syncToUrl('/master');
    }, [syncToUrl]);

    const goSlave = useCallback(() => {
        syncToUrl('/slave');
    }, [syncToUrl]);

    return {
        syncToUrl,
        goHome,
        goSearch,
        goPreferences,
        goPairing,
        goQRScanner,
        goPlayer,
        goMaster,
        goSlave,
    };
};
