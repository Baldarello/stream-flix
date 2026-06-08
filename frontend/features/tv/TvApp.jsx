import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import tvStore from './tvStore.js';
import TvScreenRouter from './screens/TvScreenRouter.jsx';
import './styles/tv.css';

/**
 * Check if TV mode is requested via URL parameter
 * @returns {boolean} True if ?tv=1 is in the URL
 */
export const isTvModeRequested = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('tv') === '1';
};

/**
 * TvApp - Root TV Mode Application
 * Lightweight TV interface with remote control navigation
 * 
 * This app:
 * - Does NOT import any fx/* modules (GSAP, three.js, etc.)
 * - Uses only CSS animations at 60fps
 * - Manages focus via tvStore
 * - Routes between TV screens based on tvStore.screen
 */
const TvApp = observer(() => {
    // Set up global keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    tvStore.focusNext('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    tvStore.focusNext('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    tvStore.focusNext('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    tvStore.focusNext('right');
                    break;
                case 'Enter':
                case 'OK':
                    e.preventDefault();
                    tvStore.handleEnter();
                    break;
                case 'Escape':
                case 'Back':
                    e.preventDefault();
                    tvStore.handleBack();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    tvStore.handleBackspace();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        // Set TV mode flag
        tvStore.isTvMode = true;

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            tvStore.isTvMode = false;
            // Clear focus registry on unmount
            tvStore.clearFocusRegistry();
        };
    }, []);

    return (
        <div id="tv-app-root" className="tv-root">
            <TvScreenRouter />
        </div>
    );
});

export default TvApp;
