/**
 * @fileoverview Loading View - System Loading Spinner
 * 
 * Displays a centered loading spinner during application loading states:
 * - Initial data loading
 * - Data reload operations
 * - Google Auth initialization
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * LoadingView Component
 * 
 * Full-screen centered loading spinner displayed during loading states.
 * 
 * @returns {React.ReactElement} Loading spinner view
 */
export const LoadingView = () => {
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
};

LoadingView.displayName = 'LoadingView';
