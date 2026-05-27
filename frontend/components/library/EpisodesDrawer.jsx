import React, {useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import {mediaStore} from '../../store/mediaStore.js';
import {
    Box,
    Button,
    CardMedia,
    Chip,
    Drawer,
    IconButton,
    LinearProgress,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InfoIcon from '@mui/icons-material/Info';

import {useTranslations} from '../../hooks/useTranslations.js';

const SwipeableEpisodeCard = observer(({
                                                                                episode,
                                                                                isCurrentEpisode,
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
        mediaStore.closeEpisodesDrawer();
        mediaStore.openEpisodeInfoModal(episode, seasonNumber, uniqueLanguages);
        handleCloseSwipe();
    };

    return (
        <>
            <Box sx={{position: 'relative', overflow: 'hidden', borderRadius: 1, mb: 1}}>
                {/* Swipe action buttons revealed on swipe left */}
                <Box sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'rgba(0,0,0,0.8)',
                    transform: swipeX < -20 ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.2s ease-out',
                    zIndex: 1
                }}>
                    <Button
                        size="small"
                        startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                        onClick={handleToggleWatched}
                        sx={{
                            flex: 1,
                            flexDirection: 'column',
                            borderRadius: 0,
                            color: isWatched ? 'warning.main' : 'success.main',
                            '&:hover': {bgcolor: 'rgba(255,255,255,0.1)'}
                        }}
                    >
                        {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<InfoIcon/>}
                        onClick={handleShowDetails}
                        sx={{
                            flex: 1,
                            flexDirection: 'column',
                            borderRadius: 0,
                            color: 'info.main',
                            '&:hover': {bgcolor: 'rgba(255,255,255,0.1)'}
                        }}
                    >
                        {t('episodesDrawer.details')}
                    </Button>
                </Box>

                {/* Episode card content */}
                <Box
                    ref={cardRef}
                    sx={{
                        transform: `translateX(${swipeX}px)`,
                        transition: swipeX < -20 ? 'none' : 'transform 0.2s ease-out',
                        bgcolor: isCurrentEpisode ? 'rgba(255,255,255,0.1)' : 'transparent',
                        borderRadius: 1,
                        cursor: hasPlayableLinks ? 'pointer' : 'default'
                    }}
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
                >
                    {/* Desktop action buttons - visible on larger screens */}
                    <Box sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 90,
                        display: {xs: 'none', sm: 'flex'},
                        flexDirection: 'column',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        borderRadius: 1,
                        zIndex: 1
                    }}>
                        <Button
                            size="small"
                            startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                            onClick={handleToggleWatched}
                            sx={{
                                flex: 1,
                                flexDirection: 'column',
                                borderRadius: 0,
                                color: isWatched ? 'warning.main' : 'success.main',
                                '&:hover': {bgcolor: 'rgba(255,255,255,0.1)'}
                            }}
                        >
                            {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                        </Button>
                        <Button
                            size="small"
                            startIcon={<InfoIcon/>}
                            onClick={handleShowDetails}
                            sx={{
                                flex: 1,
                                flexDirection: 'column',
                                borderRadius: 0,
                                color: 'info.main',
                                '&:hover': {bgcolor: 'rgba(255,255,255,0.1)'}
                            }}
                        >
                            {t('episodesDrawer.details')}
                        </Button>
                    </Box>
                    <ListItemButton
                        selected={isCurrentEpisode}
                        disabled={!hasPlayableLinks}
                        sx={{
                            gap: 2,
                            p: 1,
                            pl: {xs: 1, sm: '100px'},
                            borderRadius: 1,
                            opacity: hasPlayableLinks ? 1 : 0.5,
                            '&.Mui-selected': {
                                bgcolor: 'rgba(255, 255, 255, 0.15)'
                            }
                        }}
                    >
                        <Typography sx={{minWidth: '2.5rem', alignSelf: 'center'}} align="center">
                            {episode.episode_number}
                        </Typography>

                        <Box sx={{
                            position: 'relative',
                            width: 120,
                            height: 68,
                            flexShrink: 0,
                            borderRadius: 1,
                            overflow: 'hidden'
                        }}>
                            {episode.still_path ? (
                                <CardMedia
                                    component="img"
                                    image={episode.still_path}
                                    alt={episode.name}
                                    sx={{width: '100%', height: '100%', objectFit: 'cover'}}
                                />
                            ) : (
                                <Box sx={{
                                    width: '100%', height: '100%',
                                    bgcolor: 'grey.900',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <TheatersIcon color="disabled" sx={{fontSize: '2.5rem'}}/>
                                </Box>
                            )}
                            <Box
                                sx={{
                                    position: 'absolute', inset: 0,
                                    bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    '&:hover': {opacity: 1},
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasPlayableLinks) onPlay();
                                }}
                            >
                                <PlayArrowIcon fontSize="large"/>
                            </Box>
                            {watchedPercentage > 0 && !isWatched && (
                                <LinearProgress variant="determinate" value={watchedPercentage} color="primary"
                                                sx={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 3}}/>
                            )}
                            {isWatched && (
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircleIcon color="success" sx={{fontSize: '2rem'}}/>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{flex: 1, minWidth: 0}}>
                            <ListItemText
                                primary={episode.name}
                                primaryTypographyProps={{
                                    fontWeight: 'bold',
                                    whiteSpace: 'normal',
                                    lineHeight: 1.3,
                                    noWrap: false,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                                secondary={t('episodesDrawer.season', {number: seasonNumber})}
                                secondaryTypographyProps={{mt: 0.5}}
                            />
                            {/* Language availability chips */}
                            {uniqueLanguages.length > 0 && (
                                <Stack direction="row" spacing={0.5} sx={{mt: 0.5, flexWrap: 'wrap', gap: 0.5}}>
                                    {uniqueLanguages.map(({lang, type}) => (
                                        <Chip
                                            key={`${lang}-${type}`}
                                            label={`${lang.toUpperCase()} ${type === 'dub' ? '🔊' : '📝'}`}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.65rem',
                                                bgcolor: type === 'dub' ? 'primary.dark' : 'secondary.dark'
                                            }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </ListItemButton>
                </Box>
            </Box>


        </>
    );
});

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

    return (
        <Drawer
            anchor="right"
            open={isEpisodesDrawerOpen}
            onClose={closeEpisodesDrawer}
            sx={{zIndex: 9999}} // High zIndex to ensure visibility above video player overlay
            PaperProps={{
                sx: {
                    width: {xs: '85%', sm: 400},
                    bgcolor: '#181818',
                }
            }}
        >
            <Box sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <Toolbar sx={{flexWrap: 'wrap', gap: 1}}>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                        {t('episodesDrawer.title')}
                    </Typography>
                    <IconButton edge="end" onClick={closeEpisodesDrawer}>
                        <CloseIcon/>
                    </IconButton>
                </Toolbar>
                <List sx={{overflowY: 'auto', flex: 1, px: 1}}>
                    {currentSeasonEpisodes.map((episode) => {
                        const hasPlayableLinks = (episode.video_urls || []).some(link => {
                            const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
                            const typeMatch = !typeFilter || (link.type === typeFilter);
                            return langMatch && typeMatch;
                        });

                        return (
                            <SwipeableEpisodeCard
                                key={episode.id}
                                episode={episode}
                                isCurrentEpisode={episode.id === currentEpisodeId}
                                hasPlayableLinks={hasPlayableLinks}
                                onPlay={() => handleSelectEpisode(episode)}
                                seasonNumber={seasonNumber}
                            />
                        );
                    })}
                </List>
            </Box>
        </Drawer>
    );
});

export default EpisodesDrawer;



