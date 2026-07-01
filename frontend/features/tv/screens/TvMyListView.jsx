import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import TvListRow from '../components/TvListRow.jsx';
import TvEmptyState from '../components/TvEmptyState.jsx';
import tvStore from '../tvStore.js';
import { mediaStore } from '../../../store/mediaStore.js';
import { useTranslations } from '../../../hooks/useTranslations.js';

/**
 * TvMyListView - Full screen My List view
 * Shows Continue Watching as first row, then My List as second row
 */
const TvMyListView = observer(() => {
    const { t } = useTranslations();

    const continueWatchingItems = mediaStore.continueWatchingItems || [];
    const myListItems = mediaStore.myListItems || [];

    const showEmptyState = continueWatchingItems.length === 0 && myListItems.length === 0;

    const handleBack = () => {
        tvStore.navigate('home');
    };

    const handleItemActivate = (item) => {
        if (item) {
            mediaStore.playShowOrEpisode(item);
        }
    };

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

    if (showEmptyState) {
        return (
            <div id="tv-my-list-view" className="tv-screen tv-my-list-view">
                <button id="tv-back-btn-mylist" className="tv-back-button tv-focusable" onClick={handleBack} autoFocus>
                    ← {t('tv.back', 'Indietro')}
                </button>
                <TvEmptyState
                    message={t('tv.emptyList', 'La tua lista è vuota')}
                    ctaLabel={t('tv.browseCatalog', 'Sfoglia il catalogo')}
                    onCtaClick={handleBack}
                />
            </div>
        );
    }

    return (
        <div id="tv-my-list-view" className="tv-screen tv-my-list-view">
            {/* Header with Back Button */}
            <div className="tv-header">
                <button id="tv-back-btn-mylist" className="tv-back-button tv-focusable" onClick={handleBack}>
                    ← {t('tv.back', 'Indietro')}
                </button>
                <h1>{t('tv.myList', 'La mia lista')}</h1>
            </div>

            {/* Continue Watching Row */}
            {continueWatchingItems.length > 0 && (
                <TvListRow
                    id="tv-my-list-continue"
                    title={t('tv.continueWatching', 'Continua a guardare')}
                    items={continueWatchingItems}
                    startRow={1}
                    onItemActivate={handleItemActivate}
                />
            )}

            {/* My List Row */}
            {myListItems.length > 0 && (
                <TvListRow
                    id="tv-my-list-items"
                    title={t('tv.myList', 'La mia lista')}
                    items={myListItems}
                    startRow={continueWatchingItems.length > 0 ? 2 : 1}
                    onItemActivate={handleItemActivate}
                />
            )}
        </div>
    );
});

export default TvMyListView;
