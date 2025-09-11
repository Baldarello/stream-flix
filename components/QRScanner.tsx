import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, IconButton, Typography, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner: React.FC = () => {
    const { isQRScannerOpen, closeQRScanner } = mediaStore;
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        // Poiché questo componente viene ora montato solo quando lo scanner dovrebbe essere aperto,
        // possiamo inizializzare lo scanner direttamente nell'effetto di montaggio.
        // È garantito che il contenitore 'qr-reader-container' esista a questo punto.
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
            // Questo viene chiamato frequentemente quando non viene trovato alcun codice QR, quindi possiamo ignorarlo.
        };

        const scanner = new Html5QrcodeScanner('qr-reader-container', config, false);
        scanner.render(onScanSuccess, onScanFailure);

        // La funzione di pulizia viene eseguita quando il componente viene smontato
        return () => {
            if (scanner && scanner.getState() !== 2 /* Html5QrcodeScannerState.NOT_STARTED */) {
                scanner.clear().catch(error => {
                    console.warn("Impossibile pulire html5QrcodeScanner, potrebbe essere già stato rimosso.", error);
                });
            }
        };
    }, []); // L'array di dipendenze vuoto assicura che questo venga eseguito una volta al montaggio e ripulito allo smontaggio

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
                
                {/* Contenitore in cui verrà renderizzato lo scanner */}
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