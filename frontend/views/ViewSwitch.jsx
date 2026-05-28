/**
 * @fileoverview ViewSwitch - Main View Orchestrator
 * 
 * This component acts as the middleware orchestrator using the Observable Components Pattern.
 * It uses MobX's observer pattern to reactively render the appropriate view based on
 * application state. Each conditional branch is tracked by MobX for reactive updates.
 * 
 * Rendering Priority Order:
 * 1. Loading state (loading, isReloadingData, isGoogleAuthLoading)
 * 2. Error state
 * 3. QR Scanner mode
 * 4. SmartTV Pairing mode
 * 5. Remote Master playback controls
 * 6. SmartTV Slave playback
 * 7. Local playback
 * 8. Search view
 * 9. Feature Router (Home/Grid/Library)
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../context/StoreContext.jsx';

// System Views
import { LoadingView } from './system/LoadingView.jsx';
import { ErrorView } from './system/ErrorView.jsx';

// Playback Views
import { QRScannerView } from './playback/QRScannerView.jsx';
import { SlavePlaybackView } from './playback/SlavePlaybackView.jsx';
import { MasterPlaybackView } from './playback/MasterPlaybackView.jsx';
import { LocalPlaybackView } from './playback/LocalPlaybackView.jsx';

// App Mode Views
import { SmartTVPairingView } from './appMode/SmartTVPairingView.jsx';

// Feature Views
import { SearchView } from './features/SearchView.jsx';
import { FeatureRouter } from './features/FeatureRouter.jsx';

/**
 * ViewSwitch Component
 * 
 * Main orchestrator that reactively renders views based on application state.
 * All dependencies are tracked by MobX's observer for automatic re-rendering.
 * 
 * @returns {React.ReactElement} The appropriate view component based on state
 */
export const ViewSwitch = observer(() => {
    const { mediaStore, remoteStore } = useStores();
    
    // System: Loading State
    // Show loading spinner during initial load, data reload, or Google Auth
    if (mediaStore.loading || mediaStore.isReloadingData || mediaStore.isGoogleAuthLoading) {
        return <LoadingView />;
    }
    
    // System: Error State
    // Show error message if any error exists
    if (mediaStore.error) {
        return <ErrorView />;
    }
    
    // Playback: QR Scanner
    // Show QR scanner when remote is looking for a master
    if (remoteStore.isQRScannerOpen) {
        return <QRScannerView />;
    }
    
    // App Mode: SmartTV Pairing
    // Show SmartTV pairing screen when visible and no content is playing
    // When nowPlayingItem is set (e.g., slave receiving playback), show player instead
    if (remoteStore.isSmartTVPairingVisible && !mediaStore.nowPlayingItem) {
        return <SmartTVPairingView />;
    }
    
    // Playback: Remote Master
    // When this device is a master and slave is playing content
    if (remoteStore.isRemoteMaster && remoteStore.remoteSlaveState?.nowPlayingItem) {
        return <MasterPlaybackView />;
    }
    
    // Playback: SmartTV Slave
    // When this device is a SmartTV slave receiving playback from master
    if (remoteStore.isSmartTV && mediaStore.nowPlayingItem) {
        return <SlavePlaybackView />;
    }
    
    // Playback: Local Player
    // When local content is playing
    if (mediaStore.nowPlayingItem) {
        return <LocalPlaybackView />;
    }
    
    // Feature: Search
    // Show search interface when search is active
    if (mediaStore.isSearchActive) {
        return <SearchView />;
    }
    
    // Feature: Home/Grid/Library
    // Default routing to feature views based on currentActiveView
    return <FeatureRouter />;
});

ViewSwitch.displayName = 'ViewSwitch';
