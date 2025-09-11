import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, IconButton, Typography, CircularProgress, Alert, ToggleButtonGroup, ToggleButton, Stack, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SwitchCameraIcon from '@mui/icons-material/SwitchCamera';
import jsQR from 'jsqr';

const qualitySettings = {
  '480p': { width: { ideal: 640 }, height: { ideal: 480 } },
  '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
  '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } },
};
type Quality = keyof typeof qualitySettings;

const QRScanner: React.FC = () => {
    const { isQRScannerOpen, closeQRScanner } = mediaStore;
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState<Quality>('720p');

    // On open, enumerate devices and select a default
    useEffect(() => {
        const getDevices = async () => {
            if (isQRScannerOpen && devices.length === 0) {
                try {
                    const availableDevices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
                    setDevices(availableDevices);
                    if (availableDevices.length > 0) {
                        const backCamera = availableDevices.find(d => d.label.toLowerCase().includes('back'));
                        setSelectedDeviceId(backCamera?.deviceId || availableDevices[0].deviceId);
                    } else {
                        setError("Nessuna fotocamera trovata.");
                    }
                } catch (err) {
                    console.error("Error enumerating devices:", err);
                    setError("Impossibile elencare i dispositivi della fotocamera.");
                }
            }
        };
        getDevices();
    }, [isQRScannerOpen, devices.length]);

    // Start or restart the camera when dependencies change
    useEffect(() => {
        const scanQRCode = () => {
            if (
                videoRef.current &&
                videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
                canvasRef.current
            ) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        try {
                            const url = new URL(code.data);
                            const slaveId = url.searchParams.get('remote_for');
                            if (url.origin === window.location.origin && slaveId) {
                                setScanResult('Codice trovato! Connessione in corso...');
                                mediaStore.connectAsRemoteMaster(slaveId);
                                // No need to stop scanning, component will unmount/cleanup will run
                                return; // Stop the loop
                            }
                        } catch (e) {
                            // Not a valid URL, ignore and continue scanning
                        }
                    }
                }
            }
            animationFrameIdRef.current = requestAnimationFrame(scanQRCode);
        };
        
        const startCamera = async () => {
            if (isQRScannerOpen && selectedDeviceId) {
                // Stop previous stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }

                setIsLoading(true);
                setError(null);
                setScanResult(null);

                const constraints: MediaStreamConstraints = {
                    video: {
                        deviceId: { exact: selectedDeviceId },
                        ...qualitySettings[selectedQuality]
                    }
                };

                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current?.play().catch(e => {
                                console.error("Video play failed", e);
                                setError("Impossibile avviare il video.");
                            });
                            setIsLoading(false);
                             // Start the scanning loop
                            animationFrameIdRef.current = requestAnimationFrame(scanQRCode);
                        };
                    }
                } catch (err) {
                    console.error("Camera access error:", err);
                    if (err instanceof Error) {
                        setError(`Errore fotocamera: ${err.message}. Assicurati di aver dato i permessi e prova una qualità diversa.`);
                    } else {
                        setError("Impossibile accedere alla fotocamera. Controlla i permessi.");
                    }
                    setIsLoading(false);
                }
            }
        };

        startCamera();

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isQRScannerOpen, selectedDeviceId, selectedQuality]);

    const handleSwitchCamera = () => {
        if (devices.length > 1) {
            const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            setSelectedDeviceId(devices[nextIndex].deviceId);
        }
    };

    const handleQualityChange = (event: React.MouseEvent<HTMLElement>, newQuality: Quality | null) => {
        if (newQuality !== null) {
          setSelectedQuality(newQuality);
        }
    };

    const handleVideoClick = async () => {
        if (!streamRef.current) return;
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (!videoTrack) return;
        
        try {
            const capabilities = videoTrack.getCapabilities();
            if ((capabilities as any).focusMode?.includes('continuous')) {
                await videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints);
            }
        } catch (e) {
            console.warn("Autofocus trigger failed:", e);
        }
    };
    
    const handleCloseScanner = () => {
        setScanResult(null);
        closeQRScanner();
    }

    return (
        <Modal open={isQRScannerOpen} onClose={handleCloseScanner}>
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
                    onClick={handleCloseScanner}
                    aria-label="Chiudi scanner"
                    sx={{ position: 'absolute', top: 16, right: 16, color: 'white', zIndex: 2, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                >
                    <CloseIcon />
                </IconButton>

                {isLoading && <CircularProgress color="inherit" sx={{ color: 'white' }} />}
                
                {error && <Alert severity="error" sx={{m: 2, zIndex: 2}}>{error}</Alert>}
                
                <video
                    ref={videoRef}
                    onClick={handleVideoClick}
                    playsInline
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: isLoading || error ? 'none' : 'block',
                        cursor: 'pointer'
                    }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />


                {!isLoading && !error && (
                    <>
                        {/* Viewfinder and feedback overlay */}
                        <Box sx={{
                            position: 'absolute',
                            border: `4px solid ${scanResult ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 255, 255, 0.8)'}`,
                            width: 'min(60vw, 300px)',
                            height: 'min(60vw, 300px)',
                            borderRadius: '16px',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                            transition: 'border-color 0.3s ease-in-out',
                        }} />
                        <Fade in={!scanResult}>
                            <Typography
                                variant="h6"
                                sx={{
                                    position: 'absolute',
                                    bottom: '20%',
                                    color: 'white',
                                    textShadow: '1px 1px 3px black',
                                    textAlign: 'center',
                                    px: 2,
                                }}
                            >
                                Inquadra il QR Code sulla tua TV
                            </Typography>
                        </Fade>
                        {scanResult && (
                             <Alert severity="success" sx={{ position: 'absolute', bottom: '20%' }}>{scanResult}</Alert>
                        )}
                        
                        {/* Camera controls */}
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            sx={{
                                position: 'absolute',
                                bottom: '5%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 2,
                                bgcolor: 'rgba(0,0,0,0.5)',
                                p: 1.5,
                                borderRadius: 2,
                                alignItems: 'center'
                            }}
                        >
                             <ToggleButtonGroup
                                value={selectedQuality}
                                exclusive
                                onChange={handleQualityChange}
                                aria-label="qualità fotocamera"
                                size="small"
                                >
                                {Object.keys(qualitySettings).map((q) => (
                                    <ToggleButton key={q} value={q} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.3)', '&:hover': {bgcolor: 'rgba(255,255,255,0.4)'} } }}>
                                    {q}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>

                            {devices.length > 1 && (
                                <IconButton onClick={handleSwitchCamera} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                                    <SwitchCameraIcon />
                                </IconButton>
                            )}
                        </Stack>
                    </>
                )}
            </Box>
        </Modal>
    );
};

export default observer(QRScanner);