/**
 * @fileoverview CinematicGrid - futuristic grid view for Series/Films/Anime/MyList.
 *
 * Replaces the legacy `GridView.jsx`. Same public contract (`title`,
 * `items`, `id`) so FeatureRouter keeps working. The grid uses the
 * `HoloCard` and a GSAP stagger reveal. Empty states render the
 * futuristic `Skeleton` placeholders.
 */

import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Typography} from '@mui/material';
import {gsap} from 'gsap';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloCard} from './HoloCard.jsx';
import {mediaStore} from '../../store/mediaStore.js';
import {SkeletonCard} from '../feedback/Skeleton.jsx';
import {durations, easings, reducedMotion, stagger as motionStagger} from '../../motion/grammar.js';

const CinematicGridInner = ({
    id = 'grid-cinematic',
    title,
    items = [],
    onCardClick,
    emptyKey = 'gridView.empty.default',
}) => {
    const { t } = useTranslations();
    const gridRef = useRef(null);

    useEffect(() => {
        const el = gridRef.current;
        if (!el || reducedMotion()) return;
        const cards = el.querySelectorAll('[data-component="holo-card"]');
        if (cards.length === 0) return;
        gsap.fromTo(cards,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: durations.med, ease: easings.standard, stagger: motionStagger.grid, overwrite: 'auto' });
    }, [items && items.length]);

    // Cards are clickable when the parent supplies a handler. The
    // default (no handler) is to open the detail view through
    // `mediaStore.selectMedia` so search results, the Series/Film/
    // Anime/MyList grids and any other caller don't have to wire
    // the same boilerplate.
    const handleCardClick = onCardClick || ((item) => mediaStore.selectMedia(item));

    return (
        <Box id={id} data-component="cinematic-grid" sx={{ pt: 'calc(80px + env(safe-area-inset-top))' }}>
            <Typography
                variant="h3"
                data-testid="grid-title"
                sx={{
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: 'var(--text-primary)',
                    textShadow: 'var(--hologram-shadow)',
                    px: { xs: 2, md: 6 },
                    pt: 2,
                    pb: 1
                }}
            >
                {title}
            </Typography>
            {items && items.length > 0 ? (
                <Box
                    ref={gridRef}
                    data-testid="grid-grid"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                            lg: 'repeat(5, 1fr)',
                            xl: 'repeat(6, 1fr)'
                        },
                        gap: { xs: 1.5, md: 2.5 },
                        px: { xs: 2, md: 6 },
                        py: 2
                    }}
                >
                    {items.map((item) => (
                        <HoloCard
                            key={item.id}
                            item={item}
                            onClick={handleCardClick}
                            displayMode="grid"
                        />
                    ))}
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, px: { xs: 2, md: 6 } }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Box key={i} sx={{ flex: '1 1 200px', maxWidth: 280 }}>
                            <SkeletonCard index={i} />
                        </Box>
                    ))}
                    <Box
                        sx={{
                            width: '100%',
                            textAlign: 'center',
                            py: 4,
                            color: 'var(--text-secondary)',
                        }}
                        data-testid="grid-empty"
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {t(`${emptyKey}.title`)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                            {t(`${emptyKey}.subtitle`)}
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export const CinematicGrid = observer(CinematicGridInner);
CinematicGrid.displayName = 'CinematicGrid';
