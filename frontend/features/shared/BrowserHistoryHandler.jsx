/**
 * @fileoverview Shared Feature - Browser History Handler
 * 
 * This component handles browser history (popstate) events:
 * - Closing video player when navigating back
 * - Closing detail view when navigating back
 */

import React, { useEffect } from 'react';
import { mediaStore } from '../../store/mediaStore.js';

/**
 * Browser History Handler Component
 * 
 * Listens to the browser's popstate event to handle back/forward navigation.
 * Properly closes video player and detail views when navigating.
 * 
 * @returns {null} This component doesn't render anything
 */
export const BrowserHistoryHandler = () => {
    useEffect(() => {
        const handlePopState = (event) => {
            // This event is triggered by the browser's back/forward buttons.
            const state = event.state || {}; // Handle initial null state

            // Case 1: User navigates BACK from the video player.
            // We check if a player should be open. If not, but we have a playing item,
            // it means we need to close it.
            if (!state.playerOpen && mediaStore.nowPlayingItem) {
                mediaStore._stopPlaybackWithoutHistory();
            }

            // Case 2: User navigates BACK from the detail view.
            // We check if a detail view should be open. If not, but we have one selected,
            // it means we need to close it. We also ensure we are not currently playing a video.
            // For remote master, we check currentSelectedItem, for slave/local, we check selectedItem.
            if (!state.detailViewOpen && mediaStore.currentSelectedItem && !mediaStore.nowPlayingItem) {
                // Check if it's a remote master clearing its UI state
                if (mediaStore.isRemoteMaster) {
                    mediaStore.clearMasterUiSelection();
                    // We don't push history for remote master's UI. The popstate should only be local.
                } else {
                    mediaStore._closeDetailWithoutHistory();
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    return null;
};
