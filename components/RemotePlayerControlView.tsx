
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, IconButton, Stack, CircularProgress, List, ListItem, ListItemButton, ListItemText, AppBar, Toolbar, FormControl, Select, MenuItem, InputLabel, Button, Drawer, Divider, TextField, Slider, InputAdornment } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CloseIcon from '@mui/icons-material/Close';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import type { Episode, PlayableItem } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
        return '00:00';
    }
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
};


const RemotePlayerControlView = observer(() => {
    const { remoteSlaveState, sendRemoteCommand, stopRemotePlayback, remoteFullItem, isRemoteFullItemLoading, remoteNextEpisode, remotePreviousEpisode, playRemoteItem } = mediaStore;
    const { t } = useTranslations();
    const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);
    const [isEpisodesDrawerOpen, setIsEpisodesDrawerOpen] = useState(false);

    const nowPlayingItem = remoteSlaveState?.nowPlayingItem;

    useEffect(() => {
        mediaStore.fetchRemoteFullItem();
    }, [nowPlayingItem?.id]);

    useEffect(() => {
        if (nowPlayingItem && 'season_number' in nowPlayingItem) {
            setSelectedSeason(nowPlayingItem.season_number);
        } else {
            setSelectedSeason(undefined);
        }
    }, [nowPlayingItem]);


    if (!nowPlayingItem) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <Typography>Nessun contenuto in riproduzione.</Typography>
            </Box>
        );
    }
    
    const isPlaying = remoteSlaveState?.isPlaying ?? false;
    const isIntroSkippable = remoteSlaveState?.isIntroSkippable ?? false;
    const isEpisode = 'episode_number' in nowPlayingItem;
    
    const title = isEpisode ? nowPlayingItem.show_title : (nowPlayingItem.title || nowPlayingItem.name);
    const episodeTitle = isEpisode ? `S${String(nowPlayingItem.season_number).padStart(2,'0')}E${String(nowPlayingItem.episode_number).padStart(2,'0')}: ${nowPlayingItem.name}` : t('remote.player.nowPlaying');

    const handleTogglePlay = () => sendRemoteCommand({ command: isPlaying ? 'pause' : 'play' });
    const handleSeekForward = () => sendRemoteCommand({ command: 'seek_forward' });
    const handleSeekBackward = () => sendRemoteCommand({ command: 'seek_backward' });
    const handleSkipIntro = () => sendRemoteCommand({ command: 'skip_intro' });

    const handlePlayNext = () => {
        if (remoteNextEpisode && remoteFullItem && isEpisode && 'season_number' in nowPlayingItem) {
            playRemoteItem({
                ...remoteNextEpisode,
                show_id: remoteFullItem.id,
                show_title: remoteFullItem.title || remoteFullItem.name || '',
                backdrop_path: remoteFullItem.backdrop_path,
                season_number: nowPlayingItem.season_number,
            });
        }
    };

    const handlePlayPrevious = () => {
        if (remotePreviousEpisode && remoteFullItem && isEpisode && 'season_number' in nowPlayingItem) {
            playRemoteItem({
                ...remotePreviousEpisode,
                show_id: remoteFullItem.id,
                show_title: remoteFullItem.title || remoteFullItem.name || '',
                backdrop_path: remoteFullItem.backdrop_path,
                season_number: nowPlayingItem.season_number,
            });
        }
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const newTime = ((newValue as number) / 100) * (remoteSlaveState?.duration || 0);
        sendRemoteCommand({ command: 'seek_to', time: newTime });
    };
    
    const handleSelectEpisode = (episode: Episode) => {
        if (!remoteFullItem || !selectedSeason) return;
        const itemToPlay: PlayableItem = {
            ...episode,
            show_id: remoteFullItem.id,
            show_title: remoteFullItem.title || remoteFullItem.name || '',
            backdrop_path: remoteFullItem.backdrop_path,
            season_number: selectedSeason,
        };
        mediaStore.playRemoteItem(itemToPlay);
        setIsEpisodesDrawerOpen(false); // Close drawer after selection
    };

    const isSeries = remoteFullItem?.media_type === 'tv';
    
    const introDuration = remoteFullItem ? (mediaStore.showIntroDurations.get(remoteFullItem.id) ?? 80) : 80;

    const handleIntroDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (!remoteFullItem) return;
        const duration = parseInt(value, 10);
        if (value === '' || isNaN(duration)) {
            mediaStore.setShowIntroDuration(remoteFullItem.id, 80); // Reset to default
        } else if (duration >= 0) {
            mediaStore.setShowIntroDuration(remoteFullItem.id, duration);
        }
    };
    
    const renderEpisodesDrawer = () => {
        const currentSeason = remoteFullItem?.seasons?.find(s => s.season_number === selectedSeason);
        const episodes = currentSeason?.episodes ?? [];

        return (
            <Drawer
                anchor="right"
                open={isEpisodesDrawerOpen}
                onClose={() => setIsEpisodesDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '80vw', sm: 350 }, bgcolor: 'background.paper' } }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{t('remote.player.episodes')}</Typography>
                    <IconButton onClick={() => setIsEpisodesDrawerOpen(false)}><CloseIcon /></IconButton>
                </Box>
                <Divider />
                <Box sx={{ p: 2 }}>
                    <TextField
                        label={t('remote.player.introDuration')}
                        type="number"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={introDuration}
                        onChange={handleIntroDurationChange}
                        onFocus={(event) => event.target.select()}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                            inputProps: { min: 0 }
                        }}
                    />

                    {remoteFullItem?.seasons && (
                        <FormControl fullWidth margin="normal" size="small">
                           <InputLabel>{t('remote.detail.season')}</InputLabel>
                           <Select
                               value={selectedSeason || ''}
                               label={t('remote.detail.season')}
                               onChange={(e) => setSelectedSeason(Number(e.target.value))}
                           >
                               {remoteFullItem.seasons.map(season => (
                               <MenuItem key={season.id} value={season.season_number}>
                                   {season.name}
                               </MenuItem>
                               ))}
                           </Select>
                       </FormControl>
                    )}
                </Box>
                <Divider />
                {isRemoteFullItemLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <List sx={{ flex: 1, overflowY: 'auto' }}>
                        {episodes.map(episode => (
                            <ListItem key={episode.id} disablePadding>
                                <ListItemButton 
                                    onClick={() => handleSelectEpisode(episode)}
                                    selected={isEpisode && episode.id === nowPlayingItem.id}
                                    disabled={!episode.video_url}
                                >
                                    <ListItemText 
                                        primary={`${episode.episode_number}. ${episode.name}`}
                                        primaryTypographyProps={{ fontWeight: isEpisode && episode.id === nowPlayingItem.id ? 'bold' : 'normal', noWrap: true }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Drawer>
        );
    };

    const currentTime = remoteSlaveState?.currentTime || 0;
    const duration = remoteSlaveState?.duration || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={stopRemotePlayback} aria-label={t('remote.player.back')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap>
                        {t('remote.player.title')}
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Now Playing Info with Backdrop */}
            <Box sx={{
                position: 'relative',
                height: { xs: '250px', sm: '350px' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                p: { xs: 2, sm: 3 },
                color: 'white',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${nowPlayingItem.backdrop_path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(20, 20, 20, 1) 10%, rgba(20, 20, 20, 0.7) 40%, transparent 80%)',
                }
            }}>
                 <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h4" fontWeight="bold" noWrap>{title}</Typography>
                    <Typography color="text.secondary" noWrap>{episodeTitle}</Typography>
                 </Box>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Progress Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{formatTime(currentTime)}</Typography>
                    <Slider
                        className="video-player-slider"
                        aria-label="progress"
                        value={progress}
                        onChangeCommitted={handleSeek}
                    />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{formatTime(duration)}</Typography>
                </Box>
                
                {/* Main Controls */}
                <Stack direction="row" spacing={{xs: 2, sm: 4}} sx={{ justifyContent: 'center', alignItems: 'center', mb: 5 }}>
                    {isEpisode && (
                         <IconButton onClick={handlePlayPrevious} disabled={!remotePreviousEpisode} aria-label={t('remote.player.previousEpisode')} sx={{ transform: 'scale(1.5)' }}>
                            <SkipPreviousIcon fontSize="large" />
                        </IconButton>
                    )}
                    <IconButton onClick={handleSeekBackward} aria-label={t('remote.player.seekBackward')} sx={{ transform: 'scale(1.5)' }}>
                        <FastRewindIcon fontSize="large" />
                    </IconButton>
                    <IconButton
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? t('remote.player.pause') : t('remote.player.play')}
                        sx={{
                            bgcolor: 'white', color: 'black', transform: 'scale(2.2)',
                            '&:hover': { bgcolor: 'grey.300' }
                        }}
                    >
                        {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                    </IconButton>
                    <IconButton onClick={handleSeekForward} aria-label={t('remote.player.seekForward')} sx={{ transform: 'scale(1.5)' }}>
                        <FastForwardIcon fontSize="large" />
                    </IconButton>
                    {isEpisode && (
                        <IconButton onClick={handlePlayNext} disabled={!remoteNextEpisode} aria-label={t('remote.player.nextEpisode')} sx={{ transform: 'scale(1.5)' }}>
                            <SkipNextIcon fontSize="large" />
                        </IconButton>
                    )}
                </Stack>

                {/* Secondary Controls */}
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', mt: 4, height: '48px' /* Reserve space for buttons */ }}>
                    <Button
                        variant="contained"
                        color="inherit"
                        onClick={handleSkipIntro}
                        disabled={!isIntroSkippable}
                        sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.8)', 
                            color: 'black', 
                            '&:hover': { bgcolor: 'white' },
                            '&.Mui-disabled': {
                                bgcolor: 'rgba(128, 128, 128, 0.5)',
                                color: 'rgba(255, 255, 255, 0.5)'
                            }
                        }}
                    >
                        {t('remote.player.skipIntro')}
                    </Button>
                     {isSeries && (
                        <Button 
                            variant="outlined" 
                            startIcon={<ListAltIcon />} 
                            onClick={() => setIsEpisodesDrawerOpen(true)}
                            sx={{ borderColor: 'rgba(255,255,255,0.7)', color: 'white' }}
                        >
                            {t('remote.player.episodes')}
                        </Button>
                    )}
                </Stack>
            </Box>
            
            {isSeries && renderEpisodesDrawer()}
        </Box>
    );
});

export default RemotePlayerControlView;