import React from 'react';
import {Box, Button, Fade, Grow, Paper, Typography} from '@mui/material';
import {useTranslations} from '../../hooks/useTranslations.ts';
import {mediaStore} from '../../store/mediaStore.ts';
import QRCodeCard from '../QRCodeCard.tsx';

interface SmartTVPairingViewProps {
    showContent: boolean;
}

const SmartTVPairingView: React.FC<SmartTVPairingViewProps> = ({showContent}) => {
    const {t} = useTranslations();
    const {slaveId, slaveShortCode} = mediaStore;

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const baseUrl = isLocalhost ? window.location.origin : "https://q.tnl.one";
    const remoteUrl = `${baseUrl}/?remote_for=${slaveId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(remoteUrl)}`;

    return (
        <Box sx={{textAlign: 'center', maxWidth: 400, mx: 'auto'}}>
            {/* Title with icon */}
            <Grow in={showContent}>
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        fontWeight="bold"
                        sx={{
                            mb: 1,
                            background: 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        {t('smartTV.connectTitle')}
                    </Typography>
                </Box>
            </Grow>

            {/* QR Code Card with glow effect */}
            <Grow in={showContent} timeout={400}>
                <Box sx={{ mb: 3 }}>
                    <QRCodeCard qrCodeUrl={qrCodeUrl} />
                </Box>
            </Grow>

            {/* Code Display with digital effect - right below QR */}
            <Grow in={showContent} timeout={500}>
                <Box sx={{ mt: 3, mb: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, mb: 1, display: 'block' }}>
                        Oppure inserisci manualmente:
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            display: 'inline-block',
                            px: 4,
                            py: 2,
                            borderRadius: 2,
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '50%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                animation: 'shimmer 2s infinite',
                                '@keyframes shimmer': {
                                    '0%': { left: '-100%' },
                                    '100%': { left: '200%' },
                                },
                            },
                        }}
                    >
                        <Typography
                            variant="h4"
                            component="p"
                            sx={{
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                letterSpacing: '0.3rem',
                                fontWeight: 600,
                                color: 'primary.main',
                                textShadow: '0 0 10px rgba(0,163,255,0.5)',
                            }}
                        >
                            {slaveShortCode || '...'}
                        </Typography>
                    </Paper>
                </Box>
            </Grow>

            {/* Instructions styled as bullet list */}
            <Grow in={showContent} timeout={600}>
                <Box sx={{ mt: 2, px: 3 }}>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        component="div"
                        sx={{ lineHeight: 2 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box
                                component="span"
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    mr: 1.5,
                                    flexShrink: 0,
                                }}
                            >
                                1
                            </Box>
                            <Box component="span">
                                Apri la fotocamera sul tuo telefono
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Box
                                component="span"
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    mr: 1.5,
                                    flexShrink: 0,
                                }}
                            >
                                2
                            </Box>
                            <Box component="span">
                                Inquadra il codice QR per connetterti
                            </Box>
                        </Box>
                    </Typography>
                </Box>
            </Grow>

            {/* Secondary action button */}
            <Fade in={showContent} timeout={1000}>
                <Box sx={{ mt: 5 }}>
                    <Button
                        variant="text"
                        onClick={() => mediaStore.exitSmartTVPairingMode()}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' },
                        }}
                    >
                        {t('smartTV.browseOnTV')}
                    </Button>
                </Box>
            </Fade>
        </Box>
    );
};

export default SmartTVPairingView;
