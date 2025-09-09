import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton, Toolbar, CardMedia } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Episode } from '../types';

const EpisodesDrawer: React.FC = () => {
    const { isEpisodesDrawerOpen, closeEpisodesDrawer, currentShow, currentSeasonEpisodes, nowPlayingItem } = mediaStore;

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

    return (
        <Drawer
            anchor="right"
            open={isEpisodesDrawerOpen}
            onClose={closeEpisodesDrawer}
            PaperProps={{
                sx: {
                    width: { xs: '80%', sm: 400 },
                    bgcolor: 'background.paper',
                }
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Episodi
                    </Typography>
                    <IconButton edge="end" onClick={closeEpisodesDrawer}>
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
                <List sx={{ overflowY: 'auto', flex: 1 }}>
                    {currentSeasonEpisodes.map((episode) => (
                        <ListItem key={episode.id} disablePadding>
                            <ListItemButton
                                selected={episode.id === currentEpisodeId}
                                onClick={() => handleSelectEpisode(episode)}
                                sx={{ gap: 2 }}
                            >
                                <Typography sx={{ minWidth: '2.5rem' }} align="center">{episode.episode_number}</Typography>
                                <CardMedia
                                    component="img"
                                    image={episode.still_path}
                                    alt={episode.name}
                                    sx={{ width: 120, height: 68, borderRadius: 1, objectFit: 'cover' }}
                                />
                                <ListItemText
                                    primary={episode.name}
                                    primaryTypographyProps={{
                                        fontWeight: 'bold',
                                        noWrap: true,
                                    }}
                                    secondary={`Stagione ${seasonNumber}`}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
};

export default observer(EpisodesDrawer);
