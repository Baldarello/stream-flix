import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import tvStore from '../tvStore.js';
import { remoteStore } from '../../../store/remoteStore.js';
import { mediaStore } from '../../../store/mediaStore.js';
import { useTranslations } from '../../../hooks/useTranslations.js';

// Dynamic imports to avoid bundling these in TV mode when not needed
// These will only be loaded when TvPlayerView is actually mounted

/**
 * TvPlayerView - Wrapper for playback views
 * Uses LocalPlaybackView for local playback or SlavePlaybackView for remote-controlled playback
 * Disables mouse/hover interactions and uses only keyboard controls
 */
const TvPlayerView = observer(() => {
    const { t } = useTranslations();
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [PlaybackComponent, setPlaybackComponent] = useState(null);

    // Determine which playback component to use based on remoteStore
    useEffect(() => {
        const loadPlaybackComponent = async () => {
            try {
                if (remoteStore.isSmartTV) {
                    // Lazy load SlavePlaybackView
                    const module = await import('../../../views/playback/SlavePlaybackView.jsx');
                    setPlaybackComponent(() => module.SlavePlaybackView);
                } else {
                    // Lazy load LocalPlaybackView
                    const module = await import('../../../views/playback/LocalPlaybackView.jsx');
                    setPlaybackComponent(() => module.LocalPlaybackView);
                }
            } catch (error) {
                console.error('[TvPlayerView] Failed to load playback component:', error);
            }
        };

        loadPlaybackComponent();
    }, []);

    const handleBack = () => {
        if (showExitConfirm) {
            // User confirmed exit
            tvStore.navigate('home');
            setShowExitConfirm(false);
        } else {
            // Show confirmation dialog
            setShowExitConfirm(true);
        }
    };

    const handleExitConfirm = () => {
        tvStore.navigate('home');
        setShowExitConfirm(false);
    };

    const handleExitCancel = () => {
        setShowExitConfirm(false);
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    handleBack();
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    // These would be handled by the player component
                    break;
                case 'Enter':
                case ' ':
                    // Play/pause would be handled by the player
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showExitConfirm]);

    // If nowPlayingItem is null, fallback to home
    if (!mediaStore.nowPlayingItem) {
        tvStore.navigate('home');
        return null;
    }

    return (
        <div 
            id="tv-player-view" 
            className="tv-screen tv-player-view"
            style={{ 
                position: 'relative',
                pointerEvents: 'none' // Disable mouse/hover interactions
            }}
        >
            {/* Playback Component Container */}
            <div 
                style={{ 
                    pointerEvents: 'auto',
                    width: '100%',
                    height: '100%'
                }}
            >
                {PlaybackComponent ? (
                    <PlaybackComponent />
                ) : (
                    <div className="tv-loading">
                        {t('common.loading', 'Caricamento...')}
                    </div>
                )}
            </div>

            {/* Exit Confirmation Dialog */}
            {showExitConfirm && (
                <div 
                    id="tv-exit-dialog" 
                    className="tv-confirm-dialog tv-focusable"
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        pointerEvents: 'auto'
                    }}
                >
                    <h3 className="dialog-title">
                        {t('tv.exitPlayerTitle', 'Vuoi interrompere la riproduzione?')}
                    </h3>
                    <div className="dialog-buttons">
                        <button 
                            className="dialog-btn cancel"
                            onClick={handleExitCancel}
                            autoFocus
                        >
                            {t('common.cancel', 'Annulla')}
                        </button>
                        <button 
                            className="dialog-btn confirm"
                            onClick={handleExitConfirm}
                        >
                            {t('tv.exit', 'Esci')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default TvPlayerView;
