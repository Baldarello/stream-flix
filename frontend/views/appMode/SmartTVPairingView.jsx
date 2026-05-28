/**
 * @fileoverview SmartTV Pairing View - SmartTV Pairing Screen
 * 
 * Displays the SmartTVScreen component when SmartTV pairing is active
 * and no content is playing.
 */

import React from 'react';
import SmartTVScreen from '../../components/smarttv/SmartTVScreen.jsx';

/**
 * SmartTVPairingView Component
 * 
 * Wrapper for the SmartTVScreen component used when:
 * - mediaStore.isSmartTVPairingVisible is true
 * - mediaStore.nowPlayingItem is not set
 * 
 * @returns {React.ReactElement} SmartTV pairing view
 */
export const SmartTVPairingView = () => {
    return <SmartTVScreen />;
};

SmartTVPairingView.displayName = 'SmartTVPairingView';
