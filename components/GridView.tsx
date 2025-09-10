import React from 'react';
import { Box, Container, Typography, Fade, Grid } from '@mui/material';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { mediaStore } from '../store/mediaStore';
import { observer } from 'mobx-react-lite';

interface GridViewProps {
  title: string;
  items: MediaItem[];
}

const GridView: React.FC<GridViewProps> = ({ title, items }) => {
  const isMyList = title === 'La mia lista';
  const isSearch = title.startsWith('Risultati per');

  const renderEmptyState = () => {
    let emptyTitle = 'Nessun contenuto disponibile';
    let emptySubtitle = 'Torna più tardi per nuovi contenuti.';

    if (isMyList) {
      emptyTitle = 'La tua lista è vuota';
      emptySubtitle = 'Aggiungi film e serie TV per vederli qui.';
    } else if (isSearch) {
      emptyTitle = 'Nessun risultato trovato';
      emptySubtitle = 'Prova a cercare qualcos\'altro o controlla che il titolo sia corretto.';
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {emptyTitle}
        </Typography>
        <Typography color="text.secondary">
          {emptySubtitle}
        </Typography>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Container maxWidth={false} sx={{ pt: 12, pb: 8, pl: { xs: 2, md: 6 }, pr: { xs: 2, md: 6 } }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4 }}>
          {title}
        </Typography>
        {items.length > 0 ? (
          <Grid container spacing={2}>
            {items.map((item) => (
              // FIX: Removed 'item' prop from Grid to resolve a TypeScript error.
              // A Grid component that is a direct child of a Grid container is implicitly an item.
              <Grid key={item.id} xs={6} sm={4} md={3} lg={2}>
                <Card item={item} onClick={() => mediaStore.selectMedia(item)} displayMode="grid" />
              </Grid>
            ))}
          </Grid>
        ) : (
          renderEmptyState()
        )}
      </Container>
    </Fade>
  );
};

export default observer(GridView);
