import React from 'react';
import {Box, Grow, Typography} from '@mui/material';
import {useTranslations} from '../../hooks/useTranslations.ts';

interface SmartTVReconnectingViewProps {
    showContent: boolean;
}

const SmartTVReconnectingView: React.FC<SmartTVReconnectingViewProps> = ({showContent}) => {
    const {t} = useTranslations();

    return (
        <Grow in={showContent}>
            <Box sx={{textAlign: 'center'}}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'primary.main',
                        animation: 'spin 1s linear infinite',
                        mx: 'auto',
                        mb: 4,
                        '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                        },
                    }}
                />
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 600,
                        background: 'linear-gradient(90deg, #fff, #aaa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {t('smartTV.reconnecting')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, opacity: 0.7 }}>
                    {t('smartTV.reconnecting')}
                </Typography>
            </Box>
        </Grow>
    );
};

export default SmartTVReconnectingView;
