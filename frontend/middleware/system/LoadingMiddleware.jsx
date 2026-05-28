/**
 * @fileoverview System Middleware - Loading State Handler
 * 
 * This middleware handles the loading state of the application,
 * displaying a loading spinner when data is being fetched.
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Loading Middleware
 * 
 * Checks if the application is in a loading state and displays
 * a centered loading spinner. This middleware takes priority
 * over all other rendering as it blocks the UI until ready.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with loading states
 * @param {React.ReactNode} context.children - Child content (not used in this middleware)
 * @returns {React.ReactElement|null} Loading spinner or null to continue chain
 */
export const LoadingMiddleware = ({ stores, children }) => {
    const { loading, isReloadingData, isGoogleAuthLoading } = stores.mediaStore;

    if (loading || isReloadingData || isGoogleAuthLoading) {
        return (
            <Box 
                id="loading-screen"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh'
                }}
            >
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return children;
};
