/**
 * @fileoverview Playback Middleware - Local Player Handler
 * 
 * This middleware handles the local video playback mode,
 * displaying the local video player when content is playing locally.
 */

import React from 'react';
import VideoPlayer from '../../components/media/VideoPlayer.jsx';
import LinkSelectionModal from '../../components/modals/LinkSelectionModal.jsx';
import { NotificationSnackbar } from '../../components/utilities/NotificationSnackbar.jsx';
import EpisodeInfoModal from '../../components/modals/EpisodeInfoModal.jsx';
import DebugOverlay from '../../components/utilities/DebugOverlay.jsx';

/**
 * Local Playback Middleware
 * 
 * Checks if there is a local video playing (nowPlayingItem is set).
 * If so, displays the VideoPlayer component with associated overlays.
 * This is the fallback playback mode when not using SmartTV slave or remote master.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with nowPlayingItem
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Video player or null to continue chain
 */
export const LocalPlaybackMiddleware = ({ stores, children }) => {
    const { nowPlayingItem } = stores.mediaStore;

    if (nowPlayingItem) {
        return (
            <>
                <VideoPlayer />
                <LinkSelectionModal />
                <NotificationSnackbar />
                <EpisodeInfoModal />
                <DebugOverlay />
            </>
        );
    }

    return children;
};
