import React from 'react';
// Fix: Changed Grid import to a direct import to solve TypeScript error with the 'item' prop.
import { Box, Container, Typography, Fade } from '@mui/material';
import Grid from '@mui/material/Grid';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { mediaStore } from '../store/mediaStore';
import { observer } from 'mobx-react-lite';

interface GridViewProps {
  title: string;
  items: MediaItem[];
}

const GridView: React.FC<GridViewProps> = ({ title, items }) => {
  return (
    <Fade in={true} timeout={500}>
      <Container maxWidth={false} sx={{ pt: 12, pb: 8, pl: { xs: 2, md: 6 }, pr: { xs: 2, md: 6 } }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4 }}>
          {title}
        </Typography>
        {items.length > 0 ? (
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item key={item.id} xs={6} sm={4} md={3} lg={2}>
                <Card item={item} onClick={() => mediaStore.selectMedia(item)} displayMode="grid" />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              {title === 'La mia lista' 
                ? 'La tua lista è vuota' 
                : 'Nessun contenuto disponibile'}
            </Typography>
            <Typography color="text.secondary">
              {title === 'La mia lista' 
                ? 'Aggiungi film e serie TV per vederli qui.' 
                : 'Torna più tardi per nuovi contenuti.'}
            </Typography>
          </Box>
        )}
      </Container>
    </Fade>
  );
};

export default observer(GridView);
