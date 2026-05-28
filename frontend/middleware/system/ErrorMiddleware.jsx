/**
 * @fileoverview System Middleware - Error State Handler
 * 
 * This middleware handles error states in the application,
 * displaying an error alert when something goes wrong.
 */

import React from 'react';
import { Alert, Box } from '@mui/material';

/**
 * Error Middleware
 * 
 * Checks if the application has an error state and displays
 * an error alert. This middleware runs after LoadingMiddleware
 * and before any content rendering.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with error state
 * @param {React.ReactNode} context.children - Child content (not used in this middleware)
 * @returns {React.ReactElement|null} Error alert or null to continue chain
 */
export const ErrorMiddleware = ({ stores, children }) => {
    const { error } = stores.mediaStore;

    if (error) {
        return (
            <Box 
                id="error-screen"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh'
                }}
            >
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return children;
};
