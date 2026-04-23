import React from 'react';
import {Box, Fade, Typography} from '@mui/material';
import {useTranslations} from '../../hooks/useTranslations.ts';

interface SmartTVLoadingViewProps {
    showContent: boolean;
}

const SmartTVLoadingView: React.FC<SmartTVLoadingViewProps> = ({showContent}) => {
    const {t} = useTranslations();

    return (
        <Fade in={showContent}>
            <Box sx={{textAlign: 'center'}}>
                <Box
                    sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'primary.main',
                        animation: 'spin 1s linear infinite',
                        mx: 'auto',
                        mb: 3,
                        '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                        },
                    }}
                />
                <Typography
                    variant="h6"
                    sx={{
                        opacity: 0.7,
                        fontWeight: 500,
                    }}
                >
                    {t('smartTV.initializing')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Preparing your remote experience...
                </Typography>
            </Box>
        </Fade>
    );
};

export default SmartTVLoadingView;
