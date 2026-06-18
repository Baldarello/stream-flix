/**
 * @fileoverview DetailHero - Hero section for detail view.
 *
 * Contains backdrop image, poster, title, rating, genres, and release info.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, CardMedia } from '@mui/material';
import TheatersIcon from '@mui/icons-material/Theaters';
import { useTranslations } from '../../hooks/useTranslations.js';
import { DetailBackdrop } from './DetailBackdrop.jsx';
import { DetailHeader } from './DetailHeader.jsx';

export const DetailHero = observer(({ item, backgroundImage, title, releaseDate, isInMyList, listActionLabel, onPlay, onToggleList }) => {
    const { t } = useTranslations();

    return (
        <Box sx={{ position: 'relative', pt: 'env(safe-area-inset-top)' }}>
            <DetailBackdrop backgroundImage={backgroundImage} />

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '350px 1fr' },
                gap: 4,
                p: { xs: 2, md: 8 },
                pt: { xs: 8, md: 8 },
                minHeight: '60vh',
                alignItems: 'center',
            }}>
                {item.poster_path ? (
                    <CardMedia component="img" image={item.poster_path} alt={title} sx={{
                        width: '100%',
                        maxWidth: '350px',
                        aspectRatio: '2/3',
                        borderRadius: 3,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        justifySelf: 'center',
                    }} />
                ) : (
                    <Box sx={{
                        width: '100%',
                        maxWidth: '350px',
                        aspectRatio: '2/3',
                        borderRadius: 3,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        justifySelf: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <TheatersIcon color="disabled" sx={{ fontSize: '6rem' }} />
                    </Box>
                )}
                <DetailHeader
                    item={item}
                    title={title}
                    releaseDate={releaseDate}
                    isInMyList={isInMyList}
                    listActionLabel={listActionLabel}
                    onPlay={onPlay}
                    onToggleList={onToggleList}
                />
            </Box>
        </Box>
    );
});

DetailHero.displayName = 'DetailHero';

export default DetailHero;
