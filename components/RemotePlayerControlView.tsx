import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, IconButton, Stack, CircularProgress, List, ListItem, ListItemButton, ListItemText, AppBar, Toolbar, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import type { Episode, PlayableItem } from '../types';

const RemotePlayerControlView = () => {
    const { remoteSlaveState, sendRemoteCommand, stopRemotePlayback, remoteFullItem, isRemoteFullItemLoading } = mediaStore;
    const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);

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
    const isEpisode = 'episode_number' in nowPlayingItem;
    
    const title = isEpisode ? nowPlayingItem.show_title : (nowPlayingItem.title || nowPlayingItem.name);
    const episodeTitle = isEpisode ? `S${String(nowPlayingItem.season_number).padStart(2,'0')}E${String(nowPlayingItem.episode_number).padStart(2,'0')}: ${nowPlayingItem.name}` : 'In riproduzione sulla TV';

    const handleTogglePlay = () => sendRemoteCommand({ command: isPlaying ? 'pause' : 'play' });
    const handleSeekForward = () => sendRemoteCommand({ command: 'seek_forward' });
    const handleSeekBackward = () => sendRemoteCommand({ command: 'seek_backward' });
    const handleToggleFullscreen = () => sendRemoteCommand({ command: 'toggle_fullscreen' });
    
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
    };

    const isSeries = remoteFullItem?.media_type === 'tv';
    const currentSeason = remoteFullItem?.seasons?.find(s => s.season_number === selectedSeason);
    const episodes = currentSeason?.episodes ?? [];

    return (
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh' }}>
            <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={stopRemotePlayback} aria-label="indietro">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap>
                        Telecomando
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

            {/* Controls */}
            <Stack direction="row" spacing={3} justifyContent="center" alignItems="center" sx={{ my: 4 }}>
                <IconButton onClick={handleSeekBackward} aria-label="indietro 10 secondi" sx={{ transform: 'scale(1.5)' }}>
                    <FastRewindIcon fontSize="large" />
                </IconButton>
                <IconButton
                    onClick={handleTogglePlay}
                    aria-label={isPlaying ? 'pausa' : 'play'}
                    sx={{
                        bgcolor: 'white', color: 'black', transform: 'scale(2.2)',
                        '&:hover': { bgcolor: 'grey.300' }
                    }}
                >
                    {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                </IconButton>
                <IconButton onClick={handleSeekForward} aria-label="avanti 10 secondi" sx={{ transform: 'scale(1.5)' }}>
                    <FastForwardIcon fontSize="large" />
                </IconButton>
     
            </Stack>
            
            {/* Episodes List for Series */}
            {isSeries && (
                <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" fontWeight="bold">
                            Episodi
                        </Typography>
                        {remoteFullItem && remoteFullItem.seasons && (
                             <FormControl sx={{ minWidth: 150 }} size="small">
                                <InputLabel>Stagione</InputLabel>
                                <Select
                                    value={selectedSeason || ''}
                                    label="Stagione"
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
                    {isRemoteFullItemLoading ? <Box sx={{ display: 'flex', justifyContent: 'center'}}><CircularProgress /></Box> : (
                        <List sx={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 2 }}>
                            {episodes.map(episode => (
                                <ListItem key={episode.id} disablePadding>
                                    <ListItemButton 
                                        onClick={() => handleSelectEpisode(episode)}
                                        selected={isEpisode && episode.id === nowPlayingItem.id}
                                        disabled={!episode.video_url}
                                    >
                                        <ListItemText 
                                            primary={`${episode.episode_number}. ${episode.name}`}
                                            primaryTypographyProps={{ fontWeight: isEpisode && episode.id === nowPlayingItem.id ? 'bold' : 'normal' }}
                                            secondary={episode.overview}
                                            secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default observer(RemotePlayerControlView);