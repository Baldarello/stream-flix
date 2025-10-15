
import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemText, Typography, IconButton, Toolbar, CardMedia, LinearProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Episode, MediaItem, PlayableItem } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { useNavigate } from 'react-router';

interface EpisodesDrawerProps {
    nowPlayingItem: PlayableItem | null;
    nowPlayingShowDetails: MediaItem | null;
}

const EpisodesDrawer: React.FC<EpisodesDrawerProps> = observer(({ nowPlayingItem, nowPlayingShowDetails }) => {
    const { isEpisodesDrawerOpen, closeEpisodesDrawer, episodeProgress, selectedSeasons, setSelectedSeasonForShow } = mediaStore;
    const { t } = useTranslations();
    const navigate = useNavigate();

    if (!nowPlayingShowDetails || !('seasons' in nowPlayingShowDetails)) {
        return null; // Don't render if it's not a TV show with seasons
    }
    
    const getSelectedSeasonNumber = () => {
        const storedSeason = selectedSeasons.get(nowPlayingShowDetails.id);
        if (storedSeason && nowPlayingShowDetails.seasons?.some(s => s.season_number === storedSeason)) {
            return storedSeason;
        }
        if (nowPlayingItem && 'season_number' in nowPlayingItem) {
            return nowPlayingItem.season_number;
        }
        return nowPlayingShowDetails.seasons?.[0]?.season_number || 1;
    };
    
    const selectedSeasonNumber = getSelectedSeasonNumber();
    const currentSeason = nowPlayingShowDetails.seasons?.find(s => s.season_number === selectedSeasonNumber);

    const handleEpisodeClick = (episode: Episode) => {
        if (!nowPlayingShowDetails) return;
        navigate(`/watch/episode/${episode.id}/${nowPlayingShowDetails.id}`, { replace: true });
        closeEpisodesDrawer();
    };

    return (
        <Drawer
            anchor="right"
            open={isEpisodesDrawerOpen}
            onClose={closeEpisodesDrawer}
            PaperProps={{ sx: { width: { xs: '80vw', sm: 350 }, bgcolor: 'background.paper' } }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Typography variant="h6">{t('episodesDrawer.title')}</Typography>
                <IconButton onClick={closeEpisodesDrawer}><CloseIcon /></IconButton>
            </Toolbar>
            
            {nowPlayingShowDetails.seasons && nowPlayingShowDetails.seasons.length > 1 && (
                <Box sx={{ px: 2, py: 1 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('detail.season')}</InputLabel>
                        <Select
                            value={selectedSeasonNumber}
                            label={t('detail.season')}
                            onChange={(e) => setSelectedSeasonForShow(nowPlayingShowDetails.id, Number(e.target.value))}
                        >
                            {nowPlayingShowDetails.seasons.map(season => (
                                <MenuItem key={season.id} value={season.season_number}>{season.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            <List sx={{ flex: 1, overflowY: 'auto' }}>
                {(currentSeason?.episodes || []).map((episode: Episode) => {
                    const progress = episodeProgress.get(episode.id);
                    const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
                    const isWatched = progress?.watched;
                    const isPlayingThis = nowPlayingItem?.id === episode.id;
                    const hasPlayableLinks = !!(episode.video_url || episode.video_urls?.length);

                    return (
                        <ListItem key={episode.id} disablePadding>
                            <ListItemButton
                                onClick={() => handleEpisodeClick(episode)}
                                selected={isPlayingThis}
                                disabled={!hasPlayableLinks}
                                sx={{ 
                                    opacity: !hasPlayableLinks ? 0.5 : 1,
                                    alignItems: 'flex-start',
                                    gap: 2,
                                    py: 1.5,
                                }}
                            >
                                <Typography sx={{ pt: 0.5 }}>{episode.episode_number}</Typography>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/9', mb: 1, overflow: 'hidden', borderRadius: 1 }}>
                                        {episode.still_path ? (
                                            <CardMedia component="img" image={episode.still_path} />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <TheatersIcon color="disabled" sx={{ fontSize: '3rem' }} />
                                            </Box>
                                        )}
                                        {watchedPercentage > 0 && !isWatched && (
                                            <LinearProgress variant="determinate" value={watchedPercentage} color="primary" sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 }} />
                                        )}
                                        {isWatched && (
                                            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircleIcon color="success" sx={{ fontSize: '3rem' }} />
                                            </Box>
                                        )}
                                        {isPlayingThis && (
                                            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <PlayArrowIcon color="inherit" sx={{ fontSize: '3rem' }} />
                                            </Box>
                                        )}
                                    </Box>
                                    <ListItemText primary={episode.name} secondary={episode.overview} primaryTypographyProps={{ fontWeight: 'bold' }} secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }} />
                                </Box>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Drawer>
    );
});

export default EpisodesDrawer;