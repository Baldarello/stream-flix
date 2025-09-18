import React from 'react';
import type { MediaItem } from '../types';
import { Card as MuiCard, CardMedia, Typography, Box, CardActionArea, IconButton, Tooltip } from '@mui/material';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import TheatersIcon from '@mui/icons-material/Theaters';
import { useTranslations } from '../hooks/useTranslations';

interface CardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  displayMode?: 'row' | 'grid';
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = observer(({ item, onClick, displayMode = 'row', className, style }) => {
  const { t } = useTranslations();
  const title = item.title || item.name;
  const isInMyList = mediaStore.myList.includes(item.id);

  const handleToggleMyList = (event: React.MouseEvent) => {
    event.stopPropagation();
    mediaStore.toggleMyList(item);
  };

  const getGlowColor = () => {
    switch (mediaStore.activeTheme) {
        case 'Film': return 'var(--glow-film-color)';
        case 'Anime': return 'var(--glow-anime-color)';
        case 'SerieTV':
        default: return 'var(--glow-seriestv-color)';
    }
  }

  const rowStyles = {
    marginLeft: '-40px',
    '&:first-of-type': { marginLeft: 0 },
    '&:hover': {
        transform: 'scale(1.15) translateY(-10px)',
        marginLeft: '10px',
        marginRight: '50px',
        borderColor: getGlowColor(),
        boxShadow: `0 15px 25px rgba(0,0,0,0.7), 0 0 20px ${getGlowColor()}`,
    },
  };

  const gridStyles = {
    width: '100%',
    '&:hover': {
        transform: 'scale(1.05)',
        zIndex: 10,
        borderColor: getGlowColor(),
        boxShadow: `0 10px 15px rgba(0,0,0,0.5), 0 0 10px ${getGlowColor()}`,
    },
  };

  const cardBaseStyles = {
    position: 'relative',
    bgcolor: 'transparent',
    flexShrink: 0,
    width: { xs: 160, md: 208, lg: 256 },
    aspectRatio: '2/3',
    transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
    border: '2px solid transparent',
    overflow: 'visible',
    '& .title-overlay': { opacity: 0, transition: 'opacity 0.3s' },
    '&:hover .title-overlay': { opacity: 1 },
    '& .add-to-list-btn': { opacity: 0, transform: 'translateY(10px)', transition: 'opacity 0.3s, transform 0.3s' },
    '&:hover .add-to-list-btn': { opacity: 1, transform: 'translateY(0)' },
  };
        
  const listActionTooltip = isInMyList ? t('card.removeFromList') : t('card.addToList');

  return (
    <MuiCard
      className={className}
      style={style}
      sx={{
        ...cardBaseStyles,
        ...(displayMode === 'row' ? rowStyles : gridStyles),
      }}
      onClick={() => onClick(item)}
      role="button"
      aria-label={t('card.detailsFor', { title })}
    >
      <Tooltip title={listActionTooltip}>
        <IconButton
          className="add-to-list-btn"
          onClick={handleToggleMyList}
          aria-label={listActionTooltip}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 11,
            bgcolor: 'rgba(20, 20, 20, 0.7)',
            color: 'white',
            '&:hover': {
                bgcolor: 'rgba(20, 20, 20, 0.9)',
                transform: 'scale(1.1) translateY(0)', // Override parent hover transform
            },
          }}
        >
          {isInMyList ? <CheckIcon /> : <AddIcon />}
        </IconButton>
      </Tooltip>
      <CardActionArea sx={{ borderRadius: '10px', overflow: 'hidden', height: '100%' }}>
        {item.poster_path ? (
            <CardMedia
              component="img"
              image={item.poster_path}
              alt={title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
        ) : (
            <Box sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.05)',
            }}>
                <TheatersIcon color="disabled" sx={{ fontSize: '6rem' }} />
            </Box>
        )}
        <Box
          className="title-overlay"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          }}
        >
          <Typography variant="subtitle2" color="white" fontWeight="bold" noWrap>
            {title}
          </Typography>
        </Box>
      </CardActionArea>
    </MuiCard>
  );
});