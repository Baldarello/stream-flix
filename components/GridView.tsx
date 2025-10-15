
import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Card } from './Card';
import type { MediaItem } from '../types';
import { useNavigate } from 'react-router';
import { useTranslations } from '../hooks/useTranslations';

interface GridViewProps {
    title: string;
    items: MediaItem[];
}

const GridView: React.FC<GridViewProps> = observer(({ title, items }) => {
    const navigate = useNavigate();
    const { t } = useTranslations();

    const handleCardClick = (item: MediaItem) => {
        navigate(`/detail/${item.media_type}/${item.id}`);
    };

    const renderEmptyState = () => {
        let emptyKey: string;
        if (title === t('gridView.myListTitle')) {
            emptyKey = 'myList';
        } else if (title.startsWith(t('gridView.searchResultsFor', { query: '' }).split('"')[0])) {
            emptyKey = 'search';
        } else {
            emptyKey = 'default';
        }

        return (
            <Box sx={{ textAlign: 'center', mt: 10 }}>
                <Typography variant="h5" component="p" gutterBottom>
                    {t(`gridView.empty.${emptyKey}.title`)}
                </Typography>
                <Typography color="text.secondary">
                    {t(`gridView.empty.${emptyKey}.subtitle`)}
                </Typography>
            </Box>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ pt: { xs: 12, md: 16 }, pb: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" sx={{ mb: 4, pl: { xs: 1, sm: 0 } }}>
                {title}
            </Typography>
            {items.length > 0 ? (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                    {items.map(item => (
                        <Grid item key={item.id} xs={6} sm={4} md={3} lg={2.4} xl={2}>
                            <Card 
                                item={item} 
                                onClick={handleCardClick}
                                displayMode="grid"
                            />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                renderEmptyState()
            )}
        </Container>
    );
});

export default GridView;