/**
 * @fileoverview StreamFlix App - Main Application Component
 *
 * Refactored to use the ViewSwitch system for reactive view rendering with
 * react-router for URL-based navigation.
 *
 * The cinematic-futuristic rework collapses the three legacy palettes
 * (SerieTV / Film / Anime) into a single dark futuristic theme that reads
 * the design tokens defined in `frontend/styles/cinematic.css`. The
 * body-class effect is preserved for backward compatibility but every
 * class maps to the unified palette.
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router';
import { observer } from 'mobx-react-lite';
import { Box, createTheme, ThemeProvider, useMediaQuery } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { isSmartTV } from './utils/device.js';
import { mediaStore } from './store/mediaStore.js';
import { remoteStore } from './store/remoteStore.js';
import { fxStore } from './store/fxStore.js';
import { websocketService } from './services/websocketService.js';
import { setNavigate } from './services/navigationService.js';
import { StoreProvider } from './context/StoreContext.jsx';
import { AppInitializer } from './features/shared/AppInitializer.jsx';
import { ScrollLockManager } from './features/shared/ScrollLockManager.jsx';
import { ViewSwitch } from './views/ViewSwitch.jsx';
import { OverlayLayer } from './components/overlay/OverlayLayer.jsx';
import { AmbientCanvas } from './fx/AmbientCanvas.jsx';
import { SceneCanvas } from './fx/SceneCanvas.jsx';
import { TransitionPortal } from './fx/TransitionPortal.jsx';
import DebugOverlay from './components/utilities/DebugOverlay.jsx';

const TvApp = lazy(() => import('./features/tv/TvApp.jsx'));

// Theme Configuration - single unified futuristic theme.
const baseThemeOptions = {
    palette: {
        mode: 'dark',
        primary: { main: '#4cd2ff' },
        secondary: { main: '#7af0ff' },
        error: { main: '#ff5e9b' },
        warning: { main: '#ff5e9b' },
        background: {
            default: '#05060d',
            paper: 'rgba(10, 14, 28, 0.55)'
        },
        text: {
            primary: '#eaf2ff',
            secondary: '#8a99b8',
            disabled: '#4b5772'
        },
        divider: 'rgba(76, 210, 255, 0.18)'
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
        h3: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 700 },
        h4: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 600 },
        h5: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 600 },
        h6: { fontFamily: "'Space Grotesk', 'Poppins', sans-serif", fontWeight: 600 }
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 20,
                    transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1), box-shadow 180ms cubic-bezier(0.22,1,0.36,1)',
                    '&:hover': {
                        transform: 'scale(1.04)',
                        boxShadow: '0 0 18px rgba(76, 210, 255, 0.45)'
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(10, 14, 28, 0.55)',
                    border: '1px solid rgba(76, 210, 255, 0.18)',
                    backdropFilter: 'blur(12px)'
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(10, 14, 28, 0.55)',
                    backdropFilter: 'blur(16px) saturate(140%)',
                    borderBottom: '1px solid rgba(76, 210, 255, 0.12)',
                    boxShadow: 'none'
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(10, 14, 28, 0.7)',
                    border: '1px solid rgba(76, 210, 255, 0.12)'
                }
            }
        }
    }
};

const cinematicTheme = createTheme(baseThemeOptions);

/**
 * useTvMode hook - re-evaluates on resize via useMediaQuery.
 * Must be called inside ThemeProvider (useMediaQuery needs theme context).
 */
const useTvMode = () => {
    const isSmall = useMediaQuery('@media (max-width: 599px)');
    return isSmall || isSmartTV() || new URLSearchParams(window.location.search).get('tv') === '1';
};

/**
 * Inner App component that uses hooks requiring React context
 */
const AppInner = observer(() => {
    const navigate = useNavigate();
    const tvMode = useTvMode();

    // Initialize navigation service with react-router's navigate
    useEffect(() => {
        setNavigate(navigate);
    }, [navigate]);

    // Websocket visibility handling
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                websocketService.connect();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // First-paint flag flip: cleared once the app mounts. The transition
    // portal reads this to skip the cinematic intro on cold start.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            fxStore.markFirstPaintDone();
        }, 200);
        return () => window.clearTimeout(timer);
    }, []);

    // Test hook: expose stores on window when the URL contains the
    // `?testMode=stores` query parameter. This allows Playwright/E2E tests
    // to drive the app state without going through the full user flow
    // (which is fragile when UI refactors change selectors).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('testMode') === 'stores') {
            window.__quixTest = {
                mediaStore,
                remoteStore,
                fxStore,
            };
        }
    }, []);

    if (tvMode) {
        return (
            <ThemeProvider theme={cinematicTheme}>
                <CssBaseline />
                <Suspense fallback={null}>
                    <TvApp />
                </Suspense>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={cinematicTheme}>
            <CssBaseline />
            <StoreProvider>
                <AppInitializer />
                <ScrollLockManager />
                <AmbientCanvas />
                <Box id="app-main" sx={{ color: 'text.primary' }}>
                    <ViewSwitch />
                </Box>
                <OverlayLayer />
                <SceneCanvas />
                <TransitionPortal />
            </StoreProvider>
            <DebugOverlay />
        </ThemeProvider>
    );
});

/**
 * Root component that wraps AppInner with BrowserRouter for react-router integration
 */
const Root = () => {
    return (
        <BrowserRouter>
            <AppInner />
        </BrowserRouter>
    );
};

export default Root;
