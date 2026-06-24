/**
 * @fileoverview CinematicRow - futuristic horizontal content row.
 *
 * Wraps the same scroll-and-reorder behavior as the legacy `ContentRow.jsx`
 * but uses the `HoloCard`, the futuristic typography, and a GSAP stagger
 * reveal. The public prop contract is preserved (title, items,
 * onCardClick, isContinueWatching, isReorderable) so the existing
 * `HomeView`/`GridView` callers keep working.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {Box, IconButton, Tooltip, Typography, useMediaQuery, useTheme} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {gsap} from 'gsap';
import {useTranslations} from '../../hooks/useTranslations.js';
import {mediaStore} from '../../store/mediaStore.js';
import {HoloCard} from './HoloCard.jsx';
import {durations, easings, stagger as motionStagger, reducedMotion} from '../../motion/grammar.js';

const CinematicRowInner = ({
                               id = 'row-cinematic',
                               title,
                               items = [],
                               onCardClick,
                               isContinueWatching = false,
                               isReorderable = false,
                               onViewDetail,
                               viewDetailLabel
                           }) => {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(() => false);
    const [canScrollRight, setCanScrollRight] = useState(() => false);
    // Transient drag-and-drop state for the inline reorder path.
    // Kept as local React state (not MobX) because it is a pure
    // UI concern; the actual persistence is delegated to
    // `mediaStore.reorderMyList`.
    //
    // We also keep refs that update synchronously. The native
    // HTML5 drag events fire in a tight sequence
    // (dragstart -> dragenter -> dragover -> drop -> dragend) and
    // the test harness dispatches them in the same JS tick, so
    // React's batched state updates are not visible to the next
    // handler in the chain. The refs let each handler see the
    // value set by the previous handler.
    const [dragItemId, setDragItemId] = useState(() => null);
    const [dropTargetId, setDropTargetId] = useState(() => null);
    const dragItemIdRef = useRef(null);
    const dropTargetIdRef = useRef(null);
    const {t} = useTranslations();
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
            {y: 16, autoAlpha: 0},
            {
                y: 0,
                autoAlpha: 1,
                duration: durations.med,
                ease: easings.standard,
                stagger: motionStagger.row,
                overwrite: 'auto'
            });
    }, [items && items.length]);

    const handleScroll = (dir) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const card = el.querySelector('[data-component="holo-card"]');
        const step = card ? card.clientWidth + 16 : el.clientWidth * 0.8;
        el.scrollBy({left: dir * step * 1.5, behavior: 'smooth'});
    };

    const handleCardClick = useCallback((item) => onCardClick && onCardClick(item), [onCardClick]);

    // ===== Drag-and-drop reorder handlers =====
    const handleReorderTop = useCallback((item) => {
        if (!item || !mediaStore.myList.includes(item.id)) return;
        const idx = mediaStore.myList.indexOf(item.id);
        if (idx > 0) mediaStore.reorderMyList(idx, 0);
    }, []);

    const handleReorderBottom = useCallback((item) => {
        if (!item || !mediaStore.myList.includes(item.id)) return;
        const idx = mediaStore.myList.indexOf(item.id);
        const last = mediaStore.myList.length - 1;
        if (idx >= 0 && idx < last) mediaStore.reorderMyList(idx, last);
    }, []);

    // The drag handlers read from the refs (not from the React
    // state) so that the chain of native HTML5 drag events sees
    // the values set by the previous handler, even when the
    // events are dispatched synchronously in the same JS tick
    // (as the Playwright test does).
    const handleCardDragStart = useCallback((item) => {
        if (!item) return;
        dragItemIdRef.current = item.id;
        dropTargetIdRef.current = null;
        setDragItemId(item.id);
        setDropTargetId(null);
    }, []);

    const handleCardDragEnter = useCallback((item) => {
        if (!item) return;
        if (dragItemIdRef.current === item.id) return;
        dropTargetIdRef.current = item.id;
        setDropTargetId(item.id);
    }, []);

    const handleCardDragOver = useCallback((event) => {
        // preventDefault is required on dragover to allow the drop
        // event to fire.
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    }, []);

    const handleCardDragLeave = useCallback((item) => {
        if (!item) return;
        if (dropTargetIdRef.current === item.id) {
            dropTargetIdRef.current = null;
            setDropTargetId(null);
        }
    }, []);

    const handleCardDragEnd = useCallback(() => {
        // Persist the new order if we have both a source and a
        // drop target. Read from refs so the value is current
        // even when this handler is called synchronously after
        // the drop / dragstart handlers.
        const src = dragItemIdRef.current;
        const tgt = dropTargetIdRef.current;
        if (src != null && tgt != null && src !== tgt) {
            const sourceIdx = mediaStore.myList.indexOf(src);
            const targetIdx = mediaStore.myList.indexOf(tgt);
            if (sourceIdx >= 0 && targetIdx >= 0) {
                mediaStore.reorderMyList(sourceIdx, targetIdx);
            }
        }
        dragItemIdRef.current = null;
        dropTargetIdRef.current = null;
        setDragItemId(null);
        setDropTargetId(null);
    }, []);

    const canReorderInline = isReorderable && !isMobile;

    return (
        <Box
            id={id}
            data-component="cinematic-row"
            sx={{
                position: 'relative',
                zIndex: 0,
                '&:hover .row-arrow': {opacity: 1}
            }}
        >
            <Box sx={{display: 'flex', alignItems: 'center', mb: 1.5, gap: 2}}>
                <Typography
                    variant="h5"
                    data-testid="row-title"
                    sx={{
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.01em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 12px rgba(76, 210, 255, 0.15)',
                        pl: {xs: 1, md: 0}
                    }}
                >
                    {title}
                </Typography>
                {isReorderable && typeof onViewDetail === 'function' && (
                    <Tooltip title={viewDetailLabel || t('contentRow.openDetail')}>
                        <IconButton
                            id="row-view-detail"
                            data-component="row-view-detail"
                            aria-label={viewDetailLabel || t('contentRow.openDetail')}
                            onClick={() => onViewDetail && onViewDetail()}
                            sx={{
                                color: 'var(--neon-accent)',
                                border: '1px solid rgba(76, 210, 255, 0.45)',
                                borderRadius: '999px',
                                padding: '6px',
                                transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                                '&:hover': {
                                    background: 'rgba(76, 210, 255, 0.18)',
                                    transform: 'translateY(-1px) scale(1.05)',
                                    boxShadow: '0 0 14px rgba(76, 210, 255, 0.4)'
                                },
                                '&:focus-visible': {outline: '2px solid var(--neon-accent)', outlineOffset: 2}
                            }}
                        >
                            <OpenInNewIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                )}
                {isReorderable && typeof onViewDetail !== 'function' && (
                    <IconButton
                        id="row-reorder-toggle"
                        aria-label="reorder"
                        onClick={() => mediaStore.toggleReorderMode && mediaStore.toggleReorderMode()}
                        sx={{color: 'var(--text-secondary)'}}
                    >
                        <EditIcon fontSize="small"/>
                    </IconButton>
                )}
            </Box>
            <Box sx={{position: 'relative'}}>
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
                        '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.9)'}
                    }}
                >
                    <ChevronLeftIcon/>
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
                        '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.9)'}
                    }}
                >
                    <ChevronRightIcon/>
                </IconButton>
                <Box
                    ref={scrollContainerRef}
                    className={`filmstrip-container${dragItemId != null ? ' is-dragging' : ''}`}
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
                        '&::-webkit-scrollbar': {display: 'none'},
                        py: 1,
                        px: {xs: 1, md: 0}
                    }}
                >
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <Box key={item.id} sx={{scrollSnapAlign: 'start'}}>
                                <HoloCard
                                    item={item}
                                    onClick={handleCardClick}
                                    displayMode="row"
                                    isContinueWatching={isContinueWatching}
                                    isReorderable={canReorderInline}
                                    isDragActive={canReorderInline && dragItemId === item.id}
                                    isDropTarget={canReorderInline && dropTargetId === item.id && dragItemId !== item.id}
                                    onReorderTop={canReorderInline ? () => handleReorderTop(item) : undefined}
                                    onReorderBottom={canReorderInline ? () => handleReorderBottom(item) : undefined}
                                    onDragStartCard={canReorderInline ? () => handleCardDragStart(item) : undefined}
                                    onDragEnterCard={canReorderInline ? () => handleCardDragEnter(item) : undefined}
                                    onDragOverCard={canReorderInline ? handleCardDragOver : undefined}
                                    onDragLeaveCard={canReorderInline ? () => handleCardDragLeave(item) : undefined}
                                    onDragEndCard={canReorderInline ? handleCardDragEnd : undefined}
                                />
                            </Box>
                        ))
                    ) : (
                        <Typography
                            sx={{color: 'var(--text-secondary)', py: 4, px: 2}}
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
