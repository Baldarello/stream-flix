/**
 * @fileoverview Error View - System Error Display
 *
 * Displays error messages when the application encounters an error state.
 * Uses MobX observer to reactively update when error state changes.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Box } from '@mui/material';
import { useStores } from '../../context/StoreContext.jsx';

/**
 * ErrorView Component
 *
 * Full-screen centered error alert displayed when an error occurs.
 *
 * @returns {React.ReactElement} Error display view
 */
export const ErrorView = observer(() => {
    const { mediaStore } = useStores();

    return (
        <Box
            id="error-screen"
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}
        >
            <Alert severity="error">{mediaStore.error}</Alert>
        </Box>
    );
});

ErrorView.displayName = 'ErrorView';
