import React from 'react';
// FIX: The `item` prop on the `Grid` component was causing a type error.
// This is often due to how types are resolved. Consolidating imports and using
// a named import for `Grid` aligns with other files and should fix the type issue.
import { Box, Container, Typography, Fade, Grid } from '@mui/material';
import type { MediaItem } from '../types';
import { Card } from './Card';
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

  return (
    <Fade in={true} timeout={500}>
      <Container maxWidth={false} sx={{ pt: 12, pb: 8, pl: { xs: 2, md: 6 }, pr: { xs: 2, md: 6 } }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 4, mt: 4 }}>
          {title}
        </Typography>
        {items.length > 0 ? (
          <Grid container spacing={2}>
            {items.map((item, index) => (
              <Grid item key={item.id} xs={6} sm={4} md={3} lg={2} sx={{
                  transition: 'opacity 0.5s, transform 0.5s',
                  animation: `fadeInUp 0.5s ${index * 0.05}s ease-out both`,
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
});

export default GridView;