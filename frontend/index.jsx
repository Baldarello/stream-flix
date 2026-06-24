import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { useMediaQuery } from '@mui/material';
import { isSmartTV } from './utils/device.js';

// Lazy load apps for code splitting
const App = lazy(() => import('./App.jsx'));
const TvApp = lazy(() => import('./features/tv/TvApp.jsx'));

// Hook that re-evaluates on resize via useMediaQuery
const useTvMode = () => {
    const isSmall = useMediaQuery('@media (max-width: 599px)');
    return isSmall || isSmartTV() || new URLSearchParams(window.location.search).get('tv') === '1';
};

// Manual reduced motion check since MUI 7 doesn't export useReducedMotion
const useReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const LoadingFallback = () => {
    const reduceMotion = useReducedMotion();
    if (reduceMotion) {
        return (
            <div id="app-loading" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#000',
                color: '#fff',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '18px'
            }}>
                Loading...
            </div>
        );
    }
    return (
        <div id="app-loading" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            fontFamily: 'Roboto, sans-serif',
            fontSize: '18px'
        }}>
            Caricamento...
        </div>
    );
};

// Root component that resolves tv mode via hook and renders appropriate app
const Root = () => {
    const tvMode = useTvMode();
    return tvMode ? <TvApp /> : <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <Suspense fallback={<LoadingFallback />}>
            <Root />
        </Suspense>
    </React.StrictMode>
);
