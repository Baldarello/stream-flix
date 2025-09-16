import React from 'react';
import type { MediaItem } from '../types';
import { Box, Typography, Button, Stack } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslations } from '../hooks/useTranslations';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';

interface HeroProps {
  item: MediaItem;
  onMoreInfoClick: () => void;
  onPlayClick: () => void;
}

export const Hero: React.FC<HeroProps> = observer(({ item, onMoreInfoClick, onPlayClick }) => {
  const { t } = useTranslations();
  const title = item.title || item.name;
  const overview = item.overview.length > 200 ? `${item.overview.substring(0, 200)}...` : item.overview;

  const getGlowColor = () => {
    switch (mediaStore.activeTheme) {
        case 'Film': return 'rgba(255, 171, 0, 0.5)';
        case 'Anime': return 'rgba(171, 71, 188, 0.5)';
        case 'SerieTV':
        default: return 'rgba(0, 163, 255, 0.5)';
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: '70vh', md: '56.25vw' },
        minHeight: '400px',
        maxHeight: { xs: '600px', md: '800px' },
        width: '100%',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden', // to contain the animated background
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${item.backdrop_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'kenburns 30s ease-in-out infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, var(--background-gradient-end) 10%, transparent 50%), radial-gradient(circle at 30% 50%, transparent 20%, var(--background-gradient-end) 80%)',
        }
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, md: 8 }, pt: { xs: 16, md: 8}, width: { xs: '100%', md: '50%', lg: '40%' } }}>
        <Stack spacing={2}>
          <Typography variant="h2" component="h1" fontWeight="bold" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
            {overview}
          </Typography>
          <Stack direction="row" spacing={2} pt={2}>
            <Button variant="contained" color="inherit" startIcon={<PlayArrowIcon />} size="large" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: 'white', boxShadow: '0 0 15px 5px rgba(255, 255, 255, 0.5)' } }} onClick={onPlayClick}>
              {t('hero.play')}
            </Button>
            <Button variant="contained" startIcon={<InfoOutlinedIcon />} size="large" onClick={onMoreInfoClick} sx={{ bgcolor: 'rgba(109, 109, 110, 0.7)', backdropFilter: 'blur(5px)', '&:hover': { bgcolor: 'rgba(109, 109, 110, 0.5)', boxShadow: `0 0 15px 5px ${getGlowColor()}` } }}>
              {t('hero.moreInfo')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
});