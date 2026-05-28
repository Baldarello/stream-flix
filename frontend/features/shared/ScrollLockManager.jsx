/**
 * @fileoverview Shared Feature - Scroll Lock Manager
 * 
 * This component manages body scroll locking based on UI state.
 * Scroll is locked when:
 * - A media item is selected (detail view open)
 * - Video is playing
 * - SmartTV pairing is visible
 * - Remote master has a slave playing
 */

import React, { useEffect } from 'react';
import { mediaStore } from '../../store/mediaStore.js';
import { remoteStore } from '../../store/remoteStore.js';

/**
 * Scroll Lock Manager Component
 * 
 * Monitors application state and locks/unlocks body scroll accordingly.
 * Uses useEffect to update document.body.style.overflow.
 * 
 * @returns {null} This component doesn't render anything
 */
export const ScrollLockManager = () => {
    useEffect(() => {
        // Determine if scroll should be locked based on current UI state
        const shouldLockScroll = 
            !!mediaStore.currentSelectedItem || 
            !!mediaStore.nowPlayingItem || 
            mediaStore.isSmartTVPairingVisible || 
            (mediaStore.isRemoteMaster && !!remoteStore.remoteSlaveState?.nowPlayingItem);
        
        if (shouldLockScroll) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [
        mediaStore.currentSelectedItem, 
        mediaStore.nowPlayingItem, 
        mediaStore.isSmartTVPairingVisible, 
        mediaStore.isRemoteMaster, 
        remoteStore.remoteSlaveState?.nowPlayingItem
    ]);

    return null;
};
