/**
 * @fileoverview CinematicRow - futuristic horizontal content row.
 *
 * Wraps the same scroll-and-reorder behavior as the legacy `ContentRow.jsx`
 * but uses the `HoloCard`, the futuristic typography, and a GSAP stagger
 * reveal. The public prop contract is preserved (title, items,
 * onCardClick, isContinueWatching, isReorderable) so the existing
 * `HomeView`/`GridView` callers keep working.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import { gsap } from 'gsap';
import { useTranslations } from '../../hooks/useTranslations.js';
import { mediaStore } from '../../store/mediaStore.js';
import { HoloCard } from './HoloCard.jsx';
import { durations, easings, stagger as motionStagger, reducedMotion } from '../../motion/grammar.js';

const CinematicRowInner = ({
    id = 'row-cinematic',
    title,
    items = [],
    onCardClick,
    isContinueWatching = false,
    isReorderable = false
}) => {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const { t } = useTranslations();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const checkScrollability = () => {
        const el = scrollContainerRef.current;
        if (el) {
            setCanScrollLeft(el.scrollLeft > 1);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
        }
    };

    useEffect(() => {
        checkScrollability();
        const el = scrollContainerRef.current;
        if (!el) return undefined;
        el.addEventListener('scroll', checkScrollability);
        const ro = new ResizeObserver(checkScrollability);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', checkScrollability);
            ro.disconnect();
        };
    }, [items]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || reducedMotion()) return;
        const cards = el.querySelectorAll('[data-component="holo-card"]');
        if (cards.length === 0) return;
        gsap.fromTo(cards,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: durations.med, ease: easings.standard, stagger: motionStagger.row, overwrite: 'auto' });
    }, [items && items.length]);

    const handleScroll = (dir) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const card = el.querySelector('[data-component="holo-card"]');
        const step = card ? card.clientWidth + 16 : el.clientWidth * 0.8;
        el.scrollBy({ left: dir * step * 1.5, behavior: 'smooth' });
    };

    const handleCardClick = useCallback((item) => onCardClick && onCardClick(item), [onCardClick]);

    return (
        <Box
            id={id}
            data-component="cinematic-row"
            sx={{
                position: 'relative',
                zIndex: 0,
                '&:hover .row-arrow': { opacity: 1 }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 2 }}>
                <Typography
                    variant="h5"
                    data-testid="row-title"
                    sx={{
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.01em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 12px rgba(76, 210, 255, 0.15)',
                        pl: { xs: 1, md: 0 }
                    }}
                >
                    {title}
                </Typography>
                {isReorderable && (
                    <IconButton
                        id="row-reorder-toggle"
                        aria-label="reorder"
                        onClick={() => mediaStore.toggleReorderMode && mediaStore.toggleReorderMode()}
                        sx={{ color: 'var(--text-secondary)' }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>
            <Box sx={{ position: 'relative' }}>
                <IconButton
                    className="row-arrow"
                    aria-label="scroll-left"
                    onClick={() => handleScroll(-1)}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                        opacity: canScrollLeft ? 1 : 0,
                        transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)',
                        bgcolor: 'rgba(5, 6, 13, 0.7)',
                        color: 'var(--neon-accent)',
                        '&:hover': { bgcolor: 'rgba(5, 6, 13, 0.9)' }
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>
                <IconButton
                    className="row-arrow"
                    aria-label="scroll-right"
                    onClick={() => handleScroll(1)}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        right: 0,
                        transform: 'translateY(-50%)',
                        zIndex: 5,
                        opacity: canScrollRight ? 1 : 0,
                        transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)',
                        bgcolor: 'rgba(5, 6, 13, 0.7)',
                        color: 'var(--neon-accent)',
                        '&:hover': { bgcolor: 'rgba(5, 6, 13, 0.9)' }
                    }}
                >
                    <ChevronRightIcon />
                </IconButton>
                <Box
                    ref={scrollContainerRef}
                    className="filmstrip-container"
                    data-testid="row-strip"
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 1.5,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollSnapType: 'x mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                        py: 1,
                        px: { xs: 1, md: 0 }
                    }}
                >
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <Box key={item.id} sx={{ scrollSnapAlign: 'start' }}>
                                <HoloCard
                                    item={item}
                                    onClick={handleCardClick}
                                    displayMode="row"
                                    isContinueWatching={isContinueWatching}
                                    isReorderable={isReorderable && !isMobile}
                                />
                            </Box>
                        ))
                    ) : (
                        <Typography
                            sx={{ color: 'var(--text-secondary)', py: 4, px: 2 }}
                        >
                            {t('contentRow.empty')}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export const CinematicRow = observer(CinematicRowInner);
CinematicRow.displayName = 'CinematicRow';
