import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Stack, Select, MenuItem, FormControl, InputLabel, Card, CardMedia, Tooltip, CircularProgress, TextField, InputAdornment, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WatchTogetherModal from './WatchTogetherModal';
import LinkEpisodesModal from './LinkEpisodesModal';
import type { Episode } from '../types';

const DetailView: React.FC = () => {
  const { selectedItem: item, myList, isDetailLoading, showIntroDurations, setShowIntroDuration } = mediaStore;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (!item) return null;

  const [selectedSeason, setSelectedSeason] = useState(item.seasons?.[0]?.season_number ?? 1);

  const title = item.title || item.name;
  const releaseDate = item.release_date || item.first_air_date;
  const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);
  const isInMyList = myList.includes(item.id);

  const introDuration = showIntroDurations.get(item.id) ?? 80;

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const tolerance = 1;
      setCanScrollLeft(el.scrollLeft > tolerance);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - tolerance);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollability();

    const handleResize = () => checkScrollability();
    const handleScrollEvent = () => checkScrollability();

    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', handleScrollEvent);

    const timer = setTimeout(checkScrollability, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (el) {
        el.removeEventListener('scroll', handleScrollEvent);
      }
      clearTimeout(timer);
    };
  }, [currentSeason]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollTo({
        left: el.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount),
        behavior: 'smooth',
      });
    }
  };

  const scrollButtonStyles = {
    position: 'absolute',
    top: 0,
    bottom: 8, // Corresponds to py: 1 on the scroll container
    width: '4rem',
    zIndex: 20,
    bgcolor: 'rgba(20, 20, 20, 0.7)',
    color: 'white',
    '&:hover': {
      bgcolor: 'rgba(20, 20, 20, 0.9)',
    },
    borderRadius: '4px',
  };


  const handleIntroDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const duration = parseInt(value, 10);
    // Allow empty string to reset to default, but prevent saving NaN or negative.
    if (value === '' || isNaN(duration)) {
        setShowIntroDuration(item.id, 80); // Reset to default
    } else if (duration >= 0) {
        setShowIntroDuration(item.id, duration);
    }
  };

  // If the selectedItem is updated (e.g. from API) and the current season number is no longer valid, default to the first one.
  React.useEffect(() => {
      if (item.seasons && item.seasons.length > 0) {
          const seasonExists = item.seasons.some(s => s.season_number === selectedSeason);
          if (!seasonExists) {
              setSelectedSeason(item.seasons[0].season_number);
          }
      }
  }, [item.seasons, selectedSeason]);

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
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              pt={2} 
              alignItems={{ xs: 'stretch', sm: 'baseline' }}
            >
              <Button variant="contained" color="inherit" startIcon={<PlayArrowIcon />} size="large" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'grey.300' } }} onClick={() => mediaStore.startPlayback(item)}>
                Riproduci
              </Button>
              <IconButton 
                onClick={() => mediaStore.toggleMyList(item)}
                aria-label={isInMyList ? 'Rimuovi dalla mia lista' : 'Aggiungi alla mia lista'}
                sx={{ 
                  border: '2px solid rgba(255,255,255,0.7)', 
                  color: 'white',
                  alignSelf: { xs: 'flex-start' },
                  width: 40,
                  height: 40,
                }}
              >
                {isInMyList ? <CheckIcon /> : <AddIcon />}
              </IconButton>
              <Button
                variant="outlined"
                startIcon={<GroupIcon />}
                size="large"
                onClick={() => mediaStore.openWatchTogetherModal(item)}
                sx={{ borderColor: 'rgba(255,255,255,0.7)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)'} }}
              >
                Guarda Insieme
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Episodes Section */}
      {item.media_type === 'tv' && (
        <Box sx={{ p: { xs: 2, md: 8 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" component="h2" fontWeight="bold">Episodi</Typography>
                <Tooltip title="Collega file video per la stagione">
                    <IconButton onClick={() => mediaStore.openLinkEpisodesModal(item)}>
                        <LinkIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            {item.seasons && item.seasons.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Durata Intro"
                        type="number"
                        variant="outlined"
                        size="small"
                        value={introDuration}
                        onChange={handleIntroDurationChange}
                        onFocus={(event) => event.target.select()}
                        sx={{
                            width: 150,
                            '& .MuiOutlinedInput-root': {
                                borderColor: 'rgba(255,255,255,0.7)',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'white',
                                }
                            },
                            '& .MuiInputLabel-root': {
                                color: 'text.secondary',
                            }
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                            inputProps: { min: 0 }
                        }}
                    />
                    <FormControl sx={{ minWidth: 120 }} size="small">
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
            )}
          </Box>
          {isDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh' }}>
                <CircularProgress />
            </Box>
          ) : (
            <Box
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                sx={{ position: 'relative' }}
            >
                <Fade in={isHovered && canScrollLeft}>
                    <IconButton
                        onClick={() => handleScroll('left')}
                        sx={{ ...scrollButtonStyles, left: 0 }}
                        aria-label="scorri episodi a sinistra"
                    >
                        <ChevronLeftIcon fontSize="large" />
                    </IconButton>
                </Fade>

                <Box
                    ref={scrollContainerRef}
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: 3,
                        py: 1,
                        scrollBehavior: 'smooth',
                        '&::-webkit-scrollbar': {
                            height: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'transparent',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                        },
                    }}
                >
                    {currentSeason?.episodes.map((episode: Episode) => (
                        <Card
                            key={episode.id}
                            onClick={() => {
                                if (episode.video_url && currentSeason) {
                                    mediaStore.startPlayback({
                                        ...episode,
                                        show_id: item.id,
                                        show_title: item.title || item.name || '',
                                        backdrop_path: item.backdrop_path,
                                        season_number: currentSeason.season_number,
                                    });
                                }
                            }}
                            sx={{
                                flexShrink: 0,
                                width: { xs: '70vw', sm: 320 },
                                bgcolor: 'background.paper',
                                cursor: episode.video_url ? 'pointer' : 'default',
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                    transform: 'scale(1.03)',
                                    zIndex: 2
                                },
                                '&:hover .play-icon': { opacity: episode.video_url ? 1 : 0 },
                            }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                {episode.still_path ? (
                                    <CardMedia
                                        component="img"
                                        image={episode.still_path}
                                        alt={`Scena da ${episode.name}`}
                                        sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Box sx={{
                                        aspectRatio: '16/9',
                                        bgcolor: 'grey.900',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'grey.700',
                                    }}>
                                        <ImageIcon sx={{ fontSize: 60 }} />
                                    </Box>
                                )}
                                <Box
                                    className="play-icon"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        opacity: 0,
                                        transition: 'opacity 0.3s'
                                    }}
                                >
                                    <PlayArrowIcon sx={{ fontSize: 60, color: 'white' }} />
                                </Box>
                            </Box>
                            <Box sx={{ p: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold" noWrap>{episode.episode_number}. {episode.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ height: 60, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                    {episode.overview}
                                </Typography>
                            </Box>
                        </Card>
                    ))}
                </Box>
                <Fade in={isHovered && canScrollRight}>
                    <IconButton
                        onClick={() => handleScroll('right')}
                        sx={{ ...scrollButtonStyles, right: 0 }}
                        aria-label="scorri episodi a destra"
                    >
                        <ChevronRightIcon fontSize="large" />
                    </IconButton>
                </Fade>
            </Box>
          )}
        </Box>
      )}
      <WatchTogetherModal />
      <LinkEpisodesModal />
    </Box>
  );
};

export default observer(DetailView);