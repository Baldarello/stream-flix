import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import tvStore from '../tvStore.js';
import {remoteStore} from '../../../store/remoteStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';

/**
 * TvPairingView - QR code pairing screen for connecting phone/tablet as remote
 * Shows large QR code and short code for manual entry
 */
const TvPairingView = observer(() => {
    const { t } = useTranslations();

    const handleBack = () => {
        tvStore.navigate('home');
    };

    // Trigger slave registration if slaveId is not set yet
    // This ensures the TV mode gets a slaveId to generate the QR code
    useEffect(() => {
        if (!remoteStore.slaveId) {
            remoteStore.enableSmartTVMode();
        }
    }, []);

    // Generate QR code URL only when slaveId is available
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const baseUrl = isLocalhost ? window.location.origin : 'https://q.tnl.one';
    const remoteUrl = `${baseUrl}/?remote_for=${remoteStore.slaveId || ''}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(remoteUrl)}`;

    const shortCode = remoteStore.slaveShortCode || '------';

    // Set up back button handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleBack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div 
            id="tv-pairing-view" 
            className="tv-screen tv-pairing-view"
        >
            {/* Title */}
            <h1 className="tv-text-center tv-mb-4">
                {t('tv.pairingTitle', 'Connetti il tuo dispositivo')}
            </h1>

            {/* QR Code */}
            <div id="tv-pairing-qr" className="pairing-qr">
                <img 
                    src={qrCodeUrl} 
                    alt={t('tv.qrCodeAlt', 'QR Code per pairing')}
                    loading="lazy"
                />
            </div>

            {/* Short Code */}
            <div className="pairing-code">
                {shortCode.split('').map((char, index) => (
                    <span key={index}>{char}</span>
                ))}
            </div>

            {/* Instructions */}
            <div className="pairing-instructions">
                <ol>
                    <li>{t('tv.pairingStep1', 'Apri l\'app StreamFlix sul tuo telefono o tablet')}</li>
                    <li>{t('tv.pairingStep2', 'tocca "Connetti alla TV" e scansiona il QR code')}</li>
                </ol>
            </div>

            {/* Alternative instruction */}
            <p className="tv-text-center tv-mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t('tv.orEnterCode', 'Oppure inserisci il codice sopra sul tuo dispositivo')}
            </p>

            {/* Back Button */}
            <button 
                id="tv-back-btn-pairing"
                className="tv-back-button tv-focusable"
                onClick={handleBack}
                autoFocus
            >
                ← {t('tv.back', 'Indietro')}
            </button>
        </div>
    );
});

export default TvPairingView;
