/**
 * @fileoverview Home Feature - Home View Component
 * 
 * This component displays the home page content including:
 * - Hero banner with featured content
 * - Content rows based on active theme (Continue Watching, My List, Trending, etc.)
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Container } from '@mui/material';
import { useTranslations } from '../../hooks/useTranslations.js';
import { mediaStore } from '../../store/mediaStore.js';
import Hero from '../../components/layout/Hero.jsx';
import ContentRow from '../../components/layout/ContentRow.jsx';

/**
 * Home View Component
 * 
 * Renders the main home page with hero banner and content rows.
 * The content rows vary based on the active theme (Anime, SerieTV, Film).
 * 
 * @returns {React.ReactElement} Home view component
 */
export const HomeView = observer(() => {
    const { t } = useTranslations();
    const { heroContent, homePageRows, startPlayback, selectMedia } = mediaStore;

    return (
        <>
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
        </>
    );
});

HomeView.displayName = 'HomeView';
