import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, IconButton, Typography, CircularProgress, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const QRScanner: React.FC = () => {
    const { isQRScannerOpen, closeQRScanner } = mediaStore;
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const startCamera = async () => {
            if (isQRScannerOpen) {
                setIsLoading(true);
                setError(null);
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current?.play().catch(e => {
                                console.error("Video play failed", e);
                                setError("Impossibile avviare il video.")
                                setIsLoading(false);
                            });
                            setIsLoading(false);
                        };
                    }
                } catch (err) {
                    console.error("Camera access denied:", err);
                    if (err instanceof Error) {
                        setError(`Errore fotocamera: ${err.message}. Assicurati di aver dato i permessi.`);
                    } else {
                        setError("Impossibile accedere alla fotocamera. Controlla i permessi.");
                    }
                    setIsLoading(false);
                }
            }
        };

        startCamera();

        return () => {
            // Cleanup: stop the camera stream when the effect cleans up
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isQRScannerOpen]);

    return (
        <Modal open={isQRScannerOpen} onClose={closeQRScanner}>
            <Box sx={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <IconButton
                    onClick={closeQRScanner}
                    aria-label="Chiudi scanner"
                    sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 1, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                >
                    <CloseIcon />
                </IconButton>

                {isLoading && <CircularProgress color="inherit" sx={{ color: 'white' }} />}
                
                {error && <Alert severity="error" sx={{m: 2}}>{error}</Alert>}
                
                <video
                    ref={videoRef}
                    playsInline // Important for iOS
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: isLoading || error ? 'none' : 'block'
                    }}
                />

                {!isLoading && !error && (
                    <>
                        <Box sx={{
                            position: 'absolute',
                            border: '4px solid rgba(255, 255, 255, 0.8)',
                            width: 'min(60vw, 300px)',
                            height: 'min(60vw, 300px)',
                            borderRadius: '16px',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                        }} />
                        <Typography
                            variant="h6"
                            sx={{
                                position: 'absolute',
                                bottom: '10%',
                                color: 'white',
                                textShadow: '1px 1px 3px black',
                                textAlign: 'center',
                                px: 2,
                            }}
                        >
                            Inquadra il QR Code sulla tua TV
                        </Typography>
                    </>
                )}
            </Box>
        </Modal>
    );
};

export default observer(QRScanner);
