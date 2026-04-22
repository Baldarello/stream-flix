import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../store/mediaStore.ts';
import {Box, Button, CircularProgress, Fade, Grow, Paper, Typography} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import {useTranslations} from '../hooks/useTranslations.ts';
import ConnectionIndicator from './ConnectionIndicator.tsx';
import {websocketService} from '../services/websocketService.js';

const SmartTVScreen: React.FC = observer(() => {
    const {slaveId, isRemoteMasterConnected, slaveShortCode, isSmartTV} = mediaStore;
    const {t} = useTranslations();

    // Track if we've already sent the disconnecting message to avoid duplicates
    const hasSentDisconnecting = useRef(false);

    // Track if we're in a reconnection state (between beforeunload and reconnect)
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Animation state for staggered entrance
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        // Delay content reveal for smooth entrance animation
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

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
                websocketService.slaveDisconnecting();
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
        }

        if (isRemoteMasterConnected) {
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
        }

        if (slaveId) {
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
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                display: 'inline-block',
                                background: 'rgba(255,255,255,0.95)',
                                borderRadius: 3,
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: -2,
                                    borderRadius: 4,
                                    background: 'linear-gradient(135deg, rgba(0,163,255,0.5), rgba(76,175,80,0.5))',
                                    zIndex: -1,
                                    filter: 'blur(8px)',
                                    animation: 'glow 3s ease-in-out infinite',
                                    '@keyframes glow': {
                                        '0%, 100%': { opacity: 0.6 },
                                        '50%': { opacity: 1 },
                                    },
                                },
                            }}
                        >
                            <Box
                                component="img"
                                src={qrCodeUrl}
                                alt={t('smartTV.qrAlt')}
                                sx={{
                                    width: 200,
                                    height: 200,
                                    borderRadius: 2,
                                    display: 'block',
                                }}
                            />
                            {/* Scanline effect overlay */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
                                    pointerEvents: 'none',
                                    borderRadius: 3,
                                }}
                            />
                        </Paper>
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
        }

        // Loading state
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

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
                bgcolor: 'background.default',
                color: 'text.primary',
                p: 3,
                position: 'relative',
                overflowY: 'auto',
                overflowX: 'hidden',
                // Animated background - fixed so it doesn't scroll
                '&::before': {
                    content: '""',
                    position: 'fixed',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle at 30% 30%, rgba(0,163,255,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(76,175,80,0.06) 0%, transparent 50%)',
                    animation: 'bgMove 20s ease-in-out infinite',
                    zIndex: 0,
                    '@keyframes bgMove': {
                        '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
                        '50%': { transform: 'translate(-5%, -5%) rotate(180deg)' },
                    },
                },
            }}
        >
            {/* Decorative elements - fixed so they don't scroll */}
            <Box
                sx={{
                    position: 'fixed',
                    top: '10%',
                    right: '10%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,163,255,0.1) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
            <Box
                sx={{
                    position: 'fixed',
                    bottom: '10%',
                    left: '10%',
                    width: 250,
                    height: 250,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(76,175,80,0.08) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
            
            {/* Main content */}
            <Box sx={{ position: 'relative', zIndex: 1, py: 4 }}>
                {renderContent()}
            </Box>
        </Box>
    );
});

export default SmartTVScreen;
