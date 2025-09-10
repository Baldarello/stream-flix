import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Stack, CircularProgress, List, ListItem, ListItemButton, ListItemText, AppBar, Toolbar } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getSeriesDetails, getSeriesEpisodes } from '../services/apiCall';
import type { MediaItem, Episode, PlayableItem } from '../types';

const RemotePlayerControlView: React.FC = () => {
    const { remoteSlaveState, sendRemoteCommand, stopRemotePlayback } = mediaStore;
    // FIX: Changed state to accept the PlayableItem union type to correctly handle both movies and episodes.
    const [fullItem, setFullItem] = useState<PlayableItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const nowPlayingItem = remoteSlaveState?.nowPlayingItem;

    useEffect(() => {
        const fetchDetails = async () => {
            // FIX: Added a type guard ('media_type' in nowPlayingItem) to safely access properties of MediaItem.
            if (nowPlayingItem && 'media_type' in nowPlayingItem && nowPlayingItem.media_type === 'tv' && !('seasons' in nowPlayingItem && nowPlayingItem.seasons)) {
                setIsLoading(true);
                try {
                    const seriesDetails = await getSeriesDetails(nowPlayingItem.id);
                    const seasonsWithEpisodes = await Promise.all(
                        seriesDetails.seasons?.map(async (season) => {
                            const episodes = await getSeriesEpisodes(nowPlayingItem.id, season.season_number);
                            return { ...season, episodes };
                        }) ?? []
                    );
                    setFullItem({ ...seriesDetails, seasons: seasonsWithEpisodes });
                } catch (error) => {
                    console.error("Failed to fetch full details for remote player", error);
                    // FIX: This is now safe because the state type is PlayableItem.
                    setFullItem(nowPlayingItem); // Fallback to partial data
                } finally {
                    setIsLoading(false);
                }
            } else {
                // FIX: This is now safe because the state type is PlayableItem.
                setFullItem(nowPlayingItem);
            }
        };

        fetchDetails();
    }, [nowPlayingItem?.id]);


    if (!nowPlayingItem) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>Nessun contenuto in riproduzione.</Typography>
            </Box>
        );
    }
    
    const isPlaying = remoteSlaveState?.isPlaying ?? false;
    // FIX: Used a type guard to safely access properties on the PlayableItem union type.
    const isEpisode = 'episode_number' in nowPlayingItem;
    const title = isEpisode ? nowPlayingItem.show_title : (nowPlayingItem.title || nowPlayingItem.name);

    const handleTogglePlay = () => sendRemoteCommand({ command: isPlaying ? 'pause' : 'play' });
    const handleSeekForward = () => sendRemoteCommand({ command: 'seek_forward' });
    const handleSeekBackward = () => sendRemoteCommand({ command: 'seek_backward' });
    
    const handleSelectEpisode = (episode: Episode) => {
        // FIX: Added a type guard to ensure `fullItem` is a MediaItem before accessing its properties.
        if (!fullItem || !('media_type' in fullItem)) return;
        const itemToPlay: PlayableItem = {
            ...episode,
            show_id: fullItem.id,
            show_title: fullItem.title || fullItem.name || '',
            backdrop_path: fullItem.backdrop_path,
            season_number: fullItem.seasons?.find(s => s.episodes.some(e => e.id === episode.id))?.season_number || 1,
        };
        sendRemoteCommand({ command: 'select_media', item: itemToPlay });
    };

    // FIX: Added a type guard to safely check for series type.
    const isSeries = fullItem && 'media_type' in fullItem && fullItem.media_type === 'tv';
    // For now, just show first season episodes. A season selector could be added later.
    const episodes = isSeries ? fullItem.seasons?.[0]?.episodes : [];

    return (
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh' }}>
            <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={stopRemotePlayback} aria-label="indietro">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap>
                        Torna alla selezione
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" fontWeight="bold">{title}</Typography>
                <Typography color="text.secondary">In riproduzione sulla TV</Typography>

                <Stack direction="row" spacing={3} justifyContent="center" alignItems="center" sx={{ my: 4 }}>
                    <IconButton onClick={handleSeekBackward} aria-label="indietro 10 secondi" sx={{ transform: 'scale(1.5)' }}>
                        <FastRewindIcon fontSize="large" />
                    </IconButton>
                    <IconButton
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? 'pausa' : 'play'}
                        sx={{
                            bgcolor: 'white', color: 'black', transform: 'scale(2)',
                            '&:hover': { bgcolor: 'grey.300' }
                        }}
                    >
                        {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                    </IconButton>
                    <IconButton onClick={handleSeekForward} aria-label="avanti 10 secondi" sx={{ transform: 'scale(1.5)' }}>
                        <FastForwardIcon fontSize="large" />
                    </IconButton>
                </Stack>
                
                {isSeries && (
                    <>
                        <Typography variant="h5" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
                            Episodi
                        </Typography>
                        {isLoading ? <CircularProgress /> : (
                            <List sx={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                                {episodes?.map(episode => (
                                    <ListItem key={episode.id} disablePadding>
                                        <ListItemButton onClick={() => handleSelectEpisode(episode)}>
                                            <ListItemText 
                                                primary={`${episode.episode_number}. ${episode.name}`}
                                                secondary={episode.overview}
                                                secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default observer(RemotePlayerControlView);
