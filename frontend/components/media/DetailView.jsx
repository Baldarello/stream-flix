import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import {mediaStore} from '../../store/mediaStore.js';
import {
    Box,
    Button,
    CardMedia,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import LinkEpisodesModal from '../modals/LinkEpisodesModal.jsx';

import {gsap} from 'gsap';
import {durations, easings, reducedMotion} from '../../motion/grammar.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloChip} from '../feedback/HoloChip.jsx';
import {ScanlineOverlay} from '../feedback/ScanlineOverlay.jsx';

// Visual recipe for holo-themed field controls, mirrored from
// EpisodesDrawer.jsx so that the detail screen uses the same palette.
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


const SwipeableEpisodeCardDetailView = observer(({
                                                     episode,
                                                     isCurrentEpisode,
                                                     hasPlayableLinks,
                                                     onPlay,
                                                     seasonNumber,
                                                     languageFilter,
                                                     typeFilter
                                                 }) => {
    const {
        episodeProgress,
        toggleEpisodeWatchedStatus,
        episodeDetailsDialogOpenForEpisodeId,
        openEpisodeDetails,
        closeEpisodeDetails
    } = mediaStore;
    const {t} = useTranslations();
    const [swipeX, setSwipeX] = useState(0);
    const [startX, setStartX] = useState(0);
    const cardRef = useRef(null);
    const detailsOpen = episodeDetailsDialogOpenForEpisodeId === episode.id;
    const progress = episodeProgress.get(episode.id);
    const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
    const isWatched = progress?.watched;

    // Get available languages from video_urls
    const availableLanguages = episode.video_urls?.map(link => ({
        lang: link.language,
        type: link.type
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
        if (diff < 0) {
            setSwipeX(Math.max(diff, -120));
        }
    };

    const handleTouchEnd = () => {
        if (swipeX < -50) {
            setSwipeX(-120);
        } else {
            setSwipeX(0);
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
        openEpisodeDetails(episode.id);
        handleCloseSwipe();
    };

    const handleDesktopToggleWatched = (e) => {
        e.stopPropagation();
        toggleEpisodeWatchedStatus(episode.id);
    };

    const handleDesktopShowDetails = (e) => {
        e.stopPropagation();
        openEpisodeDetails(episode.id);
    };

    return (
        <>
            <Box
                id={`episode-card-detail-${episode.id}`}
                data-component="episode-card-detail"
                className="holo-surface"
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 2,
                    mb: 1.5,
                    boxShadow: '0 0 14px rgba(76, 210, 255, 0.18)'
                }}
            >
                {/* Swipe action buttons */}
                <Box sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'var(--bg-deep)',
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
                            color: isWatched ? 'var(--neon-warn)' : 'var(--neon-accent)',
                            transition: 'transform 200ms ease, color 200ms ease',
                            '&:hover': {
                                bgcolor: 'rgba(76, 210, 255, 0.12)',
                                transform: 'scale(1.1) rotate(-2deg)'
                            }
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
                            color: 'var(--neon-accent)',
                            transition: 'transform 200ms ease, color 200ms ease',
                            '&:hover': {
                                bgcolor: 'rgba(76, 210, 255, 0.12)',
                                transform: 'scale(1.1) rotate(90deg)'
                            }
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
                        bgcolor: 'var(--holo-grad)',
                        borderRadius: 2,
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
                        display: {xs: 'none', md: 'flex'},
                        flexDirection: 'column',
                        bgcolor: 'rgba(0, 0, 0, 0.55)',
                        borderRadius: 2,
                        zIndex: 1
                    }}>
                        <Button
                            size="small"
                            startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                            onClick={handleDesktopToggleWatched}
                            sx={{
                                flex: 1,
                                flexDirection: 'column',
                                borderRadius: 0,
                                color: isWatched ? 'var(--neon-warn)' : 'var(--neon-accent)',
                                transition: 'transform 200ms ease, color 200ms ease',
                                '&:hover': {
                                    bgcolor: 'rgba(76, 210, 255, 0.12)',
                                    transform: 'scale(1.05) rotate(-3deg)'
                                }
                            }}
                        >
                            {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                        </Button>
                        <Button
                            size="small"
                            startIcon={<InfoIcon/>}
                            onClick={handleDesktopShowDetails}
                            sx={{
                                flex: 1,
                                flexDirection: 'column',
                                borderRadius: 0,
                                color: 'var(--neon-accent)',
                                transition: 'transform 200ms ease, color 200ms ease',
                                '&:hover': {
                                    bgcolor: 'rgba(76, 210, 255, 0.12)',
                                    transform: 'scale(1.05) rotate(90deg)'
                                }
                            }}
                        >
                            {t('episodesDrawer.details')}
                        </Button>
                    </Box>
                    <ListItemButton
                        disabled={!hasPlayableLinks}
                        sx={{
                            p: 2,
                            pl: {xs: 2, md: '100px'},
                            borderRadius: 2,
                            opacity: hasPlayableLinks ? 1 : 0.5,
                        }}
                    >
                        <Typography sx={{
                            mr: 2,
                            fontWeight: 'bold',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            color: 'var(--neon-accent)',
                            textShadow: '0 0 10px rgba(76, 210, 255, 0.4)'
                        }}>{episode.episode_number}</Typography>
                        <Box sx={{
                            position: 'relative',
                            width: 150,
                            aspectRatio: '16/9',
                            mr: 2,
                            flexShrink: 0,
                            overflow: 'hidden',
                            borderRadius: 1
                        }}>
                            {episode.still_path ? (
                                <CardMedia
                                    component="img"
                                    image={episode.still_path}
                                    alt={`Scena da ${episode.name}`}
                                    sx={{width: '100%', height: '100%', objectFit: 'cover'}}
                                />
                            ) : (
                                <Box sx={{
                                    width: '100%',
                                    height: '100%',
                                    bgcolor: 'rgba(76, 210, 255, 0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <TheatersIcon sx={{fontSize: '3rem', color: 'var(--text-secondary)'}}/>
                                </Box>
                            )}
                            {watchedPercentage > 0 && !isWatched && (
                                <LinearProgress variant="determinate"
                                                value={watchedPercentage}
                                                color="primary" sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4
                                }}/>
                            )}
                            {isWatched && (
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    bgcolor: 'rgba(0, 0, 0, 0.55)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircleIcon sx={{fontSize: '3rem', color: 'var(--neon-accent)'}}/>
                                </Box>
                            )}
                        </Box>
                        <ListItemText
                            primary={episode.name}
                            secondary={episode.overview}
                            primaryTypographyProps={{
                                fontWeight: 700,
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                color: 'var(--text-primary)',
                                textShadow: '0 0 10px rgba(76, 210, 255, 0.25)',
                                noWrap: true,
                                textOverflow: 'ellipsis'
                            }}
                            secondaryTypographyProps={{
                                noWrap: true,
                                textOverflow: 'ellipsis',
                                color: 'var(--text-secondary)'
                            }}
                        />
                    </ListItemButton>
                    <Box
                        data-component="episode-card-detail-languages"
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            px: 2,
                            pb: 1.5,
                            pl: {xs: 2, md: '100px'}
                        }}
                    >
                        {uniqueLanguages.map(({lang, type}) => (
                            <HoloChip
                                key={`${lang}-${type}`}
                                id={`episode-card-detail-lang-${episode.id}-${lang}-${type}`}
                                label={`${lang.toUpperCase()} ${type === 'dub' ? 'Dubbed' : 'Subtitled'}`}
                                sx={{height: 22, fontSize: '0.65rem'}}
                            />
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Episode Details Dialog */}
            <Dialog
                id={`episode-details-dialog-${episode.id}`}
                data-component="episode-details-dialog"
                open={detailsOpen}
                onClose={closeEpisodeDetails}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        className: 'holo-surface',
                        sx: {
                            zIndex: 1300, // Above DetailView zIndex 1200
                            position: 'relative',
                            backgroundColor: 'var(--bg-deep)',
                            backgroundImage: 'var(--holo-grad)',
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(76, 210, 255, 0.35)',
                            borderRadius: '14px',
                            boxShadow: '0 0 24px rgba(76, 210, 255, 0.35), 0 24px 60px rgba(0, 0, 0, 0.7)',
                            overflow: 'hidden'
                        }
                    }
                }}
            >
                <DialogTitle sx={{
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    textShadow: '0 0 12px rgba(76, 210, 255, 0.25)'
                }}>
                    {episode.name}
                    <Typography variant="caption" sx={{display: 'block', color: 'var(--text-secondary)'}}>
                        {t('episodesDrawer.season', {number: seasonNumber})} - {t('episodesDrawer.episode', {number: episode.episode_number})}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{borderColor: 'rgba(76, 210, 255, 0.18)'}}>
                    {episode.overview && (
                        <Typography variant="body2" sx={{mb: 2, color: 'var(--text-primary)'}}>
                            {episode.overview}
                        </Typography>
                    )}
                    <Typography variant="subtitle2" sx={{mt: 2, mb: 1, color: 'var(--text-secondary)'}}>
                        {t('episodesDrawer.availableLanguages')}:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {uniqueLanguages.map(({lang, type}) => (
                            <HoloChip
                                key={`${lang}-${type}`}
                                id={`episode-details-lang-${episode.id}-${lang}-${type}`}
                                label={`${lang.toUpperCase()} ${type === 'dub' ? 'Dubbed' : 'Subtitled'}`}
                            />
                        ))}
                    </Stack>
                    <Box sx={{mt: 2}}>
                        <Typography variant="subtitle2" sx={{color: 'var(--text-primary)'}}>
                            {t('episodesDrawer.airDate')}: {episode.air_date || 'N/A'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{mt: 1, color: 'var(--text-primary)'}}>
                            {t('episodesDrawer.runtime')}: {episode.runtime || 'N/A'} min
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{borderTop: '1px solid rgba(76, 210, 255, 0.18)'}}>
                    <Button onClick={closeEpisodeDetails} sx={{color: 'var(--text-secondary)'}}>
                        {t('common.close')}
                    </Button>
                    <Button
                        className="neon-edge"
                        variant="contained"
                        startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                        onClick={() => {
                            toggleEpisodeWatchedStatus(episode.id);
                            closeEpisodeDetails();
                        }}
                        sx={{
                            background: 'var(--neon-accent)',
                            color: 'var(--bg-deep)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontWeight: 700,
                            '&:hover': {background: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow-hot)'}
                        }}
                    >
                        {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                    </Button>
                </DialogActions>
                <ScanlineOverlay id="episode-details-scanline" intensity={0.1}/>
            </Dialog>
        </>
    );
});
SwipeableEpisodeCardDetailView.displayName = 'SwipeableEpisodeCardDetailView';

const DetailView = observer(() => {
    const {
        currentSelectedItem: item,
        myList,
        isDetailLoading,
        showIntroDurations,
        setShowIntroDuration,
        episodeProgress,
        selectedSeasons,
        setSelectedSeasonForShow,
        showFilterPreferences,
        setShowFilterPreference
    } = mediaStore;
    const {t} = useTranslations();
    const headerRef = useRef(null);

    if (!item) return null;

    const getValidSeason = () => {
        if (!item.seasons || item.seasons.length === 0) return 1;
        const storedSeason = selectedSeasons.get(item.id);
        if (storedSeason && item.seasons.some(s => s.season_number === storedSeason)) {
            return storedSeason;
        }
        return item.seasons[0].season_number;
    };
    const selectedSeason = getValidSeason();

    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);
    const isInMyList = myList.includes(item.id);

    const introDuration = showIntroDurations.get(item.id) ?? 80;

    const backgroundImage = item.backdrop_path || item.poster_path;

    const {availableLanguages, availableTypes} = useMemo(() => {
        if (!currentSeason) return {availableLanguages: [], availableTypes: []};
        const langSet = new Set();
        const typeSet = new Set();
        currentSeason.episodes.forEach(ep => {
            (ep.video_urls || []).forEach(link => {
                if (link.language) langSet.add(link.language.toUpperCase());
                if (link.type) typeSet.add(link.type);
            });
        });
        return {availableLanguages: Array.from(langSet).sort(), availableTypes: Array.from(typeSet).sort()};
    }, [currentSeason]);

    const currentPreferences = showFilterPreferences.get(item.id) || {};

    const languageFilter = (currentPreferences.language && availableLanguages.includes(currentPreferences.language))
        ? currentPreferences.language
        : availableLanguages[0];

    const typeFilter = (currentPreferences.type && availableTypes.includes(currentPreferences.type))
        ? currentPreferences.type
        : availableTypes[0];

    useEffect(() => {
        // Set initial default preferences in the store if they don't exist for this show
        if (item && !showFilterPreferences.has(item.id) && currentSeason) {
            const defaultPrefs = {};
            if (availableLanguages.length > 0) defaultPrefs.language = availableLanguages[0];
            if (availableTypes.length > 0) defaultPrefs.type = availableTypes[0];
            if (Object.keys(defaultPrefs).length > 0) {
                setShowFilterPreference(item.id, defaultPrefs);
            }
        }
    }, [item, currentSeason, availableLanguages, availableTypes, showFilterPreferences, setShowFilterPreference]);

    // Check for invalid links when show details are loaded
    useEffect(() => {
        if (item && !isDetailLoading) {
            mediaStore.checkAndNotifyInvalidLinks(item);
        }
    }, [item, isDetailLoading]);

    // GSAP entry timeline for the season/episodes header.
    useEffect(() => {
        if (!item) return undefined;
        const target = headerRef.current;
        if (!target) return undefined;
        if (reducedMotion()) {
            gsap.fromTo(target,
                {autoAlpha: 0},
                {autoAlpha: 1, duration: durations.fadeFallback, ease: 'none', overwrite: 'auto'});
            return undefined;
        }
        const tl = gsap.timeline();
        tl.fromTo(target,
            {autoAlpha: 0, scale: 0.96, filter: 'blur(4px)'},
            {
                autoAlpha: 1,
                scale: 1,
                filter: 'blur(0px)',
                duration: durations.med,
                ease: easings.emphasized,
                overwrite: 'auto'
            });
        return () => tl.kill();
    }, [item?.id, currentSeason?.season_number]);


    const handleIntroDurationChange = (event) => {
        const value = event.target.value;
        const duration = parseInt(value, 10);
        if (value === '' || isNaN(duration)) {
            setShowIntroDuration(item.id, 80); // Reset to default
        } else if (duration >= 0) {
            setShowIntroDuration(item.id, duration);
        }
    };

    const listActionLabel = isInMyList ? t('detail.removeFromList') : t('detail.addToList');

    return (
        <Box
            id="detail-view"
            data-component="detail-view"
            sx={{position: 'fixed', inset: 0, zIndex: 1200, animation: 'fadeIn 0.5s ease-in-out'}}
        >
            {backgroundImage ? (
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(20px) brightness(0.5)',
                    transform: 'scale(1.1)',
                }}/>
            ) : (
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'var(--bg-deep)',
                }}/>
            )}

            <IconButton
                id="master-remote-detail-close-button"
                data-component="master-remote-detail-close-button"
                onClick={() => mediaStore.closeDetail()}
                aria-label={t('detail.close')}
                sx={{
                    position: 'absolute', top: 16, right: 16, zIndex: 1300,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'var(--neon-accent)',
                    transform: 'scale(1.2)',
                    transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1), color 200ms ease, background-color 200ms ease',
                    '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        color: 'var(--neon-accent-hot)',
                        transform: 'scale(1.3) rotate(90deg)'
                    }
                }}
            >
                <CloseIcon/>
            </IconButton>

            <Box sx={{position: 'relative', height: '100%', overflowY: 'auto', pt: 'env(safe-area-inset-top)'}}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', md: '350px 1fr'},
                    gap: 4,
                    p: {xs: 2, md: 8},
                    pt: {xs: 8, md: 8},
                    minHeight: '60vh',
                    alignItems: 'center',
                }}>
                    {item.poster_path ? (
                        <CardMedia
                            component="img"
                            image={item.poster_path}
                            alt={title}
                            sx={{
                                width: '100%',
                                maxWidth: '350px',
                                aspectRatio: '2/3',
                                borderRadius: 3,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                justifySelf: 'center',
                            }}
                        />
                    ) : (
                        <Box sx={{
                            width: '100%',
                            maxWidth: '350px',
                            aspectRatio: '2/3',
                            borderRadius: 3,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            justifySelf: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <TheatersIcon color="disabled" sx={{fontSize: '6rem'}}/>
                        </Box>
                    )}
                    <Stack spacing={2} sx={{
                        p: {xs: 2, md: 4},
                        position: 'relative',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-deep)',
                        backgroundImage: 'var(--holo-grad)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(76, 210, 255, 0.25)',
                        boxShadow: '0 0 24px rgba(76, 210, 255, 0.18), 0 18px 48px rgba(0, 0, 0, 0.55)',
                        color: 'var(--text-primary)'
                    }}>
                        {/* FIX: The `alignItems` prop is a system prop and should be passed inside the `sx` object. */}
                        <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                            <Typography variant="h2" component="h1" fontWeight="bold"
                                        sx={{
                                            fontSize: {xs: '2rem', sm: '3.75rem'},
                                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                            color: 'var(--text-primary)',
                                            textShadow: '0 0 14px rgba(76, 210, 255, 0.35)'
                                        }}>{title}</Typography>
                            {item.media_type === 'movie' && (
                                // FIX: (line 198) Wrap IconButton with Tooltip component
                                <Tooltip title={t('detail.linkEpisodesTooltip')}>
                                    {/* FIX: openLinkMovieModal will be added to mediaStore */}
                                    <IconButton
                                        id="link-episode"
                                        className="neon-edge"
                                        data-component="link-episode-movie"
                                        onClick={() => mediaStore.openLinkMovieModal(item)}
                                        sx={{
                                            color: 'var(--neon-accent)',
                                            transition: 'color 200ms ease, box-shadow 200ms ease',
                                            '&:hover': {color: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow)'}
                                        }}
                                    >
                                        <LinkIcon/>
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                        {/* FIX: The `alignItems` prop is a system prop and should be passed inside the `sx` object. */}
                        <Stack direction="row" spacing={3}
                               sx={{alignItems: 'center', fontSize: {xs: '0.8rem', sm: '1rem'}}}>
                            <Typography sx={{color: 'var(--neon-accent)'}}
                                        fontWeight="bold">{t('detail.vote')}: {item.vote_average?.toFixed(1)}</Typography>
                            <Typography
                                sx={{color: 'var(--text-secondary)'}}>{releaseDate?.substring(0, 4)}</Typography>
                            {item.media_type === 'tv' && item.seasons &&
                                <Typography
                                    sx={{color: 'var(--text-secondary)'}}>{item.seasons.length} {t('detail.seasons')}</Typography>}
                        </Stack>
                        <Typography variant="body1" sx={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            fontSize: {xs: '0.85rem', sm: '1rem'},
                            color: 'var(--text-primary)'
                        }}>{item.overview}</Typography>
                        {/* FIX: The `pt` and `alignItems` props are system props and should be passed inside the `sx` object. */}
                        <Stack
                            direction={{xs: 'column', sm: 'row'}}
                            spacing={2}
                            sx={{
                                pt: 2,
                                alignItems: {xs: 'stretch', sm: 'center'}
                            }}
                        >
                            <Button
                                className="neon-edge"
                                variant="contained"
                                startIcon={<PlayArrowIcon/>}
                                size="large"
                                sx={{
                                    bgcolor: 'white',
                                    color: 'black',
                                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                    fontWeight: 700,
                                    '&:hover': {bgcolor: 'white', boxShadow: 'var(--edge-glow-hot)'}
                                }} onClick={() => {
                                // For TV series, find the first unwatched episode
                                if (item.media_type === 'tv' && item.seasons) {
                                    const firstUnwatchedEpisode = mediaStore.findFirstUnwatchedEpisode(item);
                                    if (firstUnwatchedEpisode) {
                                        mediaStore.startPlayback({
                                            ...firstUnwatchedEpisode,
                                            show_id: item.id,
                                            show_title: item.title || item.name || '',
                                            backdrop_path: item.backdrop_path,
                                            season_number: firstUnwatchedEpisode.season_number,
                                        });
                                        return;
                                    }
                                    // All episodes watched - play from first episode
                                }
                                mediaStore.startPlayback(item);
                            }}>
                                {t('detail.play')}
                            </Button>
                            {/* FIX: (line 225) Wrap IconButton with Tooltip component */}
                            <Tooltip title={listActionLabel}>
                                <IconButton
                                    onClick={() => mediaStore.toggleMyList(item)}
                                    aria-label={listActionLabel}
                                    sx={{
                                        border: '2px solid rgba(76, 210, 255, 0.5)',
                                        color: 'var(--neon-accent)',
                                        alignSelf: {xs: 'flex-start'},
                                        width: 48,
                                        height: 48,
                                        '&:hover': {
                                            borderColor: 'var(--neon-accent)',
                                            boxShadow: `0 0 10px var(--neon-accent)`
                                        }
                                    }}
                                >
                                    {isInMyList ? <CheckIcon/> : <AddIcon/>}
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="outlined"
                                startIcon={<GroupIcon/>}
                                size="large"
                                onClick={() => mediaStore.openWatchTogetherModal(item)}
                                sx={{
                                    borderColor: 'rgba(76, 210, 255, 0.5)',
                                    color: 'var(--text-primary)',
                                    '&:hover': {
                                        borderColor: 'var(--neon-accent)',
                                        bgcolor: 'rgba(76, 210, 255, 0.12)',
                                        boxShadow: `0 0 10px var(--neon-accent)`
                                    }
                                }}
                            >
                                {t('detail.watchTogether')}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>

                {item.media_type === 'tv' && (
                    <Box sx={{p: {xs: 2, md: 8}, pt: 0}}>
                        <Box
                            ref={headerRef}
                            data-component="episodes-header-row"
                            id="episodes-header-row"
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 4,
                                flexWrap: 'wrap',
                                gap: 2
                            }}
                        >
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                <Typography variant="h4" component="h2" fontWeight="bold" sx={{
                                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                    color: 'var(--text-primary)',
                                    textShadow: '0 0 12px rgba(76, 210, 255, 0.3)'
                                }}>{t('detail.episodes')}</Typography>
                                {/* FIX: (line 259) Wrap IconButton with Tooltip component */}
                                <Tooltip title={t('detail.linkEpisodesTooltip')}>
                                    <IconButton
                                        id="link-episode"
                                        className="neon-edge"
                                        data-component="link-episode"
                                        onClick={() => mediaStore.openLinkEpisodesModal(item)}
                                        sx={{
                                            color: 'var(--neon-accent)',
                                            transition: 'color 200ms ease, box-shadow 200ms ease',
                                            '&:hover': {color: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow)'}
                                        }}
                                    >
                                        <LinkIcon/>
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            {item.seasons && item.seasons.length > 0 && (
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'}}>
                                    {availableLanguages.length > 1 && (
                                        <FormControl sx={{minWidth: 120}} size="small">
                                            {/* FIX: (line 269) Pass label text as children to InputLabel */}
                                            <InputLabel>{t('detail.filterLanguage')}</InputLabel>
                                            <Select
                                                value={languageFilter || ''}
                                                label={t('detail.filterLanguage')}
                                                onChange={(e) => setShowFilterPreference(item.id, {language: e.target.value})}
                                                sx={holoFieldSx}
                                            >
                                                {availableLanguages.map(lang => <MenuItem key={lang}
                                                                                          value={lang}>{lang}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                    {availableTypes.length > 1 && (
                                        <FormControl sx={{minWidth: 120}} size="small">
                                            {/* FIX: (line 277) Pass label text as children to InputLabel */}
                                            <InputLabel>{t('detail.filterType')}</InputLabel>
                                            <Select
                                                value={typeFilter || ''}
                                                label={t('detail.filterType')}
                                                onChange={(e) => setShowFilterPreference(item.id, {type: e.target.value})}
                                                sx={holoFieldSx}
                                            >
                                                {availableTypes.map(type => <MenuItem key={type}
                                                                                      value={type}>{t(`linkEpisodesModal.add.${type}`)}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                    <TextField
                                        label={t('detail.introDuration')}
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        value={introDuration}
                                        onChange={handleIntroDurationChange}
                                        onFocus={(event) => event.target.select()}
                                        sx={{width: 150, ...holoFieldSx}}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                                            inputProps: {min: 0}
                                        }}
                                    />
                                    <FormControl sx={{minWidth: 120}} size="small">
                                        {/* FIX: (line 298) Pass label text as children to InputLabel */}
                                        <InputLabel id="season-select-label">{t('detail.season')}</InputLabel>
                                        <Select
                                            labelId="season-select-label"
                                            value={selectedSeason}
                                            label={t('detail.season')}
                                            onChange={(e) => setSelectedSeasonForShow(item.id, Number(e.target.value))}
                                            sx={holoFieldSx}
                                        >
                                            {item.seasons.map(season => (
                                                <MenuItem key={season.id} value={season.season_number}>
                                                    {season.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            )}
                        </Box>
                        {isDetailLoading ? (
                            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh'}}>
                                <CircularProgress sx={{color: 'var(--neon-accent)'}}/>
                            </Box>
                        ) : (
                            <List className="scanline" sx={{px: 2}}>
                                {(currentSeason?.episodes || []).map((episode) => {
                                    const hasPlayableLinks = (episode.video_urls || []).some(link => {
                                        const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
                                        const typeMatch = !typeFilter || (link.type === typeFilter);
                                        return langMatch && typeMatch;
                                    });

                                    return (
                                        <SwipeableEpisodeCardDetailView
                                            key={episode.id}
                                            episode={episode}
                                            isCurrentEpisode={false}
                                            hasPlayableLinks={hasPlayableLinks}
                                            onPlay={() => {
                                                const allVideoUrls = episode.video_urls || [];

                                                // Apply user filter preferences to determine which URL to play
                                                const filteredLinks = allVideoUrls.filter(link => {
                                                    const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
                                                    const typeMatch = !typeFilter || (link.type === typeFilter);
                                                    return langMatch && typeMatch;
                                                });

                                                // Get the first filtered link for playback
                                                const firstFilteredLink = filteredLinks.length > 0 ? filteredLinks[0] : null;

                                                mediaStore.startPlayback({
                                                    ...episode,
                                                    video_urls: allVideoUrls, // Pass ALL links so VideoPlayer can show language/type pickers
                                                    video_url: firstFilteredLink?.url, // Use first filtered link's URL for playback
                                                    show_id: item.id,
                                                    show_title: item.title || item.name || '',
                                                    backdrop_path: item.backdrop_path,
                                                    season_number: currentSeason.season_number,
                                                });
                                            }}
                                            seasonNumber={currentSeason.season_number}
                                            languageFilter={languageFilter}
                                            typeFilter={typeFilter}
                                        />
                                    );
                                })}
                            </List>
                        )}
                    </Box>
                )}
            </Box>
            <LinkEpisodesModal/>
        </Box>
    );
});
DetailView.displayName = 'DetailView';

export default DetailView;
