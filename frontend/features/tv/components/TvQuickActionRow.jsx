import React from 'react';
import { observer } from 'mobx-react-lite';
import TvQuickActionTile from './TvQuickActionTile.jsx';
import tvStore from '../tvStore.js';
import { mediaStore } from '../../../store/mediaStore.js';
import { handleSignIn, handleSignOut } from '../../../services/googleAuthService.js';
import { useTranslations } from '../../../hooks/useTranslations.js';

// Google SVG Icon
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

// QR Code SVG Icon
const QRIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" fill="#ffffff" />
        <rect x="14" y="3" width="7" height="7" fill="#ffffff" />
        <rect x="3" y="14" width="7" height="7" fill="#ffffff" />
        <rect x="15" y="15" width="2" height="2" fill="#ffffff" />
        <rect x="19" y="15" width="2" height="2" fill="#ffffff" />
        <rect x="15" y="19" width="2" height="2" fill="#ffffff" />
        <rect x="19" y="19" width="2" height="2" fill="#ffffff" />
        <rect x="5" y="5" width="3" height="3" fill="#000000" />
        <rect x="16" y="5" width="3" height="3" fill="#000000" />
        <rect x="5" y="16" width="3" height="3" fill="#000000" />
        <rect x="17" y="17" width="1" height="1" fill="#000000" />
        <rect x="20" y="17" width="1" height="1" fill="#000000" />
        <rect x="17" y="20" width="1" height="1" fill="#000000" />
        <rect x="20" y="20" width="1" height="1" fill="#000000" />
    </svg>
);

// My List SVG Icon
const MyListIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"
            fill="#ffffff"
        />
    </svg>
);

/**
 * TvQuickActionRow - Horizontal row with 3 quick action tiles
 * Google Sign-in, QR Pairing, My List
 */
const TvQuickActionRow = observer(() => {
    const { t } = useTranslations();
    const isLoggedIn = mediaStore.isLoggedIn;
    const googleUser = mediaStore.googleUser;
    const showSignOutConfirm = tvStore.showSignOutConfirm;

    const handleGoogleTile = () => {
        if (isLoggedIn) {
            tvStore.setShowSignOutConfirm(true);
        } else {
            handleSignIn();
        }
    };

    const handleSignOutConfirm = () => {
        handleSignOut();
        tvStore.setShowSignOutConfirm(false);
    };

    const handleSignOutCancel = () => {
        tvStore.setShowSignOutConfirm(false);
    };

    const handleQRTile = () => {
        tvStore.navigate('pairing');
    };

    const handleMyListTile = () => {
        tvStore.navigate('myList');
    };

    return (
        <div id="tv-quick-actions" className="tv-quick-action-row" role="group" aria-label="Quick Actions">
            <TvQuickActionTile
                id="google"
                row={0}
                col={0}
                icon={<GoogleIcon />}
                title={isLoggedIn ? googleUser?.name || 'Google' : t('tv.signIn', 'Accedi con Google')}
                onActivate={handleGoogleTile}
                isLoggedIn={isLoggedIn}
                userName={googleUser?.name || ''}
                userAvatar={googleUser?.picture || ''}
            />

            <TvQuickActionTile
                id="qr"
                row={0}
                col={1}
                icon={<QRIcon />}
                title={t('tv.showQR', 'QR Code')}
                onActivate={handleQRTile}
            />

            <TvQuickActionTile
                id="mylist"
                row={0}
                col={2}
                icon={<MyListIcon />}
                title={t('tv.myList', 'La mia lista')}
                onActivate={handleMyListTile}
            />

            {/* Sign Out Confirmation Dialog */}
            {showSignOutConfirm && (
                <div
                    id="tv-signout-dialog"
                    className="tv-confirm-dialog tv-focusable"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="signout-title"
                >
                    <h3 id="signout-title" className="dialog-title">
                        {t('tv.signOutConfirm', 'Vuoi disconnetterti?')}
                    </h3>
                    <div className="dialog-buttons">
                        <button className="dialog-btn cancel" onClick={handleSignOutCancel} autoFocus>
                            {t('common.cancel', 'Annulla')}
                        </button>
                        <button className="dialog-btn confirm" onClick={handleSignOutConfirm}>
                            {t('tv.signOut', 'Disconnetti')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default TvQuickActionRow;
