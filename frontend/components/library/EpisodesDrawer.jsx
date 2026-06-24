import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {Box, Drawer, List} from '@mui/material';
import {gsap} from 'gsap';
import {durations, easings, reducedMotion, stagger} from '../../motion/grammar.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ScanlineOverlay} from '../feedback/ScanlineOverlay.jsx';
import {Skeleton} from '../feedback/Skeleton.jsx';

import HoloDrawerHeader from './HoloDrawerHeader.jsx';
import EpisodeRow from './EpisodeRow.jsx';
import EmptyEpisodes from './EmptyEpisodes.jsx';

const SKELETON_ROWS = 6;

const EpisodeListSkeleton = () => (
    <Box data-component="episodes-drawer-skeleton" sx={{position: 'relative', zIndex: 2, p: 1.5}}>
        {Array.from({length: SKELETON_ROWS}).map((_, index) => (
            <Box key={`skeleton-row-${index}`} sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 1.25, mb: 1, borderRadius: '12px',
                background: 'rgba(76, 210, 255, 0.04)', border: '1px solid rgba(76, 210, 255, 0.08)',
                animation: 'episodes-skeleton-stagger 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${index * 40}ms`,
            }}>
                <Skeleton id={`episodes-drawer-skeleton-num-${index}`} width={28} height={18} borderRadius={6}/>
                <Skeleton id={`episodes-drawer-skeleton-thumb-${index}`} width={120} height={68} borderRadius={10}/>
                <Box sx={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75}}>
                    <Skeleton id={`episodes-drawer-skeleton-title-${index}`} width="80%" height={14} borderRadius={6}/>
                    <Skeleton id={`episodes-drawer-skeleton-sub-${index}`} width="40%" height={10} borderRadius={6}/>
                </Box>
            </Box>
        ))}
    </Box>
);
EpisodeListSkeleton.displayName = 'EpisodeListSkeleton';

/**
 * EpisodesDrawer - Library-side episode selector side panel.
 * Uses HoloDrawerHeader, EpisodeRow, EmptyEpisodes, EpisodeListSkeleton sub-components.
 * Visibility driven by mediaStore.isEpisodesDrawerOpen.
 */
const EpisodesDrawer = observer(() => {
    const {
        isEpisodesDrawerOpen, closeEpisodesDrawer, currentShow, currentSeasonEpisodes,
        nowPlayingItem, showFilterPreferences, roomId, isHost, changeWatchTogetherMedia
    } = mediaStore;
    const {t} = useTranslations();
    const paperRef = useRef(null);
    const listRef = useRef(null);
    const hasAnimatedOnceRef = useRef(false);

    if (!currentShow || !nowPlayingItem || !('episode_number' in nowPlayingItem)) return null;

    const currentEpisodeId = nowPlayingItem.id;
    const seasonNumber = nowPlayingItem.season_number;
    const {language: languageFilter, type: typeFilter} = showFilterPreferences.get(currentShow.id) || {};

    const handleSelectEpisode = (episode) => {
        const allVideoUrls = episode.video_urls || [];
        const filteredLinks = allVideoUrls.filter(link =>
            (!languageFilter || link.language.toUpperCase() === languageFilter.toUpperCase()) &&
            (!typeFilter || link.type === typeFilter)
        );
        const firstFilteredLink = filteredLinks[0] || null;
        const episodeToPlay = {
            ...episode, video_urls: allVideoUrls, video_url: firstFilteredLink?.url,
            show_id: currentShow.id, show_title: currentShow.title || currentShow.name || '',
            backdrop_path: currentShow.backdrop_path, season_number: seasonNumber,
        };
        if (roomId && isHost) {
            changeWatchTogetherMedia(episodeToPlay);
            mediaStore.startPlayback(episodeToPlay);
        } else {
            mediaStore.startPlayback(episodeToPlay);
        }
        closeEpisodesDrawer();
    };

    const isSeasonLoading = currentSeasonEpisodes.length === 0 && Boolean(nowPlayingItem?.season_number);
    const isSeasonEmpty = currentSeasonEpisodes.length === 0 && !isSeasonLoading;

    // GSAP entry timeline for the drawer paper (slide-from-right + blur-clear)
    useEffect(() => {
        if (!isEpisodesDrawerOpen) return undefined;
        const paper = paperRef.current;
        if (!paper) return undefined;
        const timeline = gsap.timeline();
        if (reducedMotion()) {
            timeline.fromTo(paper, {autoAlpha: 0}, {autoAlpha: 1, duration: durations.fadeFallback, ease: easings.standard});
        } else {
            timeline.fromTo(paper, {autoAlpha: 0, x: 24, filter: 'blur(6px)'}, {
                autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: durations.med, ease: easings.emphasized,
            });
        }
        return () => timeline.kill();
    }, [isEpisodesDrawerOpen]);

    // One-shot row stagger reveal on first open
    useEffect(() => {
        if (!isEpisodesDrawerOpen || hasAnimatedOnceRef.current || reducedMotion()) {
            hasAnimatedOnceRef.current = true;
            return undefined;
        }
        const list = listRef.current;
        if (!list) return undefined;
        const handle = window.setTimeout(() => {
            const rows = list.querySelectorAll('[data-testid^="episode-row-"]');
            if (rows.length === 0) { hasAnimatedOnceRef.current = true; return; }
            gsap.fromTo(rows, {autoAlpha: 0, y: 12}, {
                autoAlpha: 1, y: 0, duration: durations.med, ease: easings.emphasized, stagger: stagger.row,
            });
            hasAnimatedOnceRef.current = true;
        }, 0);
        return () => window.clearTimeout(handle);
    }, [isEpisodesDrawerOpen, currentSeasonEpisodes.length]);

    return (
        <Drawer
            id="episodes-drawer"
            anchor="right"
            open={isEpisodesDrawerOpen}
            onClose={closeEpisodesDrawer}
            slotProps={{
                paper: {
                    ref: paperRef,
                    className: 'holo-surface',
                    sx: {
                        width: {xs: '85%', sm: 400},
                        background: 'var(--bg-deep)',
                        backgroundImage: 'var(--holo-grad)',
                        borderLeft: '1px solid rgba(76, 210, 255, 0.35)',
                        boxShadow: '0 0 24px rgba(76, 210, 255, 0.3), 0 18px 40px rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(12px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                        paddingTop: 'env(safe-area-inset-top)',
                        paddingBottom: 'env(safe-area-inset-bottom)',
                    }
                }
            }}
            aria-label={t('episodesDrawer.title')}
        >
            <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', position: 'relative'}}>
                <HoloDrawerHeader
                    title={t('episodesDrawer.title')}
                    subtitle={currentShow?.title || currentShow?.name}
                    totalEpisodes={currentSeasonEpisodes.length}
                    onClose={closeEpisodesDrawer}
                />
                <Box sx={{position: 'relative', zIndex: 2, flex: 1, minHeight: 0, overflowY: 'auto'}}>
                    {isSeasonLoading ? (
                        <EpisodeListSkeleton/>
                    ) : isSeasonEmpty ? (
                        <EmptyEpisodes/>
                    ) : (
                        <List id="episodes-drawer-list" ref={listRef} role="region" aria-label="Episode list" sx={{px: 1.5, py: 1}}>
                            {currentSeasonEpisodes.map((episode) => {
                                const hasPlayableLinks = (episode.video_urls || []).some(link =>
                                    (!languageFilter || link.language.toUpperCase() === languageFilter.toUpperCase()) &&
                                    (!typeFilter || link.type === typeFilter)
                                );
                                return (
                                    <EpisodeRow
                                        key={episode.id}
                                        episode={episode}
                                        isCurrent={episode.id === currentEpisodeId}
                                        hasPlayableLinks={hasPlayableLinks}
                                        onPlay={() => handleSelectEpisode(episode)}
                                        seasonNumber={seasonNumber}
                                    />
                                );
                            })}
                        </List>
                    )}
                </Box>
                <ScanlineOverlay id="episodes-drawer-scanline" intensity={0.08}/>
            </Box>
        </Drawer>
    );
});

export default EpisodesDrawer;
