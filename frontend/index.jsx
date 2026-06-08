import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { isSmartTV } from './utils/device.js';

// Lazy load apps for code splitting
const App = lazy(() => import('./App.jsx'));
const TvApp = lazy(() => import('./features/tv/TvApp.jsx'));

// Determine which app to load based on device type or URL parameter
const shouldUseTvMode = () => {
    return isSmartTV() || new URLSearchParams(window.location.search).get('tv') === '1';
};

const LoadingFallback = () => (
    <div style={{
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

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const AppToRender = shouldUseTvMode() ? TvApp : App;

root.render(
    <React.StrictMode>
        <Suspense fallback={<LoadingFallback />}>
            <AppToRender />
        </Suspense>
    </React.StrictMode>
);
