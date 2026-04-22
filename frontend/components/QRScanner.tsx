import React, {useCallback, useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../store/mediaStore.ts';
import {
    Alert,
    Box,
    Button,
    IconButton,
    TextField,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import {Html5QrcodeScanner} from 'html5-qrcode';
import {useTranslations} from '../hooks/useTranslations.ts';

const QRScanner: React.FC = observer(() => {
    const { isQRScannerOpen, closeQRScanner, isRemoteMasterConnected } = mediaStore;
    const { t } = useTranslations();
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanSuccess, setScanSuccess] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [showContent, setShowContent] = useState(false);
    const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);

    // Animation state for staggered entrance
    useEffect(() => {
        if (isQRScannerOpen) {
            const timer = setTimeout(() => setShowContent(true), 100);
            return () => clearTimeout(timer);
        } else {
            setShowContent(false);
        }
    }, [isQRScannerOpen]);

    const scannerContainerRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            if (scannerInstanceRef.current) {
                return;
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0 /* SCAN_TYPE_CAMERA */]
            };

            const onScanSuccess = (decodedText: string) => {
                if (!mediaStore.isQRScannerOpen) return;

                try {
                    const url = new URL(decodedText);
                    const slaveId = url.searchParams.get('remote_for');

                    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                    const expectedOrigin = isLocalhost ? window.location.origin : 'https://q.tnl.one';

                    if (url.origin === expectedOrigin && slaveId) {
                        setScanSuccess(true);
                        mediaStore.connectAsRemoteMaster(slaveId);
                    } else {
                        throw new Error("Invalid QR code for this application.");
                    }
                } catch (e) {
                    setScanError(t('qrScanner.error'));
                    setTimeout(() => setScanError(null), 4000);
                }
            };

            const onScanFailure = (error: string) => {
                // This is called frequently when no QR code is found, so we can ignore it.
            };

            const scanner = new Html5QrcodeScanner(
                node.id, 
                config, 
                false
            );
            scanner.render(onScanSuccess, onScanFailure);
            scannerInstanceRef.current = scanner;

        } else {
            if (scannerInstanceRef.current) {
                if (scannerInstanceRef.current.getState() !== 2) {
                    scannerInstanceRef.current.clear().catch(error => {
                        console.warn("Failed to clear html5QrcodeScanner.", error);
                    });
                }
                scannerInstanceRef.current = null;
            }
        }
    }, [t]);


    const handleClose = () => {
        setScanError(null);
        setScanSuccess(false);
        closeQRScanner();
    };
    
    const handleManualConnect = () => {
        if (manualCode.trim()) {
            mediaStore.connectAsRemoteMaster(manualCode.trim().toUpperCase());
        }
    };

    const getGlowColor = () => {
        switch (mediaStore.activeTheme) {
            case 'Film':
                return 'var(--glow-film-color)';
            case 'Anime':
                return 'var(--glow-anime-color)';
            case 'SerieTV':
            default:
                return 'var(--glow-seriestv-color)';
        }
    };

    const isConnecting = isRemoteMasterConnected || scanSuccess;

    // Don't render if not open
    if (!isQRScannerOpen) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                bgcolor: 'background.default',
                color: 'text.primary',
                overflow: 'hidden',
                // Animated background - fixed so it doesn't scroll
                '&::before': {
                    content: '""',
                    position: 'absolute',
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
            <Box
                sx={{
                    position: 'absolute',
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
                    position: 'absolute',
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

            {/* Main content wrapper */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    px: 3,
                    py: 2,
                }}
            >
                
                {/* Close button */}
                <IconButton
                    onClick={handleClose}
                    aria-label={t('qrScanner.close')}
                    sx={{ 
                        position: 'absolute', 
                        top: 16, 
                        right: 16, 
                        color: 'white', 
                        bgcolor: 'rgba(0,0,0,0.5)', 
                        transition: 'all 0.3s ease',
                        zIndex: 1000,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.8)', transform: 'scale(1.1) rotate(90deg)' }
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Header */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, zIndex: 10 }}>
                    <Box sx={{ 
                        mb: 2, 
                        p: 2, 
                        borderRadius: '50%', 
                        bgcolor: 'rgba(255,255,255,0.1)',
                        animation: 'pulse 2s ease-in-out infinite'
                    }}>
                        <QrCodeScannerIcon sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            color: 'white', 
                            fontWeight: 'bold', 
                            textAlign: 'center',
                            textShadow: `0 0 20px ${getGlowColor()}`
                        }}
                    >
                        {isConnecting ? t('qrScanner.connecting') : t('qrScanner.title')}
                    </Typography>
                    {!isConnecting && (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: 'rgba(255,255,255,0.7)', 
                                mt: 1, 
                                textAlign: 'center',
                                maxWidth: 300
                            }}
                        >
                            {t('qrScanner.scanInstructions')}
                        </Typography>
                    )}
                </Box>
                
                {/* QR Scanner */}
                <Box sx={{ position: 'relative', zIndex: 10 }}>
                    {/* Corner markers */}
                    <Box sx={{
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        width: 30,
                        height: 30,
                        borderTop: '3px solid',
                        borderLeft: '3px solid',
                        borderColor: getGlowColor(),
                        borderRadius: '4px 0 0 0',
                        zIndex: 10
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 30,
                        height: 30,
                        borderTop: '3px solid',
                        borderRight: '3px solid',
                        borderColor: getGlowColor(),
                        borderRadius: '0 4px 0 0',
                        zIndex: 10
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        bottom: -4,
                        left: -4,
                        width: 30,
                        height: 30,
                        borderBottom: '3px solid',
                        borderLeft: '3px solid',
                        borderColor: getGlowColor(),
                        borderRadius: '0 0 0 4px',
                        zIndex: 10
                    }} />
                    <Box sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 30,
                        height: 30,
                        borderBottom: '3px solid',
                        borderRight: '3px solid',
                        borderColor: getGlowColor(),
                        borderRadius: '0 0 4px 0',
                        zIndex: 10
                    }} />
                    
                    {/* Scanner container */}
                    <Box 
                        id="qr-reader-container"
                        ref={scannerContainerRef}
                        sx={{ 
                            width: 'min(85vw, 400px)',
                            '& #qr-reader__dashboard_section_swaplink': { color: 'white !important' },
                            '& #qr-reader__dashboard_section select': { color: 'black' },
                            '& #html5-qrcode-anchor-scan-type-change': {
                                color: 'white !important',
                                textDecoration: 'underline !important'
                            },
                            '& video': {
                                borderRadius: '8px',
                                boxShadow: `0 0 30px ${getGlowColor()}`
                            },
                            '& #qr-reader__dashboard_section': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                p: 2
                            },
                            '& #qr-reader__scan_button': {
                                bgcolor: `${getGlowColor()} !important`,
                                color: 'black !important',
                                border: 'none !important',
                                borderRadius: '8px !important',
                                fontWeight: 'bold !important',
                                padding: '12px 24px !important',
                                transition: 'all 0.3s ease !important',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: `0 0 20px ${getGlowColor()}`
                                }
                            },
                            '& #qr-reader__header_permission_button': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                padding: '12px 20px',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    borderColor: 'white',
                                    boxShadow: `0 0 15px ${getGlowColor()}`
                                }
                            },
                            '& #qr-reader__camera_selection_button': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.2)'
                                }
                            }
                        }} 
                    />
                </Box>
                
                {/* Divider */}
                <Typography 
                    variant="body1" 
                    sx={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        my: 3, 
                        zIndex: 10, 
                        fontWeight: 'medium',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Box sx={{ 
                        flex: 1, 
                        height: '1px', 
                        bgcolor: 'rgba(255,255,255,0.2)' 
                    }} />
                    {t('qrScanner.or')}
                    <Box sx={{ 
                        flex: 1, 
                        height: '1px', 
                        bgcolor: 'rgba(255,255,255,0.2)' 
                    }} />
                </Typography>

                {/* Manual input section */}
                <Box sx={{ 
                    zIndex: 10, 
                    width: 'min(85vw, 400px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5
                }}>
                    <TextField
                        label={t('qrScanner.enterCode')}
                        variant="outlined"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 5))}
                        fullWidth
                        disabled={isConnecting}
                        sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.4)',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                '&:hover fieldset': { borderColor: 'white' },
                                '&.Mui-focused fieldset': { 
                                    borderColor: getGlowColor(),
                                    boxShadow: `0 0 10px ${getGlowColor()}`
                                },
                            },
                            '& .MuiInputLabel-root': { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': { color: 'white' }
                            },
                            '& .MuiInputBase-input': { 
                                color: 'white',
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.3em',
                                textAlign: 'center'
                            }
                        }}
                        inputProps={{
                            maxLength: 5,
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleManualConnect}
                        disabled={!manualCode.trim() || manualCode.length !== 5}
                        sx={{ 
                            px: 4,
                            py: 1.5,
                            bgcolor: 'rgba(0,163,255,0.2)',
                            color: 'white',
                            border: '1px solid rgba(0,163,255,0.5)',
                            transition: 'all 0.3s ease',
                            '&:hover': { 
                                bgcolor: 'rgba(0,163,255,0.4)',
                                boxShadow: `0 0 20px rgba(0,163,255,0.5)`,
                                borderColor: 'rgba(0,163,255,0.8)'
                            },
                            '&:disabled': { 
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.3)'
                            }
                        }}
                    >
                        {t('qrScanner.connect')}
                    </Button>
                </Box>


                {/* Error Alert */}
                {scanError && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            position: 'absolute', 
                            bottom: 24, 
                            zIndex: 1000,
                            bgcolor: 'rgba(244, 67, 54, 0.9)',
                            color: 'white',
                            backdropFilter: 'blur(10px)',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        {scanError}
                    </Alert>
                )}
                
                {/* CSS animations */}
                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
            </Box>
        </Box>
    );
});

export default QRScanner;