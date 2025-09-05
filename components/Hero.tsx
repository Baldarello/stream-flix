import React from 'react';
import type { MediaItem } from '../types';
import { Box, Typography, Button, Stack } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface HeroProps {
  item: MediaItem;
  onMoreInfoClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ item, onMoreInfoClick }) => {
  const title = item.title || item.name;
  const overview = item.overview.length > 200 ? `${item.overview.substring(0, 200)}...` : item.overview;

  return (
    <Box
      sx={{
        position: 'relative',
        height: '56.25vw',
        minHeight: '400px',
        maxHeight: '800px',
        width: '100%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${item.backdrop_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #141414 10%, transparent 50%), linear-gradient(to right, #141414 10%, transparent 60%)',
        }
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, md: 8 }, width: { xs: '100%', md: '50%', lg: '40%' } }}>
        <Stack spacing={2}>
          <Typography variant="h2" component="h1" fontWeight="bold" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
            {overview}
          </Typography>
          <Stack direction="row" spacing={2} pt={2}>
            <Button variant="contained" color="inherit" startIcon={<PlayArrowIcon />} size="large" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'grey.300' } }}>
              Riproduci
            </Button>
            <Button variant="contained" startIcon={<InfoOutlinedIcon />} size="large" onClick={onMoreInfoClick} sx={{ bgcolor: 'rgba(109, 109, 110, 0.7)', '&:hover': { bgcolor: 'rgba(109, 109, 110, 0.4)' } }}>
              Altre Info
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};
