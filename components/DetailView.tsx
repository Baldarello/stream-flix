import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardMedia } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import type { Episode } from '../types';

const DetailView: React.FC = () => {
  const { selectedItem: item, myList } = mediaStore;

  if (!item) return null;

  const [selectedSeason, setSelectedSeason] = useState(item.seasons?.[0]?.season_number ?? 1);

  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);
  const isInMyList = myList.includes(item.id);

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      {/* Backdrop Section */}
      <Box
        sx={{
          position: 'relative',
          height: '40vw',
          minHeight: '300px',
          maxHeight: '600px',
          color: 'white'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${item.backdrop_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #141414 10%, transparent 70%)'
          }}
        />
        <IconButton
          onClick={() => mediaStore.closeDetail()}
          aria-label="Chiudi dettaglio"
          sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, p: { xs: 2, md: 8 }, width: { xs: '100%', md: '60%' } }}>
          <Stack spacing={2}>
            <Typography variant="h2" component="h1" fontWeight="bold">{title}</Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <Typography sx={{ color: 'success.main' }} fontWeight="bold">Voto: {item.vote_average.toFixed(1)}</Typography>
              <Typography>{releaseDate?.substring(0, 4)}</Typography>
              {item.media_type === 'tv' && item.seasons && <Typography>{item.seasons.length} Stagioni</Typography>}
            </Stack>
            <Typography variant="body1" sx={{ maxWidth: '700px' }}>{item.overview}</Typography>
            <Stack direction="row" spacing={2} pt={2}>
              <Button variant="contained" color="inherit" startIcon={<PlayArrowIcon />} size="large" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'grey.300' } }}>
                Riproduci
              </Button>
              <IconButton 
                onClick={() => mediaStore.toggleMyList(item)}
                aria-label={isInMyList ? 'Rimuovi dalla mia lista' : 'Aggiungi alla mia lista'}
                sx={{ border: '2px solid rgba(255,255,255,0.7)', color: 'white' }}
              >
                {isInMyList ? <CheckIcon /> : <AddIcon />}
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Episodes Section */}
      {item.media_type === 'tv' && item.seasons && item.seasons.length > 0 && (
        <Box sx={{ p: { xs: 2, md: 8 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h2" fontWeight="bold">Episodi</Typography>
            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
              <InputLabel id="season-select-label">Stagione</InputLabel>
              <Select
                labelId="season-select-label"
                value={selectedSeason}
                label="Stagione"
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                sx={{ bgcolor: 'background.paper' }}
              >
                {item.seasons.map(season => (
                  <MenuItem key={season.id} value={season.season_number}>
                    {season.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={3}>
            {currentSeason?.episodes.map((episode: Episode) => (
              // FIX: Added the `item` prop to the Grid component, as it's required for grid items.
              <Grid item xs={12} sm={6} md={4} lg={3} key={episode.id}>
                <Card sx={{ bgcolor: 'background.paper', cursor: 'pointer', '&:hover .play-icon': { opacity: 1 } }}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={episode.still_path}
                      alt={`Scena da ${episode.name}`}
                      sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
                    />
                    <Box className="play-icon" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0, transition: 'opacity 0.3s' }}>
                      <PlayArrowIcon sx={{ fontSize: 60, color: 'white' }} />
                    </Box>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>{episode.episode_number}. {episode.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ height: 60, overflow: 'hidden' }}>
                      {episode.overview}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default observer(DetailView);