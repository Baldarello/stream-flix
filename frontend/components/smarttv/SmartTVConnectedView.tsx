import React from 'react';
import {Box, Button, Fade, Typography} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import {useTranslations} from '../../hooks/useTranslations.ts';
import ConnectionIndicator from '../utilities/ConnectionIndicator.tsx';
import {mediaStore} from '../../store/mediaStore.ts';

interface SmartTVConnectedViewProps {
    showContent: boolean;
}

const SmartTVConnectedView: React.FC<SmartTVConnectedViewProps> = ({showContent}) => {
    const {t} = useTranslations();

    return (
        <Fade in={showContent}>
            <Box sx={{textAlign: 'center'}}>
                {/* Animated Success Icon */}
                <Box
                    sx={{
                        position: 'relative',
                        display: 'inline-block',
                        mb: 4,
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(76,175,80,0.3) 0%, transparent 70%)',
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                                '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.8 },
                                '50%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 0.4 },
                            },
                        }}
                    />
                    <CheckCircleOutlineIcon
                        sx={{
                            fontSize: 100,
                            color: 'success.main',
                            filter: 'drop-shadow(0 0 20px rgba(76,175,80,0.5))',
                            animation: 'bounceIn 0.6s ease-out',
                            '@keyframes bounceIn': {
                                '0%': { transform: 'scale(0)' },
                                '50%': { transform: 'scale(1.1)' },
                                '100%': { transform: 'scale(1)' },
                            },
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
                    <ConnectionIndicator/>
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
                        background: 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {t('smartTV.connected')}
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 5, opacity: 0.8 }}
                >
                    {t('smartTV.connectedSubtitle')}
                </Typography>
                <Button
                    variant="outlined"
                    size="large"
                    onClick={() => mediaStore.exitSmartTVPairingMode()}
                    startIcon={<QrCodeScannerIcon/>}
                    sx={{
                        px: 4,
                        py: 1.5,
                        borderColor: 'rgba(255,255,255,0.4)',
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(255,255,255,0.05)',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'rgba(0,163,255,0.1)',
                            transform: 'scale(1.05)',
                        },
                        transition: 'all 0.3s ease',
                    }}
                >
                    {t('smartTV.browseOnTV')}
                </Button>
            </Box>
        </Fade>
    );
};

export default SmartTVConnectedView;
