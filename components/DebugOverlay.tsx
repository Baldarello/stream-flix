
import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography } from '@mui/material';

const DebugOverlay: React.FC = () => {
    const { isDebugModeActive, debugMessages } = mediaStore;

    if (!isDebugModeActive) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                width: { xs: 'calc(100vw - 20px)', sm: '450px' },
                maxHeight: '40vh',
                bgcolor: 'rgba(0, 0, 0, 0.85)',
                color: '#00ff00', // Classic terminal green
                p: 2,
                borderRadius: 2,
                zIndex: 9999,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            }}
            aria-live="polite"
            aria-atomic="true"
        >
            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', borderBottom: '1px solid #00ff00', pb: 1, mb: 1, color: 'white' }}>
                LOG DI DEBUG WEBSOCKET
            </Typography>
            {debugMessages.length === 0 ? (
                <Typography sx={{ fontFamily: 'monospace', color: 'grey.500' }}>
                    In attesa di eventi...
                </Typography>
            ) : (
                [...debugMessages].reverse().map((msg, index) => (
                    <Typography key={index} sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {msg}
                    </Typography>
                ))
            )}
        </Box>
    );
};

export default observer(DebugOverlay);
