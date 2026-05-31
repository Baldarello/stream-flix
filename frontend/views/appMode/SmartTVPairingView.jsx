/**
 * @fileoverview SmartTV Pairing View - SmartTV Pairing Screen
 * 
 * Displays the SlaveScreen component when SmartTV pairing is active
 * and no content is playing.
 */

import React from 'react';
import SlaveScreen from '@/remote/SlaveScreen.jsx';

/**
 * SlavePairingView Component
 * 
 * Wrapper for the SlaveScreen component used when:
 * - remoteStore.isSmartTVPairingVisible is true
 * - mediaStore.nowPlayingItem is not set
 * 
 * @returns {React.ReactElement} SmartTV pairing view
 */
export const SmartTVPairingView = () => {
    return <SlaveScreen />;
};

SmartTVPairingView.displayName = 'SmartTVPairingView';
