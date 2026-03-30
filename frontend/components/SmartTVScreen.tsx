import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../store/mediaStore.ts';
import {Box, Button, CircularProgress, Paper, Typography} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {useTranslations} from '../hooks/useTranslations.ts';
import {websocketService} from '../services/websocketService.js';

const SmartTVScreen: React.FC = observer(() => {
    const {slaveId, isRemoteMasterConnected, slaveShortCode, isSmartTV} = mediaStore;
    const {t} = useTranslations();

    // Track if we've already sent the disconnecting message to avoid duplicates
    const hasSentDisconnecting = useRef(false);

    // Track if we're in a reconnection state (between beforeunload and reconnect)
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Send disconnecting message before page unload to preserve session for reconnection
    useEffect(() => {
        if (!isSmartTV || !slaveId) return;

        const handleBeforeUnload = () => {
            // Only send once to avoid duplicate messages
            if (hasSentDisconnecting.current) return;
            hasSentDisconnecting.current = true;

            // Set reconnecting state to show loading UI
            setIsReconnecting(true);

            // Close the WebSocket to ensure the server properly handles the disconnect
            // This is critical for the session to be preserved for reconnection
            if (websocketService.ws) {
                websocketService.sendMessage({type: 'quix-slave-disconnecting'});
                // Close with a delay to ensure the message is sent
                setTimeout(() => {
                    if (websocketService.ws && websocketService.ws.readyState === WebSocket.OPEN) {
                        websocketService.ws.close(1000, 'Intentional disconnect for reload');
                    }
                }, 100);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isSmartTV, slaveId]);

    // Clear reconnecting state when connection is restored
    useEffect(() => {
        if (isRemoteMasterConnected && isReconnecting) {
            setIsReconnecting(false);
        }
    }, [isRemoteMasterConnected, isReconnecting]);

    const renderContent = () => {
        // Show reconnecting state when slave is refreshing (between beforeunload and reconnect)
        if (isReconnecting) {
            return (
                <Box sx={{textAlign: 'center'}}>
                    <CircularProgress sx={{mb: 2}}/>
                    <Typography variant="h6">{t('smartTV.reconnecting') || 'Reconnecting...'}</Typography>
                </Box>
            );
        }

        if (isRemoteMasterConnected) {
            return (
                <Box sx={{textAlign: 'center', color: 'success.main'}}>
                    <CheckCircleOutlineIcon sx={{fontSize: 80, mb: 2}}/>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        {t('smartTV.connected')}
                    </Typography>
                    <Typography color="text.secondary">
                        {t('smartTV.connectedSubtitle')}
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => mediaStore.exitSmartTVPairingMode()}
                        sx={{
                            mt: 10,
                            borderColor: 'rgba(255,255,255,0.7)',
                            color: 'white',
                            '&:hover': {borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)'}
                        }}
                    >
                        {t('smartTV.browseOnTV')}
                    </Button>
                </Box>
            );
        }

        if (slaveId) {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const baseUrl = isLocalhost ? window.location.origin : "https://q.tnl.one";
            const remoteUrl = `${baseUrl}/?remote_for=${slaveId}`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(remoteUrl)}`;
            return (
                <Box sx={{textAlign: 'center'}}>
                    <Typography variant="h4" component="h1" fontWeight="bold" sx={{mb: 3}}>
                        {t('smartTV.connectTitle')}
                    </Typography>
                    <Paper elevation={8} sx={{p: 3, display: 'inline-block', background: 'white'}}>
                        <img src={qrCodeUrl} alt={t('smartTV.qrAlt')} width="250" height="250"/>
                    </Paper>
                    <Typography variant="body1" sx={{mt: 3, color: 'text.secondary', whiteSpace: 'pre-line'}}>
                        {t('smartTV.instructions')}
                    </Typography>
                    <Typography variant="body1" sx={{mt: 4, color: 'text.secondary'}}>
                        {t('smartTV.orEnterCode')}
                    </Typography>
                    <Paper elevation={4}
                           sx={{p: '4px 20px', display: 'inline-block', mt: 1, bgcolor: 'rgba(255,255,255,0.1)'}}>
                        <Typography variant="h5" component="p" sx={{fontFamily: 'monospace', letterSpacing: '0.2rem'}}>
                            {slaveShortCode || '...'}
                        </Typography>
                    </Paper>
                </Box>
            );
        }

        return (
            <Box sx={{textAlign: 'center'}}>
                <CircularProgress sx={{mb: 2}}/>
                <Typography variant="h6">{t('smartTV.initializing')}</Typography>
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
                        '&:hover': {borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)'}
                    }}
                >
                    {t('smartTV.browseOnTV')}
                </Button>
            )}
        </Box>
    );
});

export default SmartTVScreen;