import React from 'react';
import { Box } from '@mui/material';

const SmartTVBackground = () => {
    return (
        <>
            {/* Solid dark background for SmartTV - lightweight, no animations */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                    zIndex: 0,
                    bgcolor: 'background.default',
                }}
            />
        </>
    );
};

export default SmartTVBackground;
