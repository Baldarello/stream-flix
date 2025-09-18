import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import type { Episode, PlayableItem } from '../types';
import { useTranslations } from '../hooks/useTranslations';

const RemoteDetailView: React.FC = observer(() => {
  const { remoteSelectedItem: item, clearRemoteSelectedItem, isRemoteDetailLoading } = mediaStore;
  const { t } = useTranslations();

  // The view should not render if there's no item. This is a safeguard.
  if (!item) return null;

  const [selectedSeason, setSelectedSeason] = useState(item.seasons?.[0]?.season_number ?? 1);

  // Effect to reset selected season if the item changes (e.g., navigating from one show to another)
  useEffect(() => {
      setSelectedSeason(item.seasons?.[0]?.season_number ?? 1);
  }, [item]);

  const title = item.title || item.name;
  const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-in-out', bgcolor: 'background.default', minHeight: '100vh', color: 'text.primary' }}>
      {/* Backdrop Section */}
      <Box sx={{ position: 'relative', height: '40vw', minHeight: {xs: '200px', sm: '300px'}, maxHeight: '600px' }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${item.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141414 10%, transparent 70%)' }} />
        <IconButton onClick={clearRemoteSelectedItem} aria-label={t('remote.detail.back')} sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: { xs: 2, md: 4 }, width: '100%' }}>
          <Typography variant="h3" component="h1" fontWeight="bold">{title}</Typography>
          <Typography variant="body1" sx={{ maxWidth: '700px', mt: 2 }}>{item.overview}</Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {item.media_type === 'tv' ? (
          <>
            {/* TV Show Content */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h5" component="h2" fontWeight="bold">{t('remote.detail.episodes')}</Typography>
              {item.seasons && item.seasons.length > 0 && (
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel id="season-select-label">{t('remote.detail.season')}</InputLabel>
                  <Select
                    labelId="season-select-label"
                    value={selectedSeason}
                    label={t('remote.detail.season')}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    {item.seasons.map(season => (
                      <MenuItem key={season.id} value={season.season_number}>{season.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            
            {isRemoteDetailLoading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : (
                <Stack spacing={1.5}>
                    {currentSeason?.episodes.map((episode: Episode) => {
                        const itemToPlay: PlayableItem = {
                            ...episode,
                            show_id: item.id,
                            show_title: item.title || item.name || '',
                            backdrop_path: item.backdrop_path,
                            season_number: currentSeason?.season_number || 1,
                        };
                        return (
                            <Button
                                key={episode.id}
                                onClick={() => mediaStore.playRemoteItem(itemToPlay)}
                                variant="outlined"
                                fullWidth
                                sx={{ 
                                    justifyContent: 'flex-start', 
                                    p: 1.5, 
                                    textAlign: 'left', 
                                    borderColor: 'rgba(255,255,255,0.23)', 
                                    textTransform: 'none',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.08)'
                                    }
                                }}
                            >
                                <PlayCircleOutlineIcon sx={{ mr: 2, color: 'text.secondary', flexShrink: 0 }} />
                                <Box sx={{ overflow: 'hidden' }}>
                                    <Typography fontWeight="bold">{episode.episode_number}. {episode.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {episode.overview}
                                    </Typography>
                                </Box>
                            </Button>
                        )
                    })}
                </Stack>
            )}
          </>
        ) : (
          <>
            {/* Movie Content */}
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayCircleOutlineIcon />}
              onClick={() => mediaStore.playRemoteItem(item)}
            >
              {t('remote.detail.playOnTV')}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
});

export default RemoteDetailView;