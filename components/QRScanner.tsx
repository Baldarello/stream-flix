import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, IconButton, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner: React.FC = () => {
    const { isQRScannerOpen, closeQRScanner } = mediaStore;
    const [scanError, setScanError] = useState<string | null>(null);

    // This effect manages the lifecycle of the scanner
    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        
        if (isQRScannerOpen) {
            // Configuration for the scanner
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0 /* SCAN_TYPE_CAMERA */]
            };

            // Success callback
            const onScanSuccess = (decodedText: string) => {
                // Prevent multiple triggers if a scan is processed
                if (!mediaStore.isQRScannerOpen) return;

                try {
                    const url = new URL(decodedText);
                    const slaveId = url.searchParams.get('remote_for');

                    if (url.origin === window.location.origin && slaveId) {
                        // Successfully scanned a valid QR code for this app
                        mediaStore.connectAsRemoteMaster(slaveId);
                        // The scanner will be cleaned up by the return function of useEffect
                        // as the modal will close.
                    } else {
                        // Scanned a QR code, but it's not for this app
                        throw new Error("Invalid QR code for this application.");
                    }
                } catch (e) {
                    setScanError("Codice QR non valido. Assicurati di scansionare il codice mostrato sulla TV.");
                    // Clear the error message after a few seconds
                    setTimeout(() => setScanError(null), 4000);
                }
            };

            // Error callback (optional)
            const onScanFailure = (error: string) => {
                // This is called frequently when no QR code is found, so we can ignore it.
            };

            // Initialize the scanner
            scanner = new Html5QrcodeScanner('qr-reader-container', config, false);
            scanner.render(onScanSuccess, onScanFailure);
        }

        // Cleanup function
        return () => {
            if (scanner && scanner.getState() !== 2 /* Html5QrcodeScannerState.NOT_STARTED */) {
                scanner.clear().catch(error => {
                    // This can fail if the DOM element is already removed, which is fine.
                    console.warn("Failed to clear html5QrcodeScanner, it might have been removed already.", error);
                });
            }
        };
    }, [isQRScannerOpen]);

    const handleClose = () => {
        setScanError(null);
        closeQRScanner();
    };

    return (
        <Modal open={isQRScannerOpen} onClose={handleClose}>
            <Box sx={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                bgcolor: 'black',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}>
                <IconButton
                    onClick={handleClose}
                    aria-label="Chiudi scanner"
                    sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 2, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                >
                    <CloseIcon />
                </IconButton>

                <Typography variant="h6" sx={{ color: 'white', mb: 2, zIndex: 1, textAlign: 'center' }}>
                    Inquadra il QR Code sulla TV
                </Typography>
                
                {/* Container where the scanner will be rendered */}
                <Box id="qr-reader-container" sx={{ 
                    width: 'min(90vw, 450px)',
                    "& #qr-reader__dashboard_section_swaplink": { color: 'white !important' },
                    "& #qr-reader__dashboard_section select": { color: 'black' },
                    "& #html5-qrcode-anchor-scan-type-change": {
                        color: 'white !important',
                        textDecoration: 'underline !important'
                    },
                    "& video": {
                        borderRadius: '8px'
                    }
                }} />

                {scanError && (
                    <Alert severity="error" sx={{ position: 'absolute', bottom: '10%', zIndex: 2 }}>
                        {scanError}
                    </Alert>
                )}
            </Box>
        </Modal>
    );
};

export default observer(QRScanner);