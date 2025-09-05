import React from 'react';
import type { MediaItem } from '../types';
import { Card as MuiCard, CardMedia, Typography, Box, CardActionArea } from '@mui/material';

interface CardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export const Card: React.FC<CardProps> = ({ item, onClick }) => {
  const title = item.title || item.name;

  return (
    <MuiCard
      sx={{
        position: 'relative',
        flexShrink: 0,
        width: { xs: 160, md: 208, lg: 256 },
        bgcolor: 'background.paper',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'scale(1.05)',
          zIndex: 10,
          boxShadow: '0px 10px 15px rgba(0,0,0,0.5)',
        },
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
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            opacity: 0,
            transition: 'opacity 0.3s',
            '&:hover': {
              opacity: 1,
            },
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
