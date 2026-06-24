import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../../store/mediaStore.js';
import {remoteStore} from '../../../store/remoteStore.js';
import {
    Box,
    CardMedia,
    Divider,
    Drawer,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
    List,
    ListItem,
    ListItemButton,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import {gsap} from 'gsap';
import {durations, easings, reducedMotion, stagger} from '../../../motion/grammar.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {HoloChip} from '../../feedback/HoloChip.jsx';
import {Skeleton} from '../../feedback/Skeleton.jsx';
import {ScanlineOverlay} from '../../feedback/ScanlineOverlay.jsx';

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

const SeasonSelector = observer(({seasons, value, onChange}) => {
    const {t} = useTranslations();
    return (
        <FormControl fullWidth margin="normal" size="small" sx={holoFieldSx}>
            <InputLabel id="episodes-drawer-season-label">{t('remote.detail.season')}</InputLabel>
            <Select
                labelId="episodes-drawer-season-label"
                value={value ?? ''}
                label={t('remote.detail.season')}
                onChange={onChange}
                sx={{
                    color: 'var(--text-primary)',
                    background: 'var(--bg-glass)',
                    borderRadius: '8px',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            background: 'var(--bg-deep)',
                            backgroundImage: 'var(--holo-grad)',
                            border: '1px solid rgba(76, 210, 255, 0.35)',
                            boxShadow: '0 0 24px rgba(76, 210, 255, 0.3)',
                            color: 'var(--text-primary)',
                        }
                    }
                }}
            >
                {seasons.map(season => (
                    <MenuItem
                        key={season.id}
                        value={season.season_number}
                        sx={{
                            color: 'var(--text-primary)',
                            '&.Mui-selected': {
                                background: 'rgba(76, 210, 255, 0.12)',
                            },
                            '&:hover': {
                                background: 'rgba(76, 210, 255, 0.06)',
                            },
                        }}
                    >
                        {season.name}
                        {season.episodes ? ` · ${season.episodes.length} ep` : ''}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});
SeasonSelector.displayName = 'SeasonSelector';

const IntroDurationField = observer(({value, onChange}) => {
    const {t} = useTranslations();
    return (
        <FormControl fullWidth size="small" sx={holoFieldSx}>
            <TextField
                label={t('remote.player.introDuration')}
                type="number"
                variant="outlined"
                size="small"
                fullWidth
                value={value}
                onChange={onChange}
                onFocus={(event) => event.target.select()}
                InputProps={{
                    endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                    inputProps: {min: 0}
                }}
            />
            <FormHelperText sx={{mx: 0, mt: 0.5}}>
                Default 80 sec
            </FormHelperText>
        </FormControl>
    );
});
IntroDurationField.displayName = 'IntroDurationField';

const EpisodeRow = observer(({
                                 episode,
                                 isCurrent,
                                 seasonNumber,
                                 isPlayable,
                                 onClick,
                             }) => {
    const {episodeProgress} = mediaStore;
    const {t} = useTranslations();
    const progress = episodeProgress.get(episode.id);
    const watchedPercentage = progress && progress.duration > 0
        ? (progress.currentTime / progress.duration) * 100
        : 0;
    const isWatched = progress?.watched;

    const availableLanguages = (episode.video_urls || []).map(link => ({
        lang: link.language,
        type: link.type
    }));
    const uniqueLanguages = availableLanguages.reduce((acc, {lang, type}) => {
        if (!acc.find(l => l.lang === lang && l.type === type)) {
            acc.push({lang, type});
        }
        return acc;
    }, []);

    return (
        <ListItem disablePadding sx={{mb: 0.5}}>
            <ListItemButton
                id={`episode-row-${episode.id}`}
                data-testid={`episode-row-${episode.id}`}
                onClick={onClick}
                selected={isCurrent}
                disabled={!isPlayable}
                aria-current={isCurrent ? 'true' : undefined}
                aria-label={`Episode ${episode.episode_number}: ${episode.name}`}
                sx={{
                    gap: 1.5,
                    p: 1,
                    borderRadius: '10px',
                    borderLeft: isCurrent ? '2px solid var(--neon-accent)' : '2px solid transparent',
                    boxShadow: isCurrent ? 'inset 2px 0 0 var(--neon-accent)' : 'none',
                    background: isCurrent ? 'rgba(76, 210, 255, 0.10)' : 'transparent',
                    transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), transform 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms',
                    opacity: isPlayable ? 1 : 0.45,
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.06)',
                        borderColor: 'var(--neon-accent)',
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
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 28}}>
                    {isCurrent && (
                        <PlayArrowIcon
                            data-testid={`episode-playing-${episode.id}`}
                            sx={{color: 'var(--neon-accent)', fontSize: '1.1rem'}}
                        />
                    )}
                    <Typography
                        component="span"
                        sx={{
                            minWidth: '1.6rem',
                            textAlign: 'center',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? 'var(--neon-accent)' : 'var(--text-secondary)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        }}
                    >
                        {episode.episode_number}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        position: 'relative',
                        width: 120,
                        height: 68,
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
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
                                width: '100%',
                                height: '100%',
                                bgcolor: 'grey.900',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <TheatersIcon sx={{fontSize: '2.5rem', color: 'var(--text-dim)'}}/>
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
                                background: 'rgba(0,0,0,0.5)',
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
                                bgcolor: 'rgba(0,0,0,0.55)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CheckCircleIcon
                                sx={{fontSize: '2rem', color: 'var(--neon-accent)'}}
                            />
                        </Box>
                    )}
                </Box>

                <Box sx={{flex: 1, minWidth: 0}}>
                    <Typography
                        sx={{
                            color: 'var(--text-primary)',
                            fontWeight: isCurrent ? 700 : 500,
                            lineHeight: 1.3,
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {episode.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{color: 'var(--text-secondary)', display: 'block', mt: 0.25}}
                    >
                        {t('remote.detail.season', {number: seasonNumber})}
                        {episode.runtime ? ` · ${episode.runtime} min` : ''}
                    </Typography>
                    {uniqueLanguages.length > 0 && (
                        <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{mt: 0.5, flexWrap: 'wrap', gap: 0.5}}
                        >
                            {uniqueLanguages.map(({lang, type}) => (
                                <HoloChip
                                    key={`${lang}-${type}`}
                                    label={`${lang.toUpperCase()} ${type === 'dub' ? 'DUB' : 'SUB'}`}
                                    sx={{height: 18, fontSize: '0.6rem'}}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            </ListItemButton>
        </ListItem>
    );
});
EpisodeRow.displayName = 'EpisodeRow';

const EpisodeListSkeleton = () => {
    const items = Array.from({length: 6}, (_, idx) => idx);
    return (
        <Box
            id="episodes-drawer-skeleton"
            data-testid="episodes-drawer-skeleton"
            sx={{
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                position: 'relative',
                zIndex: 2,
            }}
        >
            {items.map((idx) => (
                <Box
                    key={idx}
                    sx={{
                        display: 'flex',
                        gap: 1.5,
                        p: 1,
                        borderRadius: '10px',
                        animation: `episodes-skeleton-stagger 0.32s ease ${idx * 0.04}s backwards`,
                    }}
                >
                    <Skeleton id={`episodes-skel-num-${idx}`} width={28} height={18} borderRadius={4}/>
                    <Skeleton id={`episodes-skel-thumb-${idx}`} width={120} height={68} borderRadius={8}/>
                    <Box sx={{flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75}}>
                        <Skeleton
                            id={`episodes-skel-title-${idx}`}
                            width="80%"
                            height={14}
                            borderRadius={4}
                        />
                        <Skeleton
                            id={`episodes-skel-sub-${idx}`}
                            width="40%"
                            height={10}
                            borderRadius={4}
                        />
                    </Box>
                </Box>
            ))}
        </Box>
    );
};
EpisodeListSkeleton.displayName = 'EpisodeListSkeleton';

const EpisodeEmptyState = () => {
    const {t} = useTranslations();
    return (
        <Box
            id="episodes-drawer-empty"
            data-testid="episodes-drawer-empty"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                px: 3,
                gap: 1.5,
                color: 'var(--text-secondary)',
                position: 'relative',
                zIndex: 2,
            }}
        >
            <TheatersIcon sx={{fontSize: '4rem', color: 'var(--text-dim)'}}/>
            <Typography
                sx={{
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {t('episodesDrawer.empty') || 'No episodes available for this season.'}
            </Typography>
        </Box>
    );
};
EpisodeEmptyState.displayName = 'EpisodeEmptyState';

const EpisodesDrawer = observer(({
                                     isOpen,
                                     onClose,
                                     onSelectEpisode,
                                 }) => {
    const {t} = useTranslations();
    const {remoteFullItem, isRemoteFullItemLoading, playRemoteItem} = remoteStore;
    const {showIntroDurations, setShowIntroDuration} = mediaStore;

    const nowPlayingItem = remoteStore.remoteSlaveState?.nowPlayingItem;
    const isEpisode = nowPlayingItem && 'episode_number' in nowPlayingItem;

    const [selectedSeason, setSelectedSeason] = useState(() => undefined);
    const userHasSelectedSeason = useRef(false);

    const paperRef = useRef(null);
    const listRef = useRef(null);
    const hasAnimatedOnceRef = useRef(false);

    // Initialize selectedSeason based on currently playing episode
    useEffect(() => {
        if (!userHasSelectedSeason.current && nowPlayingItem && 'season_number' in nowPlayingItem) {
            setSelectedSeason(nowPlayingItem.season_number);
        }
    }, [nowPlayingItem]);

    // Reset user selection tracking and animation flag when drawer closes
    useEffect(() => {
        if (!isOpen) {
            userHasSelectedSeason.current = false;
            hasAnimatedOnceRef.current = false;
        }
    }, [isOpen]);

    // GSAP entry animation for the paper (slide from right + fade + blur-clear)
    useEffect(() => {
        if (!isOpen) return undefined;
        const paper = paperRef.current;
        if (!paper) return undefined;

        if (reducedMotion()) {
            gsap.fromTo(
                paper,
                {autoAlpha: 0},
                {autoAlpha: 1, duration: durations.fadeFallback, ease: 'none', overwrite: 'auto'}
            );
            return undefined;
        }

        const tl = gsap.timeline();
        tl.fromTo(
            paper,
            {autoAlpha: 0, x: 24, filter: 'blur(6px)'},
            {
                autoAlpha: 1,
                x: 0,
                filter: 'blur(0px)',
                duration: durations.med,
                ease: easings.emphasized,
                overwrite: 'auto',
            }
        );

        return () => tl.kill();
    }, [isOpen]);

    // Row stagger reveal - only on first open per session
    useEffect(() => {
        if (!isOpen) return undefined;
        if (hasAnimatedOnceRef.current) return undefined;
        if (isRemoteFullItemLoading) return undefined;
        if (reducedMotion()) {
            hasAnimatedOnceRef.current = true;
            return undefined;
        }

        const list = listRef.current;
        if (!list) return undefined;

        const items = list.querySelectorAll('[data-testid^="episode-row-"]');
        if (items.length === 0) return undefined;

        const tl = gsap.timeline();
        tl.fromTo(
            items,
            {autoAlpha: 0, y: 12},
            {
                autoAlpha: 1,
                y: 0,
                duration: durations.med,
                ease: easings.standard,
                stagger: stagger.row,
                overwrite: 'auto',
            }
        );

        hasAnimatedOnceRef.current = true;
        return () => tl.kill();
    }, [isOpen, isRemoteFullItemLoading]);

    const handleSeasonChange = (e) => {
        userHasSelectedSeason.current = true;
        setSelectedSeason(Number(e.target.value));
    };

    const handleSelectEpisode = (episode) => {
        if (!remoteFullItem) return;
        const itemToPlay = {
            ...episode,
            show_id: remoteFullItem.id,
            show_title: remoteFullItem.title || remoteFullItem.name || '',
            backdrop_path: remoteFullItem.backdrop_path,
        };
        playRemoteItem(itemToPlay);
        if (onSelectEpisode) onSelectEpisode(episode);
        onClose();
    };

    const introDuration = remoteFullItem ? (showIntroDurations.get(remoteFullItem.id) ?? 80) : 80;

    const handleIntroDurationChange = (event) => {
        const value = event.target.value;
        if (!remoteFullItem) return;
        const duration = parseInt(value, 10);
        if (value === '' || isNaN(duration)) {
            setShowIntroDuration(remoteFullItem.id, 80);
        } else if (duration >= 0) {
            setShowIntroDuration(remoteFullItem.id, duration);
        }
    };

    const currentSeason = remoteFullItem?.seasons?.find(s => s.season_number === selectedSeason);
    const episodes = currentSeason?.episodes ?? [];
    const totalEpisodes = remoteFullItem?.seasons?.reduce(
        (acc, s) => acc + (s.episodes?.length || 0),
        0
    ) ?? 0;
    const showName = remoteFullItem?.title || remoteFullItem?.name || '';

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            id="episodes-drawer"
            aria-label={t('remote.player.episodes') || 'Episodes'}
            slotProps={{
                backdrop: {
                    sx: {
                        pt: 'env(safe-area-inset-top)',
                        pb: 'env(safe-area-inset-bottom)',
                        pl: 'env(safe-area-inset-left)',
                        pr: 'env(safe-area-inset-right)',
                        backgroundColor: 'rgba(5, 6, 13, 0.55)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }
                },
                paper: {
                    ref: paperRef,
                    className: 'episodes-drawer-paper holo-surface',
                    sx: {
                        width: {xs: '85vw', sm: 400, md: 420},
                        pt: 'env(safe-area-inset-top)',
                        pb: 'env(safe-area-inset-bottom)',
                        pr: 'env(safe-area-inset-right)',
                        color: 'var(--text-primary)',
                        background: 'var(--bg-deep)',
                        backgroundImage: 'var(--holo-grad)',
                        borderLeft: '1px solid rgba(76, 210, 255, 0.35)',
                        boxShadow: '0 0 24px rgba(76, 210, 255, 0.3), 0 18px 40px rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(12px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                        overflow: 'hidden',
                    }
                }
            }}
        >
            <HoloDrawerHeader
                title={t('remote.player.episodes')}
                subtitle={showName}
                totalEpisodes={totalEpisodes}
                onClose={onClose}
            />

            <Box sx={{p: 2, position: 'relative', zIndex: 2}}>
                <IntroDurationField value={introDuration} onChange={handleIntroDurationChange}/>
                {remoteFullItem?.seasons && remoteFullItem.seasons.length > 0 && (
                    <SeasonSelector
                        seasons={remoteFullItem.seasons}
                        value={selectedSeason}
                        onChange={handleSeasonChange}
                    />
                )}
            </Box>

            <Divider
                sx={{borderColor: 'rgba(76, 210, 255, 0.18)', position: 'relative', zIndex: 2}}
            />

            {isRemoteFullItemLoading ? (
                <EpisodeListSkeleton/>
            ) : episodes.length === 0 ? (
                <EpisodeEmptyState/>
            ) : (
                <List
                    ref={listRef}
                    role="region"
                    aria-label="Episode list"
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 1.5,
                        position: 'relative',
                        zIndex: 2,
                    }}
                >
                    {episodes.map(episode => {
                        const isPlayable = !!episode.video_url
                            || (episode.video_urls && episode.video_urls.length > 0);
                        return (
                            <EpisodeRow
                                key={episode.id}
                                episode={episode}
                                isCurrent={isEpisode && episode.id === nowPlayingItem.id}
                                isPlayable={isPlayable}
                                seasonNumber={currentSeason?.season_number}
                                onClick={() => handleSelectEpisode(episode)}
                            />
                        );
                    })}
                </List>
            )}

            <ScanlineOverlay id="episodes-drawer-scanline" intensity={0.08}/>
        </Drawer>
    );
});

EpisodesDrawer.displayName = 'EpisodesDrawer';

export default EpisodesDrawer;
