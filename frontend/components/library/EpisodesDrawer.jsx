import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {
    Box,
    CardMedia,
    Drawer,
    IconButton,
    LinearProgress,
    List,
    ListItemButton,
    Stack,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InfoIcon from '@mui/icons-material/Info';

import {gsap} from 'gsap';
import {durations, easings, reducedMotion, stagger} from '../../motion/grammar.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloChip} from '../feedback/HoloChip.jsx';
import {Skeleton} from '../feedback/Skeleton.jsx';
import {ScanlineOverlay} from '../feedback/ScanlineOverlay.jsx';

// Visual recipe used by the holo-themed drawer surfaces. Kept for parity
// with the remote drawer's documented vocabulary, even though the library
// drawer does not currently render any TextField/Select fields.
const holoFieldSx = {
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(76,210,255,0.35)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent-hot)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent)',
        boxShadow: 'var(--edge-glow)',
    },
    '& .MuiInputLabel-root': {
        color: 'var(--text-secondary)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--neon-accent)',
    },
    '& .MuiInputBase-input': {
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
    },
    '& .MuiFormHelperText-root': {
        color: 'var(--text-secondary)',
    },
};

/**
 * HoloDrawerHeader - Drawer header with display typography, neon close
 * button and total-episode HoloChip. Mirrors the remote drawer's header
 * recipe for visual parity.
 */
const HoloDrawerHeader = observer(({title, subtitle, totalEpisodes, onClose}) => {
    const {t} = useTranslations();
    return (
        <Box
            id="episodes-drawer-header"
            data-component="episodes-drawer-header"
            sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: '1px solid rgba(76, 210, 255, 0.18)',
                position: 'relative',
                zIndex: 2,
            }}
        >
            <Box sx={{flex: 1, minWidth: 0}}>
                <Typography
                    sx={{
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        letterSpacing: '0.01em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 12px rgba(76, 210, 255, 0.25)',
                        lineHeight: 1.2,
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        sx={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            mt: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {totalEpisodes > 0 && (
                <HoloChip
                    id="episodes-drawer-total-chip"
                    label={`${totalEpisodes}`}
                    sx={{height: 22, fontSize: '0.65rem'}}
                />
            )}
            <IconButton
                id="episodes-drawer-close"
                data-testid="episodes-drawer-close"
                aria-label={t('common.close') || 'Close'}
                autoFocus
                onClick={onClose}
                sx={{
                    color: 'var(--neon-accent)',
                    transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1), color 200ms',
                    '&:hover': {
                        color: 'var(--neon-accent-hot)',
                        transform: 'rotate(90deg)',
                    },
                }}
            >
                <CloseIcon/>
            </IconButton>
        </Box>
    );
});
HoloDrawerHeader.displayName = 'HoloDrawerHeader';

/**
 * EpisodeRow - A single episode entry in the drawer.
 *
 * Visual:
 *  - 120x68 thumbnail with optional CardMedia / TheatersIcon fallback
 *  - LinearProgress for partial-watch (cyan)
 *  - CheckCircleIcon overlay (cyan) when fully watched
 *  - "now playing" indicator: cyan left border + PlayArrowIcon + bold number
 *  - Title in 'Space Grotesk', season row in 'Inter'
 *  - HoloChip per available language (e.g. "EN DUB", "IT SUB")
 *  - Runtime suffix appended to the season row
 *
 * Interactions:
 *  - Tap (when hasPlayableLinks and swipeX === 0) -> onPlay()
 *  - Touch swipe left -> reveals holo action panel (markWatched / details)
 *  - On sm+ the same two actions appear as compact icon buttons that
 *    fade in on hover/focus
 */
const EpisodeRow = observer(({
                                 episode,
                                 isCurrent,
                                 hasPlayableLinks,
                                 onPlay,
                                 seasonNumber
                             }) => {
    const {episodeProgress, toggleEpisodeWatchedStatus} = mediaStore;
    const {t} = useTranslations();
    const [swipeX, setSwipeX] = useState(0);
    const [startX, setStartX] = useState(0);
    const cardRef = useRef(null);
    const progress = episodeProgress.get(episode.id);
    const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
    const isWatched = progress?.watched;

    // Get available languages from video_urls
    const availableLanguages = episode.video_urls?.map(link => ({
        lang: link.language,
        type: link.type // 'dub' or 'sub'
    })) || [];

    // Deduplicate languages (check both lang AND type to keep dub AND sub)
    const uniqueLanguages = availableLanguages.reduce((acc, {lang, type}) => {
        if (!acc.find(l => l.lang === lang && l.type === type)) {
            acc.push({lang, type});
        }
        return acc;
    }, []);

    const handleTouchStart = (e) => {
        setStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        // Only allow left swipe (negative diff) to reveal actions on the right
        if (diff < 0) {
            setSwipeX(Math.max(diff, -120)); // Limit swipe distance
        }
    };

    const handleTouchEnd = () => {
        // If swiped more than 50px, keep it open
        if (swipeX < -50) {
            setSwipeX(-120); // Full reveal
        } else {
            setSwipeX(0); // Close
        }
    };

    const handleCloseSwipe = () => {
        setSwipeX(0);
    };

    const handleToggleWatched = (e) => {
        e.stopPropagation();
        toggleEpisodeWatchedStatus(episode.id);
        handleCloseSwipe();
    };

    const handleShowDetails = (e) => {
        e.stopPropagation();
        // Close the drawer so the modal's zIndex (2200) cleanly overlays
        mediaStore.closeEpisodesDrawer();
        mediaStore.openEpisodeInfoModal(episode, seasonNumber, uniqueLanguages);
        handleCloseSwipe();
    };

    const seasonLabel = t('episodesDrawer.season', {number: seasonNumber});
    const subParts = [seasonLabel];
    if (episode.runtime) {
        subParts.push(`${episode.runtime} min`);
    }
    const subText = subParts.join(' \u00b7 ');

    return (
        <Box
            data-testid={`episode-row-${episode.id}`}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                mb: 1,
                borderLeft: isCurrent ? '2px solid var(--neon-accent)' : '2px solid transparent',
                transition: 'border-color 180ms cubic-bezier(0.22,1,0.36,1)',
            }}
        >
            {/* Swipe action buttons revealed on swipe left (touch) */}
            <Box
                data-component="episodes-drawer-swipe-actions"
                sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-glass)',
                    borderLeft: '1px solid rgba(76, 210, 255, 0.35)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    transform: swipeX < -20 ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.2s ease-out',
                    zIndex: 1,
                }}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    aria-label={isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                    onClick={handleToggleWatched}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        cursor: 'pointer',
                        color: 'var(--neon-accent)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                        '&:hover': {
                            background: 'rgba(76, 210, 255, 0.10)',
                            color: 'var(--neon-accent-hot)',
                        },
                    }}
                >
                    {isWatched ? <RemoveCircleOutlineIcon fontSize="small"/> : <CheckCircleIcon fontSize="small"/>}
                    {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                </Box>
                <Box
                    role="button"
                    tabIndex={0}
                    aria-label={t('episodesDrawer.details')}
                    onClick={handleShowDetails}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        cursor: 'pointer',
                        color: 'var(--neon-accent)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        borderTop: '1px solid rgba(76, 210, 255, 0.18)',
                        transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                        '&:hover': {
                            background: 'rgba(76, 210, 255, 0.10)',
                            color: 'var(--neon-accent-hot)',
                        },
                    }}
                >
                    <InfoIcon fontSize="small"/>
                    {t('episodesDrawer.details')}
                </Box>
            </Box>

            {/* Episode card content */}
            <Box
                ref={cardRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (hasPlayableLinks && swipeX === 0) {
                        onPlay();
                    } else {
                        handleCloseSwipe();
                    }
                }}
                sx={{
                    transform: `translateX(${swipeX}px)`,
                    transition: swipeX < -20 ? 'none' : 'transform 0.2s ease-out',
                    cursor: hasPlayableLinks ? 'pointer' : 'default',
                }}
            >
                <ListItemButton
                    selected={isCurrent}
                    disabled={!hasPlayableLinks}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={`Episode ${episode.episode_number}: ${episode.name}`}
                    sx={{
                        gap: 2,
                        p: 1.25,
                        borderRadius: '12px',
                        opacity: hasPlayableLinks ? 1 : 0.45,
                        background: isCurrent ? 'rgba(76, 210, 255, 0.10)' : 'transparent',
                        transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), transform 180ms cubic-bezier(0.22,1,0.36,1)',
                        '&:hover': {
                            background: 'rgba(76, 210, 255, 0.06)',
                            transform: 'translateX(2px)',
                        },
                        '&.Mui-selected': {
                            background: 'rgba(76, 210, 255, 0.10)',
                        },
                        '&.Mui-selected:hover': {
                            background: 'rgba(76, 210, 255, 0.16)',
                        },
                    }}
                >
                    {/* Left column: episode number + optional now-playing icon */}
                    <Box
                        sx={{
                            minWidth: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            alignSelf: 'center',
                            gap: 0.25,
                        }}
                    >
                        {isCurrent && (
                            <PlayArrowIcon
                                sx={{
                                    fontSize: '1.1rem',
                                    color: 'var(--neon-accent)',
                                    filter: 'drop-shadow(0 0 6px rgba(76, 210, 255, 0.55))',
                                }}
                            />
                        )}
                        <Typography
                            sx={{
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                fontWeight: isCurrent ? 700 : 500,
                                fontSize: '0.95rem',
                                color: isCurrent ? 'var(--neon-accent)' : 'var(--text-secondary)',
                                lineHeight: 1.1,
                            }}
                        >
                            {episode.episode_number}
                        </Typography>
                    </Box>

                    {/* Thumbnail */}
                    <Box
                        sx={{
                            position: 'relative',
                            width: 120,
                            height: 68,
                            flexShrink: 0,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background: 'rgba(76, 210, 255, 0.06)',
                        }}
                    >
                        {episode.still_path ? (
                            <CardMedia
                                component="img"
                                image={episode.still_path}
                                alt={episode.name}
                                sx={{width: '100%', height: '100%', objectFit: 'cover'}}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <TheatersIcon sx={{fontSize: '2rem', opacity: 0.6}}/>
                            </Box>
                        )}
                        {watchedPercentage > 0 && !isWatched && (
                            <LinearProgress
                                variant="determinate"
                                value={watchedPercentage}
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    background: 'rgba(76, 210, 255, 0.12)',
                                    '& .MuiLinearProgress-bar': {
                                        background: 'var(--neon-accent)',
                                    },
                                }}
                            />
                        )}
                        {isWatched && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.55)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CheckCircleIcon
                                    sx={{
                                        fontSize: '2rem',
                                        color: 'var(--neon-accent)',
                                        filter: 'drop-shadow(0 0 6px rgba(76, 210, 255, 0.5))',
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    {/* Right column: title + meta + language chips + inline actions */}
                    <Box sx={{flex: 1, minWidth: 0, pr: {xs: 0, sm: 7}}}>
                        <Typography
                            sx={{
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.25,
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {episode.name}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                mt: 0.5,
                            }}
                        >
                            {subText}
                        </Typography>
                        {uniqueLanguages.length > 0 && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{mt: 0.75, flexWrap: 'wrap', gap: 0.5}}
                            >
                                {uniqueLanguages.map(({lang, type}) => (
                                    <HoloChip
                                        key={`${lang}-${type}`}
                                        label={`${lang.toUpperCase()} ${type === 'dub' ? 'DUB' : 'SUB'}`}
                                        sx={{height: 20, fontSize: '0.6rem'}}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>

                    {/* Desktop-only inline action icon buttons (fade in on hover/focus) */}
                    <Box
                        data-component="episodes-drawer-inline-actions"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: {xs: 'none', sm: 'flex'},
                            flexDirection: 'column',
                            gap: 0.5,
                            opacity: 0,
                            transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)',
                            '.MuiListItemButton-root:hover &, & :focus-visible, &:focus-within': {
                                opacity: 1,
                            },
                        }}
                    >
                        <IconButton
                            size="small"
                            aria-label={isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                            onClick={handleToggleWatched}
                            sx={{
                                color: 'var(--neon-accent)',
                                background: 'rgba(76, 210, 255, 0.08)',
                                '&:hover': {
                                    background: 'rgba(76, 210, 255, 0.18)',
                                    color: 'var(--neon-accent-hot)',
                                },
                            }}
                        >
                            {isWatched ? <RemoveCircleOutlineIcon fontSize="small"/> : <CheckCircleIcon fontSize="small"/>}
                        </IconButton>
                        <IconButton
                            size="small"
                            aria-label={t('episodesDrawer.details')}
                            onClick={handleShowDetails}
                            sx={{
                                color: 'var(--neon-accent)',
                                background: 'rgba(76, 210, 255, 0.08)',
                                '&:hover': {
                                    background: 'rgba(76, 210, 255, 0.18)',
                                    color: 'var(--neon-accent-hot)',
                                },
                            }}
                        >
                            <InfoIcon fontSize="small"/>
                        </IconButton>
                    </Box>
                </ListItemButton>
            </Box>
        </Box>
    );
});
EpisodeRow.displayName = 'EpisodeRow';

const SKELETON_ROWS = 6;

/**
 * EpisodeListSkeleton - Six shimmering row placeholders shown while the
 * season episodes are still being loaded.
 */
const EpisodeListSkeleton = () => {
    return (
        <Box
            data-component="episodes-drawer-skeleton"
            sx={{position: 'relative', zIndex: 2, p: 1.5}}
        >
            {Array.from({length: SKELETON_ROWS}).map((_, index) => (
                <Box
                    key={`skeleton-row-${index}`}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.25,
                        mb: 1,
                        borderRadius: '12px',
                        background: 'rgba(76, 210, 255, 0.04)',
                        border: '1px solid rgba(76, 210, 255, 0.08)',
                        animation: 'episodes-skeleton-stagger 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
                        animationDelay: `${index * 40}ms`,
                    }}
                >
                    <Skeleton
                        id={`episodes-drawer-skeleton-num-${index}`}
                        width={28}
                        height={18}
                        borderRadius={6}
                    />
                    <Skeleton
                        id={`episodes-drawer-skeleton-thumb-${index}`}
                        width={120}
                        height={68}
                        borderRadius={10}
                    />
                    <Box sx={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75}}>
                        <Skeleton
                            id={`episodes-drawer-skeleton-title-${index}`}
                            width="80%"
                            height={14}
                            borderRadius={6}
                        />
                        <Skeleton
                            id={`episodes-drawer-skeleton-sub-${index}`}
                            width="40%"
                            height={10}
                            borderRadius={6}
                        />
                    </Box>
                </Box>
            ))}
        </Box>
    );
};
EpisodeListSkeleton.displayName = 'EpisodeListSkeleton';

/**
 * EpisodeEmptyState - Centered icon + copy shown when a season is known
 * to have no episodes.
 */
const EpisodeEmptyState = observer(() => {
    const {t} = useTranslations();
    return (
        <Box
            data-component="episodes-drawer-empty"
            sx={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 6,
                px: 3,
                textAlign: 'center',
            }}
        >
            <Box
                sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--holo-grad)',
                    border: '1px solid rgba(76, 210, 255, 0.35)',
                    boxShadow: '0 0 18px rgba(76, 210, 255, 0.3)',
                }}
            >
                <TheatersIcon
                    sx={{fontSize: '2rem', color: 'var(--neon-accent)'}}
                />
            </Box>
            <Typography
                sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    maxWidth: 260,
                }}
            >
                {t('episodesDrawer.empty')}
            </Typography>
        </Box>
    );
});
EpisodeEmptyState.displayName = 'EpisodeEmptyState';

/**
 * EpisodesDrawer - Library-side episode selector side panel.
 *
 * Reads its state from `mediaStore` (zero props). Renders a holographic
 * right-anchored Drawer with:
 *  - GSAP slide-from-right + blur-clear entry timeline
 *  - HoloDrawerHeader with the show name and total episode HoloChip
 *  - EpisodeRow items with thumbnail, language chips, progress, watched
 *    badge, and a "now playing" indicator
 *  - Touch swipe-reveal action panel (mark watched / details)
 *  - Desktop hover-reveal inline icon buttons (same actions)
 *  - Skeleton loading state while the season is being resolved
 *  - Empty state when the season is known to be empty
 *  - Reduced-motion fallback collapsing the entry + stagger to a fade
 *
 * Public contract: no props, default export. Consumers render
 * `<EpisodesDrawer />` once; the visibility is driven by
 * `mediaStore.isEpisodesDrawerOpen`.
 */
const EpisodesDrawer = observer(() => {
    const {
        isEpisodesDrawerOpen,
        closeEpisodesDrawer,
        currentShow,
        currentSeasonEpisodes,
        nowPlayingItem,
        showFilterPreferences,
        roomId,
        isHost,
        changeWatchTogetherMedia
    } = mediaStore;
    const {t} = useTranslations();
    const paperRef = useRef(null);
    const listRef = useRef(null);
    const hasAnimatedOnceRef = useRef(false);

    if (!currentShow || !nowPlayingItem || !('episode_number' in nowPlayingItem)) {
        return null;
    }

    const currentEpisodeId = nowPlayingItem.id;
    const seasonNumber = nowPlayingItem.season_number;

    const currentPreferences = showFilterPreferences.get(currentShow.id) || {};
    const languageFilter = currentPreferences.language;
    const typeFilter = currentPreferences.type;

    const handleSelectEpisode = (episode) => {
        // Get ALL video_urls for the episode (not filtered) so VideoPlayer can show pickers
        const allVideoUrls = episode.video_urls || [];

        // Apply user filter preferences to determine which URL to play
        const filteredLinks = allVideoUrls.filter(link => {
            const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
            const typeMatch = !typeFilter || (link.type === typeFilter);
            return langMatch && typeMatch;
        });

        // Extract video_url from the first filtered link for playback
        const firstFilteredLink = filteredLinks.length > 0 ? filteredLinks[0] : null;
        const episodeToPlay = {
            ...episode,
            video_urls: allVideoUrls, // Pass ALL links so VideoPlayer can show language/type pickers
            video_url: firstFilteredLink?.url, // Use first filtered link's URL for playback
            show_id: currentShow.id,
            show_title: currentShow.title || currentShow.name || '',
            backdrop_path: currentShow.backdrop_path,
            season_number: seasonNumber,
        };

        // If we're in Watch Together mode and are the host, use changeWatchTogetherMedia
        // to broadcast the episode change to all clients, then start playback
        if (roomId && isHost) {
            changeWatchTogetherMedia(episodeToPlay);
            // Host also needs to start playback locally
            mediaStore.startPlayback(episodeToPlay);
        } else {
            mediaStore.startPlayback(episodeToPlay);
        }

        closeEpisodesDrawer();
    };

    const isSeasonLoading =
        currentSeasonEpisodes.length === 0 &&
        Boolean(nowPlayingItem && 'season_number' in nowPlayingItem);
    const isSeasonEmpty =
        currentSeasonEpisodes.length === 0 && !isSeasonLoading;

    // GSAP entry timeline for the drawer paper (slide-from-right + blur-clear)
    useEffect(() => {
        if (!isEpisodesDrawerOpen) {
            return undefined;
        }
        const paper = paperRef.current;
        if (!paper) {
            return undefined;
        }
        const timeline = gsap.timeline();
        if (reducedMotion()) {
            timeline.fromTo(
                paper,
                {autoAlpha: 0},
                {autoAlpha: 1, duration: durations.fadeFallback, ease: easings.standard}
            );
        } else {
            timeline.fromTo(
                paper,
                {autoAlpha: 0, x: 24, filter: 'blur(6px)'},
                {
                    autoAlpha: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    duration: durations.med,
                    ease: easings.emphasized,
                }
            );
        }
        return () => {
            timeline.kill();
        };
    }, [isEpisodesDrawerOpen]);

    // One-shot row stagger reveal on first open. The stagger is skipped
    // under reduced motion (each row is already at rest via the entry
    // timeline + the parent transition).
    useEffect(() => {
        if (!isEpisodesDrawerOpen) {
            return undefined;
        }
        if (hasAnimatedOnceRef.current) {
            return undefined;
        }
        if (reducedMotion()) {
            hasAnimatedOnceRef.current = true;
            return undefined;
        }
        const list = listRef.current;
        if (!list) {
            return undefined;
        }
        // Defer one tick so the rows are in the DOM.
        const handle = window.setTimeout(() => {
            const rows = list.querySelectorAll('[data-testid^="episode-row-"]');
            if (rows.length === 0) {
                hasAnimatedOnceRef.current = true;
                return;
            }
            gsap.fromTo(
                rows,
                {autoAlpha: 0, y: 12},
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: durations.med,
                    ease: easings.emphasized,
                    stagger: stagger.row,
                }
            );
            hasAnimatedOnceRef.current = true;
        }, 0);
        return () => {
            window.clearTimeout(handle);
        };
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
                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                    }}
                >
                    {isSeasonLoading ? (
                        <EpisodeListSkeleton/>
                    ) : isSeasonEmpty ? (
                        <EpisodeEmptyState/>
                    ) : (
                        <List
                            id="episodes-drawer-list"
                            ref={listRef}
                            role="region"
                            aria-label="Episode list"
                            sx={{px: 1.5, py: 1}}
                        >
                            {currentSeasonEpisodes.map((episode) => {
                                const hasPlayableLinks = (episode.video_urls || []).some(link => {
                                    const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
                                    const typeMatch = !typeFilter || (link.type === typeFilter);
                                    return langMatch && typeMatch;
                                });

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
