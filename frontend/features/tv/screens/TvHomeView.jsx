import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import TvQuickActionRow from '../components/TvQuickActionRow.jsx';
import TvListRow from '../components/TvListRow.jsx';
import TvEmptyState from '../components/TvEmptyState.jsx';
import tvStore from '../tvStore.js';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';

/**
 * TvHomeView - Main TV home screen
 * Shows quick actions at top, then Continue Watching and My List rows
 */
const TvHomeView = observer(() => {
    const {t} = useTranslations();

    // Get items from mediaStore
    const continueWatchingItems = mediaStore.continueWatchingItems || [];
    const myListItems = mediaStore.myListItems || [];

    // Check if we should show empty state
    const showEmptyState = continueWatchingItems.length === 0 && myListItems.length === 0;

    const handleItemActivate = (item) => {
        // Navigate to player with the selected item
        if (item) {
            // Store the selected item and navigate to player
            // The player view will handle playback
            tvStore.navigate('player');
        }
    };

    // Set initial focus on home screen
    useEffect(() => {
        // Focus management is handled by tvStore
        return () => {
            // Cleanup focus on unmount
        };
    }, []);

    if (showEmptyState) {
        return (
            <div id="tv-home-view" className="tv-screen tv-home-view">
                <TvQuickActionRow/>
                <TvEmptyState
                    message={t('tv.emptyHome', 'Accedi con Google e connetti un dispositivo per iniziare')}
                    ctaLabel={t('tv.browseCatalog', 'Sfoglia il catalogo')}
                    onCtaClick={() => {
                        // In TV mode the only way to control the TV is to pair
                        // a phone/tablet as a remote via the QR code screen.
                        // Sending the user to the pairing view lets them scan
                        // the QR code and start watching content right away.
                        tvStore.navigate('pairing');
                    }}
                />
            </div>
        );
    }

    return (
        <div id="tv-home-view" className="tv-screen tv-home-view">
            {/* Quick Action Tiles: Google, QR, My List */}
            <TvQuickActionRow/>

            {/* Continue Watching Row */}
            {continueWatchingItems.length > 0 && (
                <TvListRow
                    title={t('tv.continueWatching', 'Continua a guardare')}
                    items={continueWatchingItems}
                    startRow={1}
                    onItemActivate={handleItemActivate}
                />
            )}

            {/* My List Row */}
            {myListItems.length > 0 && (
                <TvListRow
                    title={t('tv.myList', 'La mia lista')}
                    items={myListItems}
                    startRow={continueWatchingItems.length > 0 ? 2 : 1}
                    onItemActivate={handleItemActivate}
                />
            )}
        </div>
    );
});

export default TvHomeView;
