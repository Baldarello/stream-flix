import React, { useState, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, IconButton, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner: React.FC = () => {
    const { isQRScannerOpen, closeQRScanner } = mediaStore;
    const [scanError, setScanError] = useState<string | null>(null);
    const scannerInstanceRef = useRef<Html5QrcodeScanner | null>(null);

    // Using a callback ref is a more robust way to handle refs for DOM nodes that
    // might not be immediately available on first render, especially inside modals or
    // other components with complex lifecycles. It ensures our code runs only
    // when the DOM node is actually ready.
    const scannerContainerRef = useCallback((node: HTMLDivElement | null) => {
        // The callback runs with the DOM node when the ref is attached.
        if (node !== null) {
            if (scannerInstanceRef.current) {
                // Should not happen, but as a safeguard.
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

                    if (url.origin === window.location.origin && slaveId) {
                        mediaStore.connectAsRemoteMaster(slaveId);
                    } else {
                        throw new Error("Invalid QR code for this application.");
                    }
                } catch (e) {
                    setScanError("Codice QR non valido. Assicurati di scansionare il codice mostrato sulla TV.");
                    setTimeout(() => setScanError(null), 4000);
                }
            };

            const onScanFailure = (error: string) => {
                // This is called frequently when no QR code is found, so we can ignore it.
            };

            const scanner = new Html5QrcodeScanner(
                node.id, 
                config, 
                /* verbose= */ false
            );
            scanner.render(onScanSuccess, onScanFailure);
            scannerInstanceRef.current = scanner;

        // The callback runs with `null` when the ref is detached (on component unmount).
        } else {
            if (scannerInstanceRef.current) {
                if (scannerInstanceRef.current.getState() !== 2 /* Html5QrcodeScannerState.NOT_STARTED */) {
                    scannerInstanceRef.current.clear().catch(error => {
                        console.warn("Failed to clear html5QrcodeScanner.", error);
                    });
                }
                scannerInstanceRef.current = null;
            }
        }
    }, []); // Empty dependency array means the callback is created once.


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
                
                {/* Container where the scanner will be rendered, now with a callback ref */}
                <Box 
                    id="qr-reader-container"
                    ref={scannerContainerRef}
                    sx={{ 
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
                    }} 
                />

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