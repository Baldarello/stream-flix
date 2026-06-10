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
 *
 * Cinematic rework: every branch wraps its result in a `data-view-key`
 * attribute and the orchestrator reports the active key to `fxStore` so the
 * `TransitionPortal` can pick a timeline for the previous -> next switch.
 */

import React, { Suspense, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../context/StoreContext.jsx';
import { fxStore } from '../store/fxStore.js';
import { Skeleton } from '../components/feedback/Skeleton.jsx';

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
import { PreferencesView } from './features/PreferencesView.jsx';
import { FeatureRouter } from './features/FeatureRouter.jsx';

const wrap = (key, node) => (
    <div id={`screen-${key.toLowerCase()}`} data-view-key={key} data-testid="view-branch" style={{ minHeight: '100%' }}>
        {node}
    </div>
);

/**
 * Resolves a view key from the current mediaStore + remoteStore state.
 * Kept pure so the transition portal can use the same string the next
 * render will mount.
 */
const resolveViewKey = ({ mediaStore, remoteStore }) => {
    if (mediaStore.loading || mediaStore.isReloadingData || mediaStore.isGoogleAuthLoading) return 'loading';
    if (mediaStore.error) return 'error';
    if (remoteStore.isQRScannerOpen) return 'qr';
    if (remoteStore.isSmartTVPairingVisible && !mediaStore.nowPlayingItem) return 'pairing';
    if (remoteStore.isRemoteMaster && remoteStore.remoteSlaveState?.nowPlayingItem) return 'master';
    if (remoteStore.isSmartTV && mediaStore.nowPlayingItem) return 'slave';
    if (mediaStore.nowPlayingItem) return 'player';
    if (mediaStore.isSearchActive) return 'search';
    if (mediaStore.currentActiveView === 'Preferences') return 'preferences';
    return 'home';
};

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
    const currentKey = resolveViewKey({ mediaStore, remoteStore });

    // Push the active view key into the fxStore so the transition portal
    // can pick a matching timeline. The portal itself decides whether to
    // actually run the timeline (it skips on first paint).
    useEffect(() => {
        if (fxStore.targetViewKey !== currentKey) {
            const prev = fxStore.targetViewKey || 'home';
            if (prev !== currentKey) {
                fxStore.beginTransition(prev, currentKey);
            }
        }
    }, [currentKey]);

    // System: Loading State
    if (mediaStore.loading || mediaStore.isReloadingData || mediaStore.isGoogleAuthLoading) {
        return wrap('loading', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><LoadingView /></Suspense>);
    }

    // System: Error State
    if (mediaStore.error) {
        return wrap('error', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><ErrorView /></Suspense>);
    }

    // Playback: QR Scanner
    if (remoteStore.isQRScannerOpen) {
        return wrap('qr', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><QRScannerView /></Suspense>);
    }

    // App Mode: SmartTV Pairing
    if (remoteStore.isSmartTVPairingVisible && !mediaStore.nowPlayingItem) {
        return wrap('pairing', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><SmartTVPairingView /></Suspense>);
    }

    // Playback: Remote Master
    if (remoteStore.isRemoteMaster && remoteStore.remoteSlaveState?.nowPlayingItem) {
        return wrap('master', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><MasterPlaybackView /></Suspense>);
    }

    // Playback: SmartTV Slave
    if (remoteStore.isSmartTV && mediaStore.nowPlayingItem) {
        return wrap('slave', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><SlavePlaybackView /></Suspense>);
    }

    // Playback: Local Player
    if (mediaStore.nowPlayingItem) {
        return wrap('player', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><LocalPlaybackView /></Suspense>);
    }

    // Feature: Search
    if (mediaStore.isSearchActive) {
        return wrap('search', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><SearchView /></Suspense>);
    }

    // Feature: Preferences
    if (mediaStore.currentActiveView === 'Preferences') {
        return wrap('preferences', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><PreferencesView /></Suspense>);
    }

    // Feature: Home/Grid/Library
    return wrap('home', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><FeatureRouter /></Suspense>);
});

ViewSwitch.displayName = 'ViewSwitch';
