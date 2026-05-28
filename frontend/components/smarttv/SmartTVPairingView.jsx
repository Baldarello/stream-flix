import React from 'react';
import {Box, Button, Paper, Typography} from '@mui/material';
import {useTranslations} from '../../hooks/useTranslations.js';
import {remoteStore} from '../../store/remoteStore.js';
import QRCodeCard from './QRCodeCard.jsx';

const SmartTVPairingView = () => {
    const {t} = useTranslations();
    const {slaveId, slaveShortCode} = remoteStore;

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const baseUrl = isLocalhost ? window.location.origin : "https://q.tnl.one";
    const remoteUrl = `${baseUrl}/?remote_for=${slaveId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(remoteUrl)}`;

    return (
        <Box sx={{textAlign: 'center', maxWidth: 400, mx: 'auto'}}>
            {/* Title */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    fontWeight="bold"
                    sx={{ mb: 1, color: 'text.primary' }}
                >
                    {t('smartTV.connectTitle')}
                </Typography>
            </Box>

            {/* QR Code Card */}
            <Box sx={{ mb: 3 }}>
                <QRCodeCard qrCodeUrl={qrCodeUrl} />
            </Box>

            {/* Code Display - lightweight version */}
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
                        }}
                    >
                        {slaveShortCode || '...'}
                    </Typography>
                </Paper>
            </Box>

            {/* Instructions styled as bullet list */}
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

            {/* Secondary action button */}
            <Box sx={{ mt: 5 }}>
                <Button
                    variant="text"
                    onClick={() => remoteStore.exitSmartTVPairingMode()}
                    sx={{
                        color: 'text.secondary',
                        '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' },
                    }}
                >
                    {t('smartTV.browseOnTV')}
                </Button>
            </Box>
        </Box>
    );
};

export default SmartTVPairingView;
