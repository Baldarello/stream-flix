import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, CircularProgress, Paper, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const SmartTVScreen: React.FC = () => {
    const { slaveId, isRemoteMasterConnected } = mediaStore;

    const renderContent = () => {
        if (isRemoteMasterConnected) {
             return (
                <Box sx={{ textAlign: 'center', color: 'success.main' }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 80, mb: 2 }} />
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Telecomando Connesso!
                    </Typography>
                    <Typography color="text.secondary">
                        Usa il tuo dispositivo per scegliere cosa guardare.
                    </Typography>
                </Box>
            );
        }

        if (slaveId) {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const baseUrl = isLocalhost ? window.location.origin : "https://q.tnl.one";
            const remoteUrl = `${baseUrl}/?remote_for=${slaveId}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(remoteUrl)}`;
            return (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
                        Controlla la TV con il tuo Telefono
                    </Typography>
                    <Paper elevation={8} sx={{ p: 3, display: 'inline-block', background: 'white' }}>
                        <img src={qrCodeUrl} alt="QR Code per il controllo remoto" width="250" height="250" />
                    </Paper>
                    <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary' }}>
                        1. Apri la fotocamera sul tuo telefono.
                        <br />
                        2. Inquadra il codice QR per connetterti.
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Inizializzazione del dispositivo...</Typography>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                bgcolor: 'background.default',
                color: 'text.primary',
                p: 3
            }}
        >
            {renderContent()}
            {!isRemoteMasterConnected && (
                <Button
                    variant="outlined"
                    onClick={() => mediaStore.exitSmartTVPairingMode()}
                    sx={{
                        position: 'absolute',
                        bottom: 40,
                        borderColor: 'rgba(255,255,255,0.7)',
                        color: 'white',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                >
                    Sfoglia il catalogo direttamente sulla TV
                </Button>
            )}
        </Box>
    );
};

export default observer(SmartTVScreen);