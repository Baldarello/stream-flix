import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useTranslations } from '../../../hooks/useTranslations.js';
import ConnectionIndicator from '../../utilities/ConnectionIndicator.jsx';
import { remoteStore } from '../../../store/remoteStore.js';

const SlaveConnectedView = () => {
    const { t } = useTranslations();

    return (
        <Box sx={{ textAlign: 'center' }}>
            {/* Success Icon - lightweight, no animations */}
            <Box
                sx={{
                    display: 'inline-block',
                    mb: 4,
                }}
            >
                <CheckCircleOutlineIcon
                    sx={{
                        fontSize: 100,
                        color: 'success.main',
                    }}
                />
            </Box>

            {/* Connection Indicator Badge */}
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    borderRadius: '20px',
                    background: 'rgba(76,175,80,0.15)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    mb: 3,
                }}
            >
                <ConnectionIndicator />
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                    Connected
                </Typography>
            </Box>

            <Typography
                variant="h3"
                component="h1"
                fontWeight="bold"
                sx={{
                    mb: 1,
                    color: 'text.primary',
                }}
            >
                {t('smartTV.connected')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 5, opacity: 0.8 }}>
                {t('smartTV.connectedSubtitle')}
            </Typography>
            <Button
                variant="outlined"
                size="large"
                onClick={() => remoteStore.exitSmartTVPairingMode()}
                startIcon={<QrCodeScannerIcon />}
                sx={{
                    px: 4,
                    py: 1.5,
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(0,163,255,0.1)',
                    },
                }}
            >
                {t('smartTV.browseOnTV')}
            </Button>
        </Box>
    );
};

export default SlaveConnectedView;
