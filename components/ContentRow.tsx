import React from 'react';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { Box, Typography } from '@mui/material';
import { mediaStore } from '../store/mediaStore';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
}

export const ContentRow: React.FC<ContentRowProps> = ({ title, items }) => {
  return (
    <Box component="section">
      <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          pb: 2,
          gap: 2,
          // Hide scrollbar but keep functionality
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none', // For Firefox
        }}
      >
        {items.map((item) => (
          <Card key={item.id} item={item} onClick={() => mediaStore.selectMedia(item)} />
        ))}
      </Box>
    </Box>
  );
};
