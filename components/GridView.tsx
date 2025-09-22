import React, { useState } from 'react';
import { Box, Container, Typography, Fade, Grid } from '@mui/material';
import type { MediaItem } from '../types';
import { Card } from './Card';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { observer } from 'mobx-react-lite';
import { useTranslations } from '../hooks/useTranslations';

interface GridViewProps {
  title: string;
  items: MediaItem[];
}

const GridView: React.FC<GridViewProps> = observer(({ title, items }) => {
  const { t } = useTranslations();
  const isMyList = title === t('gridView.myListTitle');
  const isSearch = title.startsWith(t('gridView.searchResultsFor', { query: '' }).replace('"{query}"', ''));
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);


  const renderEmptyState = () => {
    let emptyTitleKey = 'gridView.empty.default.title';
    let emptySubtitleKey = 'gridView.empty.default.subtitle';

    if (isMyList) {
      emptyTitleKey = 'gridView.empty.myList.title';
      emptySubtitleKey = 'gridView.empty.myList.subtitle';
    } else if (isSearch) {
      emptyTitleKey = 'gridView.empty.search.title';
      emptySubtitleKey = 'gridView.empty.search.subtitle';
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {t(emptyTitleKey)}
        </Typography>
        <Typography color="text.secondary">
          {t(emptySubtitleKey)}
        </Typography>
      </Box>
    );
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("itemIndex", index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (index !== draggedIndex) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    mediaStore.reorderMyList(draggedIndex, dropIndex);
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <Fade in={true} timeout={500}>
      <Container maxWidth={false} sx={{ pt: 12, pb: 8, pl: { xs: 2, md: 6 }, pr: { xs: 2, md: 6 } }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4, mt: 4 }}>
          {title}
        </Typography>
        {items.length > 0 ? (
          <Grid container spacing={2}>
            {items.map((mediaItem, index) => (
              // FIX: Added the "item" prop. The breakpoint props (xs, sm, etc.) are only valid on a Grid item within a Grid container.
              <Grid 
                item 
                key={mediaItem.id} 
                xs={6} sm={4} md={3} lg={2} 
                draggable={isMyList}
                onDragStart={(e) => isMyList && handleDragStart(e, index)}
                onDragOver={(e) => isMyList && handleDragOver(e, index)}
                onDrop={(e) => isMyList && handleDrop(e, index)}
                onDragEnd={() => isMyList && handleDragEnd()}
                onDragLeave={() => setDropTargetIndex(null)}
                className={`${draggedIndex === index ? 'dragging-item' : ''} ${dropTargetIndex === index ? 'drop-target-item' : ''}`}
                sx={{
                  transition: 'opacity 0.3s, transform 0.3s, border 0.2s, box-shadow 0.2s',
                  animation: `fadeInUp 0.5s ${index * 0.05}s ease-out both`,
                  cursor: isMyList ? 'grab' : 'default',
                  '@keyframes fadeInUp': {
                      'from': {
                          opacity: 0,
                          transform: 'translateY(20px)'
                      },
                      'to': {
                          opacity: 1,
                          transform: 'translateY(0)'
                      }
                  }
              }}>
                <Card item={mediaItem} onClick={() => mediaStore.selectMedia(mediaItem, 'detailView')} displayMode="grid" style={{
                  minHeight:"756px",
                  minWidth:"504px"
                }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          renderEmptyState()
        )}
      </Container>
    </Fade>
  );
});

export default GridView;