/**
 * @fileoverview Shared Feature - App Initializer
 *
 * This component handles app initialization effects:
 * - Google Auth initialization
 * - Loading persisted data from IndexedDB
 * - Fetching initial data from API
 * - Handling URL parameters (roomId, importFromUrl)
 * - Registering the GSAP ScrollTrigger plugin used by the cinematic
 *   transition portal, holo cards and the floating dock.
 */

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mediaStore } from '../../store/mediaStore.js';
import { initGoogleAuth } from '../../services/googleAuthService';

// Register the ScrollTrigger plugin once at app boot. Safe to call multiple
// times - GSAP dedupes plugin registration internally.
let scrollTriggerRegistered = false;
const ensureScrollTrigger = () => {
    if (scrollTriggerRegistered) return;
    try {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        scrollTriggerRegistered = true;
    } catch (_e) {
        // ScrollTrigger not available (e.g. SSR or test env). Silently
        // skip - the cinematic effects degrade to CSS transitions.
    }
};

/**
 * App Initializer Component
 *
 * Handles all app initialization logic in a single useEffect.
 * This runs once on mount and sets up the application state.
 *
 * @returns {null} This component doesn't render anything
 */
export const AppInitializer = () => {
    useEffect(() => {
        ensureScrollTrigger();

        const initializeApp = async () => {
            await initGoogleAuth();
            await mediaStore.loadPersistedData();
            mediaStore.fetchAllData();

            const params = new URLSearchParams(window.location.search);

            // Handle Watch Together room ID from URL
            const roomIdFromUrl = params.get('roomId');
            if (roomIdFromUrl) {
                mediaStore.setJoinRoomIdFromUrl(roomIdFromUrl);
                mediaStore.openWatchTogetherModal(null);
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Handle Library Import from URL
            const importUrl = params.get('importFromUrl');
            if (importUrl) {
                mediaStore.setImportUrl(importUrl);
                mediaStore.openImportModal();
                // Clean the URL in the browser bar
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };

        initializeApp();
    }, []);

    return null;
};
