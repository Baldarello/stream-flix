import React from 'react';
import type { MediaItem } from '../types';
import { Card as MuiCard, CardMedia, Typography, Box, CardActionArea } from '@mui/material';

interface CardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  displayMode?: 'row' | 'grid';
}

export const Card: React.FC<CardProps> = ({ item, onClick, displayMode = 'row' }) => {
  const title = item.title || item.name;

  const cardStyles =
    displayMode === 'row'
      ? {
          flexShrink: 0,
          width: { xs: 160, md: 208, lg: 256 },
        }
      : {
          width: '100%',
        };

  return (
    <MuiCard
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
          zIndex: 10,
          boxShadow: '0px 10px 15px rgba(0,0,0,0.5)',
        },
        '&:hover .title-overlay': {
          opacity: 1,
        },
        ...cardStyles,
      }}
      onClick={() => onClick(item)}
      role="button"
      aria-label={`Vedi dettagli per ${title}`}
    >
      <CardActionArea>
        <CardMedia
          component="img"
          image={item.poster_path}
          alt={title}
          sx={{
            aspectRatio: '2/3',
            objectFit: 'cover',
          }}
        />
        <Box
          className="title-overlay"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
        >
          <Typography variant="subtitle2" color="white" fontWeight="bold" noWrap>
            {title}
          </Typography>
        </Box>
      </CardActionArea>
    </MuiCard>
  );
};
