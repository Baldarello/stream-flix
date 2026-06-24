import React, {useCallback, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {remoteStore} from '../../store/remoteStore.js';
import {Alert, Box, Button, IconButton, TextField, Typography} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import {Html5QrcodeScanner} from 'html5-qrcode';
import {useTranslations} from '../../hooks/useTranslations.js';

const MasterScreen = observer(() => {
    const { isQRScannerOpen, isRemoteMasterConnected } = remoteStore;
    const { closeQRScanner, connectAsRemoteMaster } = remoteStore;
    const { t } = useTranslations();
    const [scanError, setScanError] = useState(() => null);
    const [scanSuccess, setScanSuccess] = useState(() => false);
    const [manualCode, setManualCode] = useState(() => '');
    const scannerInstanceRef = useRef(null);

    const scannerContainerRef = useCallback((node) => {
        if (node !== null) {
            if (scannerInstanceRef.current) {
                return;
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0 /* SCAN_TYPE_CAMERA */]
            };

            const onScanSuccess = (decodedText) => {
                if (!isQRScannerOpen) return;

                try {
                    const url = new URL(decodedText);
                    const slaveId = url.searchParams.get('remote_for');

                    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
                    const expectedOrigin = isLocalhost ? window.location.origin : 'https://q.tnl.one';

                    if (url.origin === expectedOrigin && slaveId) {
                        setScanSuccess(true);
                        connectAsRemoteMaster(slaveId);
                    } else {
                        throw new Error("Invalid QR code for this application.");
                    }
                } catch (e) {
                    setScanError(t('qrScanner.error'));
                    setTimeout(() => setScanError(null), 4000);
                }
            };

            const onScanFailure = (error) => {
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
            connectAsRemoteMaster(manualCode.trim().toUpperCase());
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
            }}
        >
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
                        zIndex: 1000,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
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
                        bgcolor: 'rgba(255,255,255,0.1)'
                    }}>
                        <QrCodeScannerIcon sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            color: 'white', 
                            fontWeight: 'bold', 
                            textAlign: 'center'
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
                        borderColor: 'var(--neon-accent)',
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
                        borderColor: 'var(--neon-accent)',
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
                        borderColor: 'var(--neon-accent)',
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
                        borderColor: 'var(--neon-accent)',
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
                                borderRadius: '8px'
                            },
                            '& #qr-reader__dashboard_section': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                p: 2
                            },
                            '& #qr-reader__scan_button': {
                                bgcolor: 'var(--neon-accent) !important',
                                color: 'black !important',
                                border: 'none !important',
                                borderRadius: '8px !important',
                                fontWeight: 'bold !important',
                                padding: '12px 24px !important'
                            },
                            '& #qr-reader__header_permission_button': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                padding: '12px 20px'
                            },
                            '& #qr-reader__camera_selection_button': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px'
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
                        id="master-slave-code-input"
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
                                    borderColor: 'var(--neon-accent)'
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
                        id="connect-master-slave"
                        variant="contained"
                        onClick={handleManualConnect}
                        disabled={!manualCode.trim() || manualCode.length !== 5}
                        sx={{ 
                            px: 4,
                            py: 1.5,
                            bgcolor: 'rgba(0,163,255,0.2)',
                            color: 'white',
                            border: '1px solid rgba(0,163,255,0.5)',
                            '&:hover': { 
                                bgcolor: 'rgba(0,163,255,0.4)',
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
                            color: 'white'
                        }}
                    >
                        {scanError}
                    </Alert>
                )}
            </Box>
        </Box>
    );
});

export default MasterScreen;
