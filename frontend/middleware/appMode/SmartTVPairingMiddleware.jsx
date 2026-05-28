/**
 * @fileoverview App Mode Middleware - SmartTV Pairing Handler
 * 
 * This middleware handles the SmartTV pairing mode,
 * displaying the SmartTV screen when pairing is in progress.
 */

import React from 'react';
import SmartTVScreen from '../../components/smarttv/SmartTVScreen.jsx';
import { NotificationSnackbar } from '../../components/utilities/NotificationSnackbar.jsx';
import DebugOverlay from '../../components/utilities/DebugOverlay.jsx';

/**
 * SmartTV Pairing Middleware
 * 
 * Checks if SmartTV pairing is visible and no content is playing.
 * If so, displays the SmartTVScreen for pairing with a remote.
 * This middleware takes precedence over feature views but not playback.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with nowPlayingItem
 * @param {Object} context.stores.remoteStore - Remote store with isSmartTVPairingVisible
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} SmartTV screen or null to continue chain
 */
export const SmartTVPairingMiddleware = ({ stores, children }) => {
    const { nowPlayingItem } = stores.mediaStore;
    const { isSmartTVPairingVisible } = stores.remoteStore;

    // Smart TV pairing mode always takes precedence, unless we're playing content
    // When nowPlayingItem is set (e.g., slave receiving playback from master), show VideoPlayer instead
    if (isSmartTVPairingVisible && !nowPlayingItem) {
        return (
            <>
                <SmartTVScreen />
                <NotificationSnackbar />
                <DebugOverlay />
            </>
        );
    }

    return children;
};
