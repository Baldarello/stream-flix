/**
 * @fileoverview ViewSwitch - Main View Orchestrator with react-router
 *
 * This component acts as the main router using react-router for URL-based
 * navigation, with MobX state for application behavior.
 *
 * Rendering Priority Order (overlay states that take precedence over routes):
 * 1. Loading state (loading, isReloadingData, isGoogleAuthLoading)
 * 2. Error state
 * 3. QR Scanner mode
 * 4. SmartTV Pairing mode
 * 5. Remote Master playback controls
 * 6. SmartTV Slave playback
 * 7. Local playback
 *
 * Route-based views (when no overlay state is active):
 * - `/` → Home (FeatureRouter)
 * - `/search` → Search view
 * - `/preferences` → Preferences view
 * - `/player` → Local playback
 * - `/master` → Master remote
 * - `/slave` → Slave playback
 * - `/pairing` → SmartTV pairing
 * - `/qr` → QR scanner
 *
 * Cinematic rework: every branch wraps its result in a `data-view-key`
 * attribute and the orchestrator reports the active key to `fxStore` so the
 * `TransitionPortal` can pick a timeline for the previous -> next switch.
 */

import React, { Suspense, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Routes, Route, useLocation } from 'react-router';
import { useStores } from '../context/StoreContext.jsx';
import { fxStore } from '../store/fxStore.js';
import { useAppNavigate, getRouteFromState } from '../hooks/useAppNavigate.js';
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
    <section id={`screen-${key.toLowerCase()}`} aria-label={key} data-view-key={key} data-testid="view-branch" style={{ minHeight: '100%' }}>
        {node}
    </section>
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
 * Route-based view components that receive route params
 */
const HomeRoute = () => wrap('home', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <FeatureRouter />
    </Suspense>
));

const SearchRoute = () => wrap('search', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <SearchView />
    </Suspense>
));

const PreferencesRoute = () => wrap('preferences', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <PreferencesView />
    </Suspense>
));

const PlayerRoute = () => wrap('player', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <LocalPlaybackView />
    </Suspense>
));

const MasterRoute = () => wrap('master', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <MasterPlaybackView />
    </Suspense>
));

const SlaveRoute = () => wrap('slave', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <SlavePlaybackView />
    </Suspense>
));

const PairingRoute = () => wrap('pairing', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <SmartTVPairingView />
    </Suspense>
));

const QRScannerRoute = () => wrap('qr', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <QRScannerView />
    </Suspense>
));

/**
 * Fallback when no route matches - renders home
 */
const NotFoundRoute = () => wrap('home', (
    <Suspense fallback={<Skeleton id="view-loading-suspense" />}>
        <FeatureRouter />
    </Suspense>
));

/**
 * ViewSwitch Component
 *
 * Main orchestrator that combines URL-based routing with MobX-driven
 * overlay states. Routes are rendered for content, while overlay states
 * (loading, error, special modes) take precedence and are rendered on top.
 *
 * @returns {React.ReactElement} The appropriate view component based on state and URL
 */
export const ViewSwitch = observer(() => {
    const { mediaStore, remoteStore } = useStores();
    const location = useLocation();
    const { syncToUrl } = useAppNavigate();
    const currentKey = resolveViewKey({ mediaStore, remoteStore });

    // Determine which route to highlight for transitions
    // When an overlay state is active, use that as the view key
    const transitionKey = currentKey;

    // Push the active view key into the fxStore so the transition portal
    // can pick a matching timeline. The portal itself decides whether to
    // actually run the timeline (it skips on first paint).
    useEffect(() => {
        if (fxStore.targetViewKey !== transitionKey) {
            const prev = fxStore.targetViewKey || 'home';
            if (prev !== transitionKey) {
                fxStore.beginTransition(prev, transitionKey);
            }
        }
    }, [transitionKey]);

    // Sync MobX state changes to URL (for direct state changes not through router)
    useEffect(() => {
        const { path } = getRouteFromState();
        syncToUrl(path);
    }, [
        mediaStore.loading,
        mediaStore.isReloadingData,
        mediaStore.isGoogleAuthLoading,
        mediaStore.error,
        remoteStore.isQRScannerOpen,
        remoteStore.isSmartTVPairingVisible,
        remoteStore.isRemoteMaster,
        remoteStore.isSmartTV,
        mediaStore.nowPlayingItem,
        mediaStore.isSearchActive,
        mediaStore.currentActiveView,
    ]);

    // Overlay states that take precedence over routes
    // System: Loading State
    if (mediaStore.loading || mediaStore.isReloadingData || mediaStore.isGoogleAuthLoading) {
        return wrap('loading', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><LoadingView /></Suspense>);
    }

    // System: Error State
    if (mediaStore.error) {
        return wrap('error', <Suspense fallback={<Skeleton id="view-loading-suspense" />}><ErrorView /></Suspense>);
    }

    // Special modes that take precedence over normal routes
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

    // Route-based content rendering
    return (
        <Routes location={location}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/search" element={<SearchRoute />} />
            <Route path="/preferences" element={<PreferencesRoute />} />
            <Route path="/player" element={<PlayerRoute />} />
            <Route path="/master" element={<MasterRoute />} />
            <Route path="/slave" element={<SlaveRoute />} />
            <Route path="/pairing" element={<PairingRoute />} />
            <Route path="/qr" element={<QRScannerRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
        </Routes>
    );
});

ViewSwitch.displayName = 'ViewSwitch';
