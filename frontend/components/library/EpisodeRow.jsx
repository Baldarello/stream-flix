import React, {useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {Box, CardMedia, ListItemButton, Stack, Typography} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloChip} from '../feedback/HoloChip.jsx';
import {EpisodeProgressRing} from './EpisodeProgressRing.jsx';
import {EpisodeActions, EpisodeSwipeActions} from './EpisodeActions.jsx';

/**
 * EpisodeRow - A single episode entry in the drawer.
 *
 * Visual:
 *  - 120x68 thumbnail with optional CardMedia / TheatersIcon fallback
 *  - 2px progress bar at bottom of thumbnail for partial-watch (cyan)
 *  - EpisodeProgressRing next to duration chip
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
    const [swipeX, setSwipeX] = useState(() => 0);
    const [startX, setStartX] = useState(() => 0);
    const cardRef = useRef(null);
    const progress = episodeProgress.get(episode.id);
    const watchedPercent = progress ? (progress.currentTime / progress.duration) * 100 : 0;
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
    const subText = subParts.join(' · ');

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
                <EpisodeSwipeActions
                    isWatched={isWatched}
                    onToggleWatched={handleToggleWatched}
                    onShowDetails={handleShowDetails}
                    sx={{flex: 1}}
                />
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
                        {/* 2px progress bar at bottom of thumbnail */}
                        {watchedPercent > 0 && !isWatched && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    background: 'rgba(76, 210, 255, 0.12)',
                                }}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: `${watchedPercent}%`,
                                        background: 'var(--neon-accent)',
                                        transition: 'width 200ms cubic-bezier(0.22,1,0.36,1)',
                                    }}
                                />
                            </Box>
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
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 0.5}}>
                            <Typography
                                sx={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {subText}
                            </Typography>
                            {watchedPercent > 0 && !isWatched && (
                                <EpisodeProgressRing progress={watchedPercent} size={32} />
                            )}
                        </Box>
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
                        <EpisodeActions
                            isWatched={isWatched}
                            onToggleWatched={handleToggleWatched}
                            onShowDetails={handleShowDetails}
                        />
                    </Box>
                </ListItemButton>
            </Box>
        </Box>
    );
});

EpisodeRow.displayName = 'EpisodeRow';

export default EpisodeRow;
