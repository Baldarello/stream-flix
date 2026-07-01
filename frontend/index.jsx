import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Lazy load apps for code splitting
const App = lazy(() => import('./App.jsx'));

const LoadingFallback = () => (
    <div
        id="app-loading"
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            fontFamily: 'Roboto, sans-serif',
            fontSize: '18px',
        }}
    >
        Caricamento...
    </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <Suspense fallback={<LoadingFallback />}>
            <App />
        </Suspense>
    </React.StrictMode>
);
