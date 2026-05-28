/**
 * @fileoverview Feature Middleware - Home View Handler
 * 
 * This middleware handles the home view,
 * displaying the hero content and content rows.
 */

import React from 'react';
import { Box, Container } from '@mui/material';
import { useTranslations } from '../../hooks/useTranslations.js';
import { Hero } from '../../components/layout/Hero.jsx';
import { ContentRow } from '../../components/layout/ContentRow.jsx';
import { MainLayout } from '../../features/shared/MainLayout.jsx';

/**
 * Home Middleware
 * 
 * Checks if the current view is 'Home' and displays the home content.
 * Home content includes hero banner and content rows based on theme.
 * Wraps content in MainLayout which includes Header, Footer, DetailView, and modals.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with homePageRows and heroContent
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Home view or null to continue chain
 */
export const HomeMiddleware = ({ stores, children }) => {
    const { t } = useTranslations();
    const { heroContent, homePageRows, currentActiveView, startPlayback, selectMedia } = stores.mediaStore;

    if (currentActiveView !== 'Home') {
        return children;
    }

    return (
        <MainLayout>
            {heroContent && (
                <Hero
                    id="home-hero"
                    item={heroContent}
                    onMoreInfoClick={() => selectMedia(heroContent, 'detailView')}
                    onPlayClick={() => startPlayback(heroContent)}
                />
            )}
            <Container 
                id="home-content-rows"
                maxWidth={false} 
                sx={{ pt: { xs: 4, md: 8 }, pb: 8, pl: { xs: 2, md: 6 } }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                    {homePageRows.map(row => {
                        const isContinueWatching = row.titleKey === 'misc.continueWatching';
                        const handleCardClick = (item) => {
                            if (isContinueWatching) {
                                startPlayback(item);
                            } else {
                                selectMedia(item);
                            }
                        };

                        return (
                            <ContentRow
                                key={row.titleKey}
                                id={`content-row-${row.titleKey}`}
                                title={t(row.titleKey)}
                                items={row.items}
                                onCardClick={handleCardClick}
                                isContinueWatching={isContinueWatching}
                                isReorderable={row.titleKey === 'misc.myList'}
                            />
                        );
                    })}
                </Box>
            </Container>
        </MainLayout>
    );
};
