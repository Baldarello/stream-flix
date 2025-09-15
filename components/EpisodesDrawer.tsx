import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton, Toolbar, CardMedia } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ImageIcon from '@mui/icons-material/Image';
import type { Episode } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const EpisodesDrawer: React.FC = observer(() => {
    const { isEpisodesDrawerOpen, closeEpisodesDrawer, currentShow, currentSeasonEpisodes, nowPlayingItem } = mediaStore;
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

    const ImageWithPlaceholder = ({ episode }: { episode: Episode }) => (
        <Box sx={{
            position: 'relative',
            width: 120,
            height: 68,
            flexShrink: 0,
            '&:hover .play-overlay': {
                opacity: 1,
            }
        }}>
            {episode.still_path ? (
                <CardMedia
                    component="img"
                    image={episode.still_path}
                    alt={episode.name}
                    sx={{ width: '100%', height: '100%', borderRadius: 1, objectFit: 'cover' }}
                />
            ) : (
                <Box sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 1,
                    bgcolor: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <ImageIcon color="disabled" />
                </Box>
            )}
            <Box
                className="play-overlay"
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s ease-in-out',
                    borderRadius: 1,
                    cursor: 'pointer',
                }}
            >
                <PlayArrowIcon fontSize="large" />
            </Box>
        </Box>
    );

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
                                
                                <ImageWithPlaceholder episode={episode} />

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