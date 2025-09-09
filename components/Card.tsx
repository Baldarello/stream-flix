import React from 'react';
import type { MediaItem } from '../types';
import { Card as MuiCard, CardMedia, Typography, Box, CardActionArea, IconButton, Tooltip } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';

interface CardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  displayMode?: 'row' | 'grid';
}

export const Card: React.FC<CardProps> = observer(({ item, onClick, displayMode = 'row' }) => {
  const title = item.title || item.name;
  const isInMyList = mediaStore.myList.includes(item.id);

  const handleToggleMyList = (event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the card's onClick handler
    event.stopPropagation();
    mediaStore.toggleMyList(item);
  };

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
        '&:hover .add-to-list-btn': {
            opacity: 1,
        },
        ...cardStyles,
      }}
      onClick={() => onClick(item)}
      role="button"
      aria-label={`Vedi dettagli per ${title}`}
    >
      <Tooltip title={isInMyList ? 'Rimuovi dalla mia lista' : 'Aggiungi alla mia lista'}>
        <IconButton
          className="add-to-list-btn"
          onClick={handleToggleMyList}
          aria-label={isInMyList ? 'Rimuovi dalla mia lista' : 'Aggiungi alla mia lista'}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 11,
            bgcolor: 'rgba(20, 20, 20, 0.7)',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
            '&:hover': {
                bgcolor: 'rgba(20, 20, 20, 0.9)',
                transform: 'scale(1.1)',
            },
          }}
        >
          {isInMyList ? <CheckIcon /> : <AddIcon />}
        </IconButton>
      </Tooltip>
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
});
