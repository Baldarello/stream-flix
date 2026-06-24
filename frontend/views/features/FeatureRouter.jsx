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
import { FloatingDock } from '../../components/layout/FloatingDock.jsx';
import { CinematicFooter } from '../../components/layout/CinematicFooter.jsx';
import { CinematicDetail } from '../../components/media/CinematicDetail.jsx';
import ProfileDrawer from '../../components/utilities/ProfileDrawer.jsx';
import { HomeView } from '../../features/home/HomeView.jsx';
import { CinematicGrid } from '../../components/layout/CinematicGrid.jsx';
import LibraryManagementView from '../../components/library/LibraryManagementView.jsx';
import { MyListDetailView } from '../../components/library/MyListDetailView.jsx';

/**
 * FeatureRouter Component
 * 
 * Routes to the appropriate view based on currentActiveView:
 * - 'Home': HomeView with hero and content rows
 * - 'Serie TV': GridView with top series
 * - 'Film': GridView with all movies
 * - 'Anime': GridView with popular anime
 * - 'La mia lista': GridView with user's list
 * - 'MyListDetail': dedicated detail screen for the user's list
 *   (filtering, sorting, stats, drag-and-drop reorder)
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
                    <CinematicGrid
                        id="grid-view-series"
                        title={t('gridView.seriesTitle')}
                        items={topSeries}
                        emptyKey="gridView.empty.default"
                    />
                );
            case 'Film':
                return (
                    <CinematicGrid
                        id="grid-view-movies"
                        title={t('gridView.moviesTitle')}
                        items={allMovies}
                        emptyKey="gridView.empty.default"
                    />
                );
            case 'Anime':
                return (
                    <CinematicGrid
                        id="grid-view-anime"
                        title={t('gridView.animeTitle')}
                        items={popularAnime}
                        emptyKey="gridView.empty.default"
                    />
                );
            case 'La mia lista':
                return (
                    <CinematicGrid
                        id="grid-view-mylist"
                        title={t('gridView.myListTitle')}
                        items={myListItems}
                        emptyKey="gridView.empty.myList"
                    />
                );
            case 'MyListDetail':
                return <MyListDetailView id="my-list-detail-view" />;
            case 'Libreria':
                return <LibraryManagementView id="library-view" />;
            default:
                return <HomeView />;
        }
    };

    return (
        <Box id="feature-router" sx={{ color: 'text.primary' }}>
            <FloatingDock />
            <Box component="a" href="#feature-main" id="skip-link" sx={{
                position: 'absolute',
                left: '-9999px',
                top: 'auto',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                '&:focus-visible': {
                    position: 'static',
                    left: 'auto',
                    top: 'auto',
                    width: 'auto',
                    height: 'auto',
                    overflow: 'visible',
                    padding: 1,
                    zIndex: 9999,
                },
            }}>
                Skip to main content
            </Box>
            <Box component="main" id="feature-main" sx={{ pt: 'calc(64px + env(safe-area-inset-top))' }}>
                {renderFeatureContent()}
            </Box>
            {currentSelectedItem && <CinematicDetail id="detail-cinematic" />}
            <CinematicFooter />
            <ProfileDrawer />
        </Box>
    );
});

FeatureRouter.displayName = 'FeatureRouter';
