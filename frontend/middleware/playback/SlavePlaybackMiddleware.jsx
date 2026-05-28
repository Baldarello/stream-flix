/**
 * @fileoverview Playback Middleware - SmartTV Slave Handler
 * 
 * This middleware handles the SmartTV slave playback mode,
 * displaying the slave video player when the SmartTV is playing content from master.
 */

import React from 'react';
import SlaveVideoPlayer from '../../components/media/SlaveVideoPlayer.jsx';
import EpisodeInfoModal from '../../components/modals/EpisodeInfoModal.jsx';
import { NotificationSnackbar } from '../../components/utilities/NotificationSnackbar.jsx';
import DebugOverlay from '../../components/utilities/DebugOverlay.jsx';

/**
 * Slave Playback Middleware
 * 
 * Checks if the device is a SmartTV and is playing content from a remote master.
 * If so, displays the SlaveVideoPlayer component with associated overlays.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with nowPlayingItem
 * @param {Object} context.stores.remoteStore - Remote store with isSmartTV flag
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Slave video player or null to continue chain
 */
export const SlavePlaybackMiddleware = ({ stores, children }) => {
    const { nowPlayingItem } = stores.mediaStore;
    const { isSmartTV } = stores.remoteStore;

    if (isSmartTV && nowPlayingItem) {
        return (
            <>
                <SlaveVideoPlayer />
                <NotificationSnackbar />
                <EpisodeInfoModal />
                <DebugOverlay />
            </>
        );
    }

    return children;
};
