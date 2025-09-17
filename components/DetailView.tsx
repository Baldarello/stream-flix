import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, Card, CardMedia, Tooltip, CircularProgress, TextField, InputAdornment, List, ListItemButton, ListItemText, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import TheatersIcon from '@mui/icons-material/Theaters';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkEpisodesModal from './LinkEpisodesModal';
import type { Episode } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const DetailView: React.FC = observer(() => {
  const { selectedItem: item, myList, isDetailLoading, showIntroDurations, setShowIntroDuration, episodeProgress } = mediaStore;
  const { t } = useTranslations();

  if (!item) return null;

  const [selectedSeason, setSelectedSeason] = useState(item.seasons?.[0]?.season_number ?? 1);

  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);
  const isInMyList = myList.includes(item.id);

  const introDuration = showIntroDurations.get(item.id) ?? 80;


  const handleIntroDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const duration = parseInt(value, 10);
    if (value === '' || isNaN(duration)) {
        setShowIntroDuration(item.id, 80); // Reset to default
    } else if (duration >= 0) {
        setShowIntroDuration(item.id, duration);
    }
  };

  React.useEffect(() => {
      if (item.seasons && item.seasons.length > 0) {
          const seasonExists = item.seasons.some(s => s.season_number === selectedSeason);
          if (!seasonExists) {
              setSelectedSeason(item.seasons[0].season_number);
          }
      }
  }, [item.seasons, selectedSeason]);

  const listActionLabel = isInMyList ? t('detail.removeFromList') : t('detail.addToList');

  const getGlowColor = () => {
    switch (mediaStore.activeTheme) {
        case 'Film': return 'var(--glow-film-color)';
        case 'Anime': return 'var(--glow-anime-color)';
        case 'SerieTV':
        default: return 'var(--glow-seriestv-color)';
    }
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1200, animation: 'fadeIn 0.5s ease-in-out' }}>
        <Box sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${item.backdrop_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.5)',
            transform: 'scale(1.1)',
        }} />

        <IconButton
            onClick={() => mediaStore.closeDetail()}
            aria-label={t('detail.close')}
            sx={{
                position: 'absolute', top: 16, right: 16, zIndex: 1300,
                bgcolor: 'rgba(0,0,0,0.5)',
                transform: 'scale(1.2)',
                transition: 'transform 0.3s ease, background-color 0.3s ease',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)', transform: 'scale(1.3) rotate(90deg)' }
            }}
        >
            <CloseIcon />
        </IconButton>

        <Box sx={{ position: 'relative', height: '100%', overflowY: 'auto' }}>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '350px 1fr' },
                gap: 4,
                p: { xs: 2, md: 8 },
                pt: { xs: 8, md: 8 },
                minHeight: '60vh',
                alignItems: 'center',
            }}>
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
                <Stack spacing={2} sx={{
                    p: { xs: 2, md: 4 },
                    bgcolor: 'background.paper',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <Typography variant="h2" component="h1" fontWeight="bold">{title}</Typography>
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Typography sx={{ color: 'success.main' }} fontWeight="bold">{t('detail.vote')}: {item.vote_average.toFixed(1)}</Typography>
                        <Typography>{releaseDate?.substring(0, 4)}</Typography>
                        {item.media_type === 'tv' && item.seasons && <Typography>{item.seasons.length} {t('detail.seasons')}</Typography>}
                    </Stack>
                    <Typography variant="body1" sx={{ maxHeight: '200px', overflowY: 'auto' }}>{item.overview}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        pt={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                        <Button variant="contained" color="inherit" startIcon={<PlayArrowIcon />} size="large" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'white', boxShadow: '0 0 15px 5px rgba(255, 255, 255, 0.5)' } }} onClick={() => mediaStore.startPlayback(item)}>
                            {t('detail.play')}
                        </Button>
                        <Tooltip title={listActionLabel}>
                            <IconButton
                                onClick={() => mediaStore.toggleMyList(item)}
                                aria-label={listActionLabel}
                                sx={{
                                    border: '2px solid rgba(255,255,255,0.7)',
                                    color: 'white',
                                    alignSelf: { xs: 'flex-start' },
                                    width: 48,
                                    height: 48,
                                    '&:hover': { borderColor: 'white', boxShadow: `0 0 10px ${getGlowColor()}` }
                                }}
                            >
                                {isInMyList ? <CheckIcon /> : <AddIcon />}
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="outlined"
                            startIcon={<GroupIcon />}
                            size="large"
                            onClick={() => mediaStore.openWatchTogetherModal(item)}
                            sx={{ borderColor: 'rgba(255,255,255,0.7)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)', boxShadow: `0 0 10px ${getGlowColor()}` } }}
                        >
                            {t('detail.watchTogether')}
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {item.media_type === 'tv' && (
                <Box sx={{ p: { xs: 2, md: 8 }, pt: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4" component="h2" fontWeight="bold">{t('detail.episodes')}</Typography>
                            <Tooltip title={t('detail.linkEpisodesTooltip')}>
                                <IconButton onClick={() => mediaStore.openLinkEpisodesModal(item)}>
                                    <LinkIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        {item.seasons && item.seasons.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TextField
                                    label={t('detail.introDuration')}
                                    type="number"
                                    variant="outlined"
                                    size="small"
                                    value={introDuration}
                                    onChange={handleIntroDurationChange}
                                    onFocus={(event) => event.target.select()}
                                    sx={{ width: 150 }}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                                        inputProps: { min: 0 }
                                    }}
                                />
                                <FormControl sx={{ minWidth: 120 }} size="small">
                                    <InputLabel id="season-select-label">{t('detail.season')}</InputLabel>
                                    <Select
                                        labelId="season-select-label"
                                        value={selectedSeason}
                                        label={t('detail.season')}
                                        onChange={(e) => setSelectedSeason(Number(e.target.value))}
                                        sx={{ bgcolor: 'rgba(20, 20, 30, 0.7)', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
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
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <List>
                            {currentSeason?.episodes.map((episode: Episode) => {
                                const progress = episodeProgress.get(episode.id);
                                const watchedPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
                                const isWatched = progress?.watched;
                                
                                return (
                                <ListItemButton
                                    key={episode.id}
                                    onClick={() => {
                                        mediaStore.startPlayback({
                                            ...episode,
                                            show_id: item.id,
                                            show_title: item.title || item.name || '',
                                            backdrop_path: item.backdrop_path,
                                            season_number: currentSeason.season_number,
                                        });
                                    }}
                                    sx={{ 
                                        mb: 1.5,
                                        p: 2,
                                        bgcolor: 'rgba(20, 20, 30, 0.6)',
                                        borderRadius: 2,
                                        transition: 'background-color 0.2s, transform 0.2s',
                                        '&:hover': {
                                            bgcolor: 'rgba(40, 40, 50, 0.8)',
                                            transform: 'scale(1.02)'
                                        }
                                     }}
                                >
                                    <Typography sx={{ mr: 2, fontWeight: 'bold' }}>{episode.episode_number}</Typography>
                                    <Box sx={{ position: 'relative', width: 150, aspectRatio: '16/9', mr: 2, flexShrink: 0, overflow: 'hidden', borderRadius: 1 }}>
                                        {episode.still_path ? (
                                            <CardMedia
                                                component="img"
                                                image={episode.still_path}
                                                alt={`Scena da ${episode.name}`}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Box sx={{
                                                width: '100%', height: '100%',
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
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
                                    </Box>
                                    <ListItemText
                                        primary={episode.name}
                                        secondary={episode.overview}
                                        primaryTypographyProps={{ fontWeight: 'bold' }}
                                        secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                                    />
                                </ListItemButton>
                            )})}
                        </List>
                    )}
                </Box>
            )}
        </Box>
        <LinkEpisodesModal />
    </Box>
  );
});

export default DetailView;