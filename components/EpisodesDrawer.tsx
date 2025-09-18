import React from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton, Toolbar, CardMedia, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Episode } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const EpisodesDrawer: React.FC = observer(() => {
    const { isEpisodesDrawerOpen, closeEpisodesDrawer, currentShow, currentSeasonEpisodes, nowPlayingItem, episodeProgress } = mediaStore;
    const { t } = useTranslations();

    if (!currentShow || !nowPlayingItem || !('episode_number' in nowPlayingItem)) {
        return null;
    }

    const currentEpisodeId = nowPlayingItem.id;
    const seasonNumber = nowPlayingItem.season_number;

    const handleSelectEpisode = (episode: Episode) => {
        mediaStore.startPlayback({
            ...episode,
            show_id: currentShow.id,
            show_title: currentShow.title || currentShow.name || '',
            backdrop_path: currentShow.backdrop_path,
            season_number: seasonNumber,
        });
    };

    const ImageWithProgress = ({ episode }: { episode: Episode }) => {
        const progress = episodeProgress.get(episode.id);
        const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
        const isWatched = progress?.watched;

        return (
            <Box sx={{
                position: 'relative',
                width: 120,
                height: 68,
                flexShrink: 0,
                borderRadius: 1,
                overflow: 'hidden',
                '&:hover .play-overlay': {
                    opacity: 1,
                }
            }}>
                {episode.still_path ? (
                    <CardMedia
                        component="img"
                        image={episode.still_path}
                        alt={episode.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <Box sx={{
                        width: '100%', height: '100%',
                        bgcolor: 'grey.900',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TheatersIcon color="disabled" sx={{ fontSize: '2.5rem' }} />
                    </Box>
                )}
                <Box
                    className="play-overlay"
                    sx={{
                        position: 'absolute', inset: 0,
                        bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        cursor: 'pointer',
                    }}
                >
                    <PlayArrowIcon fontSize="large" />
                </Box>
                {watchedPercentage > 0 && !isWatched && (
                    <LinearProgress variant="determinate" value={watchedPercentage} color="primary" sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }} />
                )}
                {isWatched && (
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: '2rem' }} />
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <Drawer
            anchor="right"
            open={isEpisodesDrawerOpen}
            onClose={closeEpisodesDrawer}
            sx={{ zIndex: 2100 }} // Ensure drawer is above video player (zIndex 2000)
            PaperProps={{
                sx: {
                    width: { xs: '80%', sm: 400 },
                    bgcolor: '#181818',
                }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {t('episodesDrawer.title')}
                    </Typography>
                    <IconButton edge="end" onClick={closeEpisodesDrawer}>
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
                <List sx={{ overflowY: 'auto', flex: 1, p: 1 }}>
                    {currentSeasonEpisodes.map((episode) => (
                        <ListItem key={episode.id} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                selected={episode.id === currentEpisodeId}
                                onClick={() => handleSelectEpisode(episode)}
                                sx={{ 
                                    gap: 2, 
                                    p: 1, 
                                    borderRadius: 1,
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(255, 255, 255, 0.15)'
                                    }
                                }}
                            >
                                <Typography sx={{ minWidth: '2.5rem', alignSelf: 'center' }} align="center">{episode.episode_number}</Typography>
                                
                                <ImageWithProgress episode={episode} />

                                <ListItemText
                                    primary={episode.name}
                                    primaryTypographyProps={{
                                        fontWeight: 'bold',
                                        whiteSpace: 'normal',
                                        lineHeight: 1.3,
                                    }}
                                    secondary={t('episodesDrawer.season', { number: seasonNumber })}
                                    secondaryTypographyProps={{
                                        mt: 0.5
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
});

export default EpisodesDrawer;