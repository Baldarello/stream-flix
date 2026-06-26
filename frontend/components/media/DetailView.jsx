import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
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
import TheatersIcon from '@mui/icons-material/Theaters';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import {gsap} from 'gsap';
import {durations, easings, reducedMotion} from '../../motion/grammar.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloChip} from '../feedback/HoloChip.jsx';
import {ScanlineOverlay} from '../feedback/ScanlineOverlay.jsx';
import {DetailHero} from './DetailHero.jsx';
import {DetailBackdrop} from './DetailBackdrop.jsx';
import {DetailDialogs} from './DetailDialogs.jsx';
import {holoFieldSx} from "../../styles/style.js"


// ─── Subcomponent 3: EpisodesFilterBar ────────────────────────────────────
export const EpisodesFilterBar = observer(({
    item, availableLanguages, availableTypes, languageFilter, typeFilter,
    introDuration, selectedSeason, headerRef, onLanguageChange, onTypeChange,
    onIntroDurationChange, onSeasonChange
}) => {
    const {t} = useTranslations();
    return (
        <Box ref={headerRef}
            data-component="episodes-header-row"
            id="episodes-header-row"
            sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                mb: 4, flexWrap: 'wrap', gap: 2}}
        >
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                <Typography variant="h4" component="h2" fontWeight="bold" sx={{
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    color: 'var(--text-primary)', textShadow: '0 0 12px rgba(76, 210, 255, 0.3)'
                }}>{t('detail.episodes')}</Typography>
                <Tooltip title={t('detail.linkEpisodesTooltip')}>
                    <IconButton id="link-episode" className="neon-edge" data-component="link-episode"
                        onClick={() => mediaStore.openLinkEpisodesModal(item)} sx={{
                            color: 'var(--neon-accent)',
                            transition: 'color 200ms ease, box-shadow 200ms ease',
                            '&:hover': {color: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow)'}
                        }}>
                        <LinkIcon/>
                    </IconButton>
                </Tooltip>
            </Box>
            {item.seasons && item.seasons.length > 0 && (
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap'}}>
                    {availableLanguages.length > 1 && (
                        <FormControl sx={{minWidth: 120}} size="small">
                            <InputLabel>{t('detail.filterLanguage')}</InputLabel>
                            <Select value={languageFilter || ''} label={t('detail.filterLanguage')}
                                onChange={(e) => onLanguageChange(item.id, e.target.value)} sx={holoFieldSx}>
                                {availableLanguages.map(lang => <MenuItem key={lang} value={lang}>{lang}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}
                    {availableTypes.length > 1 && (
                        <FormControl sx={{minWidth: 120}} size="small">
                            <InputLabel>{t('detail.filterType')}</InputLabel>
                            <Select value={typeFilter || ''} label={t('detail.filterType')}
                                onChange={(e) => onTypeChange(item.id, e.target.value)} sx={holoFieldSx}>
                                {availableTypes.map(type => <MenuItem key={type} value={type}>{t(`linkEpisodesModal.add.${type}`)}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}
                    <TextField label={t('detail.introDuration')} type="number" variant="outlined" size="small"
                        value={introDuration} onChange={onIntroDurationChange} onFocus={(e) => e.target.select()}
                        sx={{width: 150, ...holoFieldSx}}
                        InputProps={{endAdornment: <InputAdornment position="end">sec</InputAdornment>, inputProps: {min: 0}}}/>
                    <FormControl sx={{minWidth: 120}} size="small">
                        <InputLabel id="season-select-label">{t('detail.season')}</InputLabel>
                        <Select labelId="season-select-label" value={selectedSeason} label={t('detail.season')}
                            onChange={(e) => onSeasonChange(item.id, Number(e.target.value))} sx={holoFieldSx}>
                            {item.seasons.map(season => (
                                <MenuItem key={season.id} value={season.season_number}>{season.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}
        </Box>
    );
});
EpisodesFilterBar.displayName = 'EpisodesFilterBar';

// ─── Subcomponent 4: EpisodeListView ───────────────────────────────────────
export const EpisodeListView = observer(({
    currentSeason, isDetailLoading, languageFilter, typeFilter, item
}) => {
    const {t} = useTranslations();
    if (isDetailLoading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh'}}>
                <CircularProgress sx={{color: 'var(--neon-accent)'}}/>
            </Box>
        );
    }
    return (
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
                            const filteredLinks = allVideoUrls.filter(link => {
                                const langMatch = !languageFilter || (link.language.toUpperCase() === languageFilter.toUpperCase());
                                const typeMatch = !typeFilter || (link.type === typeFilter);
                                return langMatch && typeMatch;
                            });
                            const firstFilteredLink = filteredLinks.length > 0 ? filteredLinks[0] : null;
                            mediaStore.startPlayback({
                                ...episode, video_urls: allVideoUrls, video_url: firstFilteredLink?.url,
                                show_id: item.id, show_title: item.title || item.name || '',
                                backdrop_path: item.backdrop_path, season_number: currentSeason.season_number,
                            });
                        }}
                        seasonNumber={currentSeason.season_number}
                        languageFilter={languageFilter}
                        typeFilter={typeFilter}
                    />
                );
            })}
        </List>
    );
});
EpisodeListView.displayName = 'EpisodeListView';

// ─── SwipeableEpisodeCardDetailView (large subcomponent) ──────────────────
const SwipeableEpisodeCardDetailView = observer(({
 episode, isCurrentEpisode, hasPlayableLinks, onPlay, seasonNumber, languageFilter, typeFilter
}) => {
    const {episodeProgress, toggleEpisodeWatchedStatus, episodeDetailsDialogOpenForEpisodeId,
        openEpisodeDetails, closeEpisodeDetails} = mediaStore;
    const {t} = useTranslations();
    const [swipeX, setSwipeX] = useState(() => 0);
    const [startX, setStartX] = useState(() => 0);
    const cardRef = useRef(null);
    const detailsOpen = episodeDetailsDialogOpenForEpisodeId === episode.id;
    const progress = episodeProgress.get(episode.id);
    const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
    const isWatched = progress?.watched;

    const availableLanguages = episode.video_urls?.map(link => ({lang: link.language, type: link.type})) || [];
    const uniqueLanguages = availableLanguages.reduce((acc, {lang, type}) => {
        if (!acc.find(l => l.lang === lang && l.type === type)) acc.push({lang, type});
        return acc;
    }, []);

    const handleTouchStart = (e) => setStartX(e.touches[0].clientX);
    const handleTouchMove = (e) => {
        const diff = e.touches[0].clientX - startX;
        if (diff < 0) setSwipeX(Math.max(diff, -120));
    };
    const handleTouchEnd = () => setSwipeX(swipeX < -50 ? -120 : 0);
    const handleCloseSwipe = () => setSwipeX(0);
    const handleToggleWatched = (e) => { e.stopPropagation(); toggleEpisodeWatchedStatus(episode.id); handleCloseSwipe(); };
    const handleShowDetails = (e) => { e.stopPropagation(); openEpisodeDetails(episode.id); handleCloseSwipe(); };
    const handleDesktopToggleWatched = (e) => { e.stopPropagation(); toggleEpisodeWatchedStatus(episode.id); };
    const handleDesktopShowDetails = (e) => { e.stopPropagation(); openEpisodeDetails(episode.id); };

    return (
        <>
            <Box id={`episode-card-detail-${episode.id}`} data-component="episode-card-detail" className="holo-surface"
                sx={{position: 'relative', overflow: 'hidden', borderRadius: 2, mb: 1.5,
                    boxShadow: '0 0 14px rgba(76, 210, 255, 0.18)'}}>
                {/* Swipe action buttons */}
                <Box sx={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
                    display: 'flex', flexDirection: 'column', bgcolor: 'var(--bg-deep)',
                    transform: swipeX < -20 ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.2s ease-out', zIndex: 1}}>
                    <Button size="small" startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                        onClick={handleToggleWatched} sx={{
                            flex: 1, flexDirection: 'column', borderRadius: 0,
                            color: isWatched ? 'var(--neon-warn)' : 'var(--neon-accent)',
                            transition: 'transform 200ms ease, color 200ms ease',
                            '&:hover': {bgcolor: 'rgba(76, 210, 255, 0.12)', transform: 'scale(1.1) rotate(-2deg)'}
                        }}>
                        {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                    </Button>
                    <Button size="small" startIcon={<InfoIcon/>} onClick={handleShowDetails} sx={{
                        flex: 1, flexDirection: 'column', borderRadius: 0, color: 'var(--neon-accent)',
                        transition: 'transform 200ms ease, color 200ms ease',
                        '&:hover': {bgcolor: 'rgba(76, 210, 255, 0.12)', transform: 'scale(1.1) rotate(90deg)'}
                    }}>
                        {t('episodesDrawer.details')}
                    </Button>
                </Box>
                {/* Episode card content */}
                <Box ref={cardRef} sx={{
                    transform: `translateX(${swipeX}px)`,
                    transition: swipeX < -20 ? 'none' : 'transform 0.2s ease-out',
                    bgcolor: 'var(--holo-grad)', borderRadius: 2,
                    cursor: hasPlayableLinks ? 'pointer' : 'default'
                }}
                    onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                    onClick={() => hasPlayableLinks && swipeX === 0 ? onPlay() : handleCloseSwipe()}>
                    {/* Desktop action buttons */}
                    <Box sx={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 90,
                        display: {xs: 'none', md: 'flex'}, flexDirection: 'column',
                        bgcolor: 'rgba(0, 0, 0, 0.55)', borderRadius: 2, zIndex: 1}}>
                        <Button size="small" startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                            onClick={handleDesktopToggleWatched} sx={{
                                flex: 1, flexDirection: 'column', borderRadius: 0,
                                color: isWatched ? 'var(--neon-warn)' : 'var(--neon-accent)',
                                transition: 'transform 200ms ease, color 200ms ease',
                                '&:hover': {bgcolor: 'rgba(76, 210, 255, 0.12)', transform: 'scale(1.05) rotate(-3deg)'}
                            }}>
                            {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                        </Button>
                        <Button size="small" startIcon={<InfoIcon/>} onClick={handleDesktopShowDetails} sx={{
                            flex: 1, flexDirection: 'column', borderRadius: 0, color: 'var(--neon-accent)',
                            transition: 'transform 200ms ease, color 200ms ease',
                            '&:hover': {bgcolor: 'rgba(76, 210, 255, 0.12)', transform: 'scale(1.05) rotate(90deg)'}
                        }}>
                            {t('episodesDrawer.details')}
                        </Button>
                    </Box>
                    <ListItemButton disabled={!hasPlayableLinks} sx={{
                        p: 2, pl: {xs: 2, md: '100px'}, borderRadius: 2, opacity: hasPlayableLinks ? 1 : 0.5,
                    }}>
                        <Typography sx={{mr: 2, fontWeight: 'bold', fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            color: 'var(--neon-accent)', textShadow: '0 0 10px rgba(76, 210, 255, 0.4)'}}>
                            {episode.episode_number}
                        </Typography>
                        <Box sx={{position: 'relative', width: 150, aspectRatio: '16/9', mr: 2, flexShrink: 0,
                            overflow: 'hidden', borderRadius: 1}}>
                            {episode.still_path ? (
                                <CardMedia component="img" image={episode.still_path}
                                    alt={`Scena da ${episode.name}`} sx={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                            ) : (
                                <Box sx={{width: '100%', height: '100%', bgcolor: 'rgba(76, 210, 255, 0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <TheatersIcon sx={{fontSize: '3rem', color: 'var(--text-secondary)'}}/>
                                </Box>
                            )}
                            {watchedPercentage > 0 && !isWatched && (
                                <LinearProgress variant="determinate" value={watchedPercentage} color="primary" sx={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4
                                }}/>
                            )}
                            {isWatched && (
                                <Box sx={{position: 'absolute', inset: 0, bgcolor: 'rgba(0, 0, 0, 0.55)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <CheckCircleIcon sx={{fontSize: '3rem', color: 'var(--neon-accent)'}}/>
                                </Box>
                            )}
                        </Box>
                        <ListItemText primary={episode.name} secondary={episode.overview}
                            primaryTypographyProps={{fontWeight: 700, fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                color: 'var(--text-primary)', textShadow: '0 0 10px rgba(76, 210, 255, 0.25)',
                                noWrap: true, textOverflow: 'ellipsis'}}
                            secondaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis',
                                color: 'var(--text-secondary)'}}/>
                    </ListItemButton>
                    <Box data-component="episode-card-detail-languages" sx={{
                        display: 'flex', flexWrap: 'wrap', gap: 0.5, px: 2, pb: 1.5, pl: {xs: 2, md: '100px'}
                    }}>
                        {uniqueLanguages.map(({lang, type}) => (
                            <HoloChip key={`${lang}-${type}`} id={`episode-card-detail-lang-${episode.id}-${lang}-${type}`}
                                label={`${lang.toUpperCase()} ${type === 'dub' ? 'Dubbed' : 'Subtitled'}`}
                                sx={{height: 22, fontSize: '0.65rem'}}/>
                        ))}
                    </Box>
                </Box>
            </Box>
            {/* Episode Details Dialog */}
            <Dialog open={detailsOpen} onClose={closeEpisodeDetails} maxWidth="sm" fullWidth
                slotProps={{paper: {className: 'holo-surface', sx: {
                    zIndex: 1300, position: 'relative', backgroundColor: 'var(--bg-deep)',
                    backgroundImage: 'var(--holo-grad)', color: 'var(--text-primary)',
                    border: '1px solid rgba(76, 210, 255, 0.35)', borderRadius: '14px',
                    boxShadow: '0 0 24px rgba(76, 210, 255, 0.35), 0 24px 60px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden'
                }}}}>
                <DialogTitle sx={{fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 700,
                    color: 'var(--text-primary)', textShadow: '0 0 12px rgba(76, 210, 255, 0.25)'}}>
                    {episode.name}
                    <Typography variant="caption" sx={{display: 'block', color: 'var(--text-secondary)'}}>
                        {t('episodesDrawer.season', {number: seasonNumber})} - {t('episodesDrawer.episode', {number: episode.episode_number})}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{borderColor: 'rgba(76, 210, 255, 0.18)'}}>
                    {episode.overview && (
                        <Typography variant="body2" sx={{mb: 2, color: 'var(--text-primary)'}}>{episode.overview}</Typography>
                    )}
                    <Typography variant="subtitle2" sx={{mt: 2, mb: 1, color: 'var(--text-secondary)'}}>
                        {t('episodesDrawer.availableLanguages')}:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {uniqueLanguages.map(({lang, type}) => (
                            <HoloChip key={`${lang}-${type}`} id={`episode-details-lang-${episode.id}-${lang}-${type}`}
                                label={`${lang.toUpperCase()} ${type === 'dub' ? 'Dubbed' : 'Subtitled'}`}/>
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
                    <Button onClick={closeEpisodeDetails} sx={{color: 'var(--text-secondary)'}}>{t('common.close')}</Button>
                    <Button className="neon-edge" variant="contained"
                        startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <CheckCircleIcon/>}
                        onClick={() => { toggleEpisodeWatchedStatus(episode.id); closeEpisodeDetails(); }}
                        sx={{background: 'var(--neon-accent)', color: 'var(--bg-deep)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 700,
                            '&:hover': {background: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow-hot)'}}}>
                        {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                    </Button>
                </DialogActions>
                <ScanlineOverlay id="episode-details-scanline" intensity={0.1}/>
            </Dialog>
        </>
    );
});
SwipeableEpisodeCardDetailView.displayName = 'SwipeableEpisodeCardDetailView';

// ─── DetailView (composer, <300L) ───────────────────────────────────────────
const DetailView = observer(() => {
    // ponytail: linksRefreshVersion is incremented by _patchCurrentItemVideoUrls
    // so we track it here to force DetailView re-render when links change.
    const {currentSelectedItem: item, myList, isDetailLoading, showIntroDurations, setShowIntroDuration,
        selectedSeasons, setSelectedSeasonForShow, showFilterPreferences, setShowFilterPreference} = mediaStore;
    const linksRefreshVersion = mediaStore.linksRefreshVersion;
    const {t} = useTranslations();
    const headerRef = useRef(null);

    // ponytail: force a re-render when linksRefreshVersion changes so
    // availableLanguages is recomputed with fresh episode.video_urls.
    // This is needed because currentSelectedItem is a non-observable getter,
    // so MobX's observer doesn't propagate the change automatically.
    const [, forceRender] = useState(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { forceRender(v => v + 1); }, [linksRefreshVersion]);


    const getValidSeason = () => {
        if (!item.seasons || item.seasons.length === 0) return 1;
        const storedSeason = selectedSeasons.get(item.id);
        if (storedSeason && item.seasons.some(s => s.season_number === storedSeason)) return storedSeason;
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
        const langSet = new Set(), typeSet = new Set();
        currentSeason.episodes.forEach(ep => (ep.video_urls || []).forEach(link => {
            if (link.language) langSet.add(link.language.toUpperCase());
            if (link.type) typeSet.add(link.type);
        }));
        return {availableLanguages: Array.from(langSet).sort(), availableTypes: Array.from(typeSet).sort()};
    }, [currentSeason, mediaStore.linksRefreshVersion]);

    const currentPreferences = showFilterPreferences.get(item.id) || {};
    const languageFilter = currentPreferences.language && availableLanguages.includes(currentPreferences.language)
        ? currentPreferences.language : availableLanguages[0];
    const typeFilter = currentPreferences.type && availableTypes.includes(currentPreferences.type)
        ? currentPreferences.type : availableTypes[0];

    useEffect(() => {
        if (item && !showFilterPreferences.has(item.id) && currentSeason) {
            const defaultPrefs = {};
            if (availableLanguages.length > 0) defaultPrefs.language = availableLanguages[0];
            if (availableTypes.length > 0) defaultPrefs.type = availableTypes[0];
            if (Object.keys(defaultPrefs).length > 0) setShowFilterPreference(item.id, defaultPrefs);
        }
    }, [item, currentSeason, availableLanguages, availableTypes, showFilterPreferences, setShowFilterPreference]);

    useEffect(() => {
        if (item && !isDetailLoading) mediaStore.checkAndNotifyInvalidLinks(item);
    }, [item, isDetailLoading]);

    useEffect(() => {
        const target = headerRef.current;
        if (!item || !target) return undefined;
        if (reducedMotion()) {
            gsap.fromTo(target, {autoAlpha: 0}, {autoAlpha: 1, duration: durations.fadeFallback, ease: 'none', overwrite: 'auto'});
            return undefined;
        }
        const tl = gsap.timeline();
        tl.fromTo(target, {autoAlpha: 0, scale: 0.96, filter: 'blur(4px)'}, {
            autoAlpha: 1, scale: 1, filter: 'blur(0px)',
            duration: durations.med, ease: easings.emphasized, overwrite: 'auto'
        });
        return () => tl.kill();
    }, [item?.id, currentSeason?.season_number]);

    const handleIntroDurationChange = (event) => {
        const value = event.target.value;
        const duration = parseInt(value, 10);
        if (value === '' || isNaN(duration)) setShowIntroDuration(item.id, 80);
        else if (duration >= 0) setShowIntroDuration(item.id, duration);
    };

    const listActionLabel = isInMyList ? t('detail.removeFromList') : t('detail.addToList');

    const handlePlay = () => {
        if (item.media_type === 'tv' && item.seasons) {
            const firstUnwatchedEpisode = mediaStore.findFirstUnwatchedEpisode(item);
            if (firstUnwatchedEpisode) {
                mediaStore.startPlayback({
                    ...firstUnwatchedEpisode, show_id: item.id,
                    show_title: item.title || item.name || '', backdrop_path: item.backdrop_path,
                    season_number: firstUnwatchedEpisode.season_number,
                });
                return;
            }
        }
        mediaStore.startPlayback(item);
    };

    return (
        <Box id="detail-view" data-component="detail-view"
            sx={{position: 'fixed', inset: 0, zIndex: 1200, animation: 'fadeIn 0.5s ease-in-out'}}>
            <DetailBackdrop backgroundImage={backgroundImage}/>

            <IconButton id="master-remote-detail-close-button" data-component="master-remote-detail-close-button"
                onClick={() => mediaStore.closeDetail()} aria-label={t('detail.close')} sx={{
                    position: 'absolute', top: 16, right: 16, zIndex: 1300,
                    bgcolor: 'rgba(0, 0, 0, 0.5)', color: 'var(--neon-accent)', transform: 'scale(1.2)',
                    transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1), color 200ms ease, background-color 200ms ease',
                    '&:hover': {bgcolor: 'rgba(0, 0, 0, 0.8)', color: 'var(--neon-accent-hot)', transform: 'scale(1.3) rotate(90deg)'}
                }}>
                <CloseIcon/>
            </IconButton>

            <Box data-component="detail-view-scroll" sx={{
                position: 'relative', height: '100%', width: '100%',
                overflowY: 'auto', overflowX: 'hidden', zIndex: 1,
            }}>
                <DetailHero
                    item={item}
                    backgroundImage={backgroundImage}
                    title={title}
                    releaseDate={releaseDate}
                    isInMyList={isInMyList}
                    listActionLabel={listActionLabel}
                    onPlay={handlePlay}
                    onToggleList={() => mediaStore.toggleMyList(item)}
                />

                {item.media_type === 'tv' && (
                    <Box sx={{p: {xs: 2, md: 8}, pt: 0}}>
                        <EpisodesFilterBar item={item}
                            availableLanguages={availableLanguages} availableTypes={availableTypes}
                            languageFilter={languageFilter} typeFilter={typeFilter}
                            introDuration={introDuration} selectedSeason={selectedSeason}
                            headerRef={headerRef}
                            onLanguageChange={(id, val) => setShowFilterPreference(id, {language: val})}
                            onTypeChange={(id, val) => setShowFilterPreference(id, {type: val})}
                            onIntroDurationChange={handleIntroDurationChange}
                            onSeasonChange={setSelectedSeasonForShow}/>
                        <EpisodeListView currentSeason={currentSeason} isDetailLoading={isDetailLoading}
                            languageFilter={languageFilter} typeFilter={typeFilter} item={item}/>
                    </Box>
                )}
            </Box>
            <DetailDialogs />
        </Box>
    );
});
DetailView.displayName = 'DetailView';

export default DetailView;
