/**
 * @fileoverview Shared Feature - App Initializer
 * 
 * This component handles app initialization effects:
 * - Google Auth initialization
 * - Loading persisted data from IndexedDB
 * - Fetching initial data from API
 * - Handling URL parameters (roomId, importFromUrl)
 */

import React, { useEffect } from 'react';
import { mediaStore } from '../../store/mediaStore.js';
import { websocketService } from '../../services/websocketService.js';
import { initGoogleAuth } from '../../services/googleAuthService';

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
