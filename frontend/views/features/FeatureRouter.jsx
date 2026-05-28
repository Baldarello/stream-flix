/**
 * @fileoverview Feature Router - Routes to Home/Grid/Library Views
 * 
 * Routes to the appropriate feature view based on mediaStore.currentActiveView.
 * This is the default view when no special mode (playback, search, etc.) is active.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@mui/material';
import { useStores } from '../../context/StoreContext.jsx';
import { useTranslations } from '../../hooks/useTranslations.js';
import { Header } from '../../components/layout/Header.jsx';
import { Footer } from '../../components/layout/Footer.jsx';
import DetailView from '../../components/media/DetailView.jsx';
import ProfileDrawer from '../../components/utilities/ProfileDrawer.jsx';
import { HomeView } from '../../features/home/HomeView.jsx';
import GridView from '../../components/layout/GridView.jsx';
import LibraryManagementView from '../../components/library/LibraryManagementView.jsx';

/**
 * FeatureRouter Component
 * 
 * Routes to the appropriate view based on currentActiveView:
 * - 'Home': HomeView with hero and content rows
 * - 'Serie TV': GridView with top series
 * - 'Film': GridView with all movies
 * - 'Anime': GridView with popular anime
 * - 'La mia lista': GridView with user's list
 * - 'Libreria': LibraryManagementView
 * - default: HomeView
 * 
 * Also renders Header, Footer, DetailView (when item selected), and ProfileDrawer.
 * 
 * @returns {React.ReactElement} Feature view component
 */
export const FeatureRouter = observer(() => {
    const { mediaStore } = useStores();
    const { t } = useTranslations();
    const { 
        currentActiveView, 
        topSeries, 
        allMovies, 
        popularAnime, 
        myListItems, 
        currentSelectedItem 
    } = mediaStore;

    const renderFeatureContent = () => {
        switch (currentActiveView) {
            case 'Home':
                return <HomeView />;
            case 'Serie TV':
                return (
                    <GridView 
                        id="grid-view-series"
                        title={t('gridView.seriesTitle')} 
                        items={topSeries} 
                    />
                );
            case 'Film':
                return (
                    <GridView 
                        id="grid-view-movies"
                        title={t('gridView.moviesTitle')} 
                        items={allMovies} 
                    />
                );
            case 'Anime':
                return (
                    <GridView 
                        id="grid-view-anime"
                        title={t('gridView.animeTitle')} 
                        items={popularAnime} 
                    />
                );
            case 'La mia lista':
                return (
                    <GridView 
                        id="grid-view-mylist"
                        title={t('gridView.myListTitle')} 
                        items={myListItems} 
                    />
                );
            case 'Libreria':
                return <LibraryManagementView id="library-view" />;
            default:
                return <HomeView />;
        }
    };

    return (
        <Box id="feature-router" sx={{ color: 'text.primary' }}>
            <Header />
            <main 
                id="feature-main"
                sx={{ pt: 'calc(64px + env(safe-area-inset-top))' }}
            >
                {renderFeatureContent()}
            </main>
            {currentSelectedItem && <DetailView id="detail-view" />}
            <Footer />
            <ProfileDrawer />
        </Box>
    );
});

FeatureRouter.displayName = 'FeatureRouter';
