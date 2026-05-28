/**
 * @fileoverview Feature Middleware - Grid View Handler
 * 
 * This middleware handles grid views for Series, Movies, Anime, and My List,
 * displaying content in a grid layout.
 */

import React from 'react';
import { useTranslations } from '../../hooks/useTranslations.js';
import GridView from '../../components/layout/GridView.jsx';
import { MainLayout } from '../../features/shared/MainLayout.jsx';

/**
 * Grid Middleware
 * 
 * Checks if the current view is a grid-based view (Serie TV, Film, Anime, La mia lista)
 * and displays the GridView component with appropriate content.
 * Wraps content in MainLayout which includes Header, Footer, DetailView, and modals.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with grid data
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Grid view or null to continue chain
 */
export const GridMiddleware = ({ stores, children }) => {
    const { t } = useTranslations();
    const { currentActiveView, topSeries, allMovies, popularAnime, myListItems } = stores.mediaStore;

    // Define grid view configurations
    const gridViews = {
        'Serie TV': {
            title: t('gridView.seriesTitle'),
            items: topSeries,
        },
        'Film': {
            title: t('gridView.moviesTitle'),
            items: allMovies,
        },
        'Anime': {
            title: t('gridView.animeTitle'),
            items: popularAnime,
        },
        'La mia lista': {
            title: t('gridView.myListTitle'),
            items: myListItems,
        },
    };

    const gridConfig = gridViews[currentActiveView];

    if (!gridConfig) {
        return children;
    }

    return (
        <MainLayout>
            <GridView
                id={`grid-view-${currentActiveView}`}
                title={gridConfig.title}
                items={gridConfig.items}
            />
        </MainLayout>
    );
};
