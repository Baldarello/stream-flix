/**
 * @fileoverview StreamFlix App - Main Application Component
 * 
 * Refactored to use the ViewSwitch system for reactive view rendering.
 * All rendering decisions are handled by ViewSwitch which uses MobX's
 * observer pattern for reactive updates.
 */

import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, colors, createTheme, ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { mediaStore } from './store/mediaStore.js';
import { remoteStore } from './store/remoteStore.js';
import { websocketService } from './services/websocketService.js';
import { StoreProvider } from './context/StoreContext.jsx';
import { AppInitializer } from './features/shared/AppInitializer.jsx';
import { ScrollLockManager } from './features/shared/ScrollLockManager.jsx';
import { BrowserHistoryHandler } from './features/shared/BrowserHistoryHandler.jsx';
import { ViewSwitch } from './views/ViewSwitch.jsx';
import { OverlayLayer } from './components/overlay/OverlayLayer.jsx';
import DebugOverlay from './components/utilities/DebugOverlay.jsx';

// Theme Configuration
const baseThemeOptions = {
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: { fontFamily: "'Poppins', sans-serif", fontWeight: 800 },
        h2: { fontFamily: "'Poppins', sans-serif", fontWeight: 700 },
        h3: { fontFamily: "'Poppins', sans-serif", fontWeight: 700 },
        h4: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
        h5: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
        h6: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 'bold',
                    borderRadius: '20px',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'scale(1.05)',
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                    backgroundImage: 'none',
                }
            }
        }
    }
};

const themePalettes = {
    SerieTV: {
        primary: { main: '#00A3FF' },
        secondary: { main: '#E50914' },
        background: { default: 'transparent', paper: 'rgba(16, 24, 45, 0.75)' },
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    },
    Film: {
        primary: { main: colors.amber[500] },
        secondary: { main: '#ffab00' },
        background: { default: 'transparent', paper: 'rgba(45, 32, 16, 0.75)' },
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    },
    Anime: {
        primary: { main: colors.deepPurple[400] },
        secondary: { main: '#ab47bc' },
        background: { default: 'transparent', paper: 'rgba(40, 20, 48, 0.75)' },
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    }
};

/**
 * Main App Component
 * 
 * Sets up the theme, providers, and handlers.
 * The actual view rendering is delegated to ViewSwitch which
 * reactively renders the appropriate view based on MobX store state.
 */
const App = observer(() => {
    const { activeTheme } = mediaStore;

    // Theme body class effect
    useEffect(() => {
        const themeClassMap = {
            'SerieTV': 'theme-serietv',
            'Film': 'theme-film',
            'Anime': 'theme-anime',
        };
        document.body.className = themeClassMap[activeTheme] || 'theme-serietv';
    }, [activeTheme]);

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

    // Create dynamic theme based on active theme
    const dynamicTheme = createTheme({
        palette: {
            mode: 'dark',
            ...themePalettes[activeTheme],
        },
        ...baseThemeOptions,
    });

    return (
        <ThemeProvider theme={dynamicTheme}>
            <CssBaseline />
            <StoreProvider>
                <AppInitializer />
                <ScrollLockManager />
                <BrowserHistoryHandler />
                <Box id="app-main" sx={{ color: 'text.primary' }}>
                    <ViewSwitch />
                </Box>
                <OverlayLayer />
            </StoreProvider>
            <DebugOverlay />
        </ThemeProvider>
    );
});

export default App;
