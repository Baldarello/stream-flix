import React, {useEffect, useRef, useState, useCallback} from 'react';
import type {MediaItem} from '../types.ts';
import {Card} from './Card.tsx';
import {Box, Fade, IconButton, Snackbar, Typography, useMediaQuery, useTheme} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {observer} from 'mobx-react-lite';
import {useTranslations} from '../hooks/useTranslations.ts';
import {mediaStore} from '../store/mediaStore.ts';

interface ContentRowProps {
    title: string;
    items: MediaItem[];
    onCardClick: (item: MediaItem) => void;
    isContinueWatching?: boolean;
    isReorderable?: boolean;
}

export const ContentRow: React.FC<ContentRowProps> = observer(({
                                                                   title,
                                                                   items,
                                                                   onCardClick,
                                                                   isContinueWatching,
                                                                   isReorderable = false
                                                               }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const {t} = useTranslations();

    // Detect mobile and my list context
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isMyList = title.toLowerCase().includes('my list') || title.toLowerCase().includes('mia lista');

    // Long Press + Tap reorder state (mobile only)
    const [selectedForReorder, setSelectedForReorder] = useState<number | null>(null);
    const [reorderHint, setReorderHint] = useState<string | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef<boolean>(false);
    const [swipeTargetIndex, setSwipeTargetIndex] = useState<number | null>(null);
    const touchStartYRef = useRef<number>(0);

    // State for Drag and Drop (desktop only)
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

    const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const LONG_PRESS_DURATION = 500; // ms for long press detection

    // Clear reorder hint when selection changes
    useEffect(() => {
        if (selectedForReorder !== null) {
            setReorderHint(t('contentRow.tapToSwap') || 'Tap another card to swap');
        } else {
            setReorderHint(null);
        }
    }, [selectedForReorder, t]);

    // Long Press handlers for mobile reorder
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, index: number) => {
        if (!isReorderable || !isMobile) return;

        // Prevent event propagation and default touch behavior
        e.stopPropagation();
        e.preventDefault();

        // Store initial touch Y position for swipe detection
        const touch = e.touches[0];
        touchStartYRef.current = touch.clientY;

        // Clear any existing timer
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        // Reset long press flag
        isLongPressRef.current = false;

        // Start long press timer
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setSelectedForReorder(index);
        }, LONG_PRESS_DURATION);
    }, [isReorderable, isMobile]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        // Prevent event propagation and default touch behavior
        e.stopPropagation();
        e.preventDefault();

        // Cancel long press if user moves finger
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        // Only track swipe if long press was triggered
        if (!isLongPressRef.current || selectedForReorder === null) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - touchStartYRef.current;

        // Only consider significant vertical swipe (> 30px)
        if (Math.abs(deltaY) > 30) {
            const container = scrollContainerRef.current;
            if (!container) return;

            // Get all card elements
            const cardElements = container.querySelectorAll('.dnd-wrapper');
            const containerRect = container.getBoundingClientRect();
            const targetY = touch.clientY;

            // Find which card the user is swiping over
            let targetIndex: number | null = null;
            cardElements.forEach((card, idx) => {
                const rect = card.getBoundingClientRect();
                if (targetY >= rect.top && targetY <= rect.bottom) {
                    targetIndex = idx;
                }
            });

            if (targetIndex !== null && targetIndex !== selectedForReorder) {
                setSwipeTargetIndex(targetIndex);
            }
        }
    }, [selectedForReorder]);

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>, index: number) => {
        // Prevent event propagation and default touch behavior
        e.stopPropagation();
        e.preventDefault();

        // Cancel long press timer
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (!isReorderable || !isMobile) return;

        // If long press was triggered, check for swipe-based reorder
        if (isLongPressRef.current) {
            isLongPressRef.current = false;

            // If user swiped to a different target, perform the swap
            if (swipeTargetIndex !== null && swipeTargetIndex !== selectedForReorder) {
                mediaStore.reorderMyList(selectedForReorder, swipeTargetIndex);
            }

            // Reset all states
            setSelectedForReorder(null);
            setSwipeTargetIndex(null);
            return;
        }

        // Regular tap - if a card is already selected, swap or deselect
        if (selectedForReorder !== null) {
            if (selectedForReorder === index) {
                // Tap on same card - deselect
                setSelectedForReorder(null);
            } else {
                // Tap on different card - swap positions
                mediaStore.reorderMyList(selectedForReorder, index);
                setSelectedForReorder(null);
            }
        }
    }, [isReorderable, isMobile, selectedForReorder, swipeTargetIndex]);

    // Handle click for desktop (when not dragging)
    const handleCardClick = useCallback((item: MediaItem, index: number) => {
        if (!isReorderable || isMobile) {
            onCardClick(item);
            return;
        }
        onCardClick(item);
    }, [isReorderable, isMobile, onCardClick]);

    const checkScrollability = () => {
        const el = scrollContainerRef.current;
        if (el) {
            const tolerance = 1;
            setCanScrollLeft(el.scrollLeft > tolerance);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - tolerance);
        }
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        checkScrollability();

        const handleResize = () => checkScrollability();
        const handleScrollEvent = () => checkScrollability();

        window.addEventListener('resize', handleResize);
        el.addEventListener('scroll', handleScrollEvent);

        const timer = setTimeout(checkScrollability, 500);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (el) {
                el.removeEventListener('scroll', handleScrollEvent);
            }
            clearTimeout(timer);
        };
    }, [items]);

    // Auto-scroll during drag when near edges
    const startAutoScroll = useCallback((direction: 'left' | 'right') => {
        if (autoScrollRef.current) return;
        autoScrollRef.current = setInterval(() => {
            const el = scrollContainerRef.current;
            if (el) {
                const scrollAmount = 15;
                el.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
            }
        }, 16); // ~60fps
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopAutoScroll();
        };
    }, [stopAutoScroll]);

    const handleScroll = (direction: 'left' | 'right') => {
        const el = scrollContainerRef.current;
        if (el) {
            const scrollAmount = el.clientWidth * 0.8;
            el.scrollTo({
                left: el.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount),
                behavior: 'smooth',
            });
        }
    };

    // Quick reorder handlers - move item to top or bottom
    const moveToTop = (index: number) => {
        if (index > 0) {
            mediaStore.reorderMyList(index, 0);
        }
    };

    const moveToBottom = (index: number) => {
        if (index < items.length - 1) {
            mediaStore.reorderMyList(index, items.length - 1);
        }
    };

    // Drag and Drop handlers (desktop only)
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("itemIndex", index.toString());
        setDraggedIndex(index);
        setIsDragging(true);
        setActiveDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (index !== draggedIndex) {
            setDropTargetIndex(index);
        }

        // Auto-scroll near edges during drag
        const container = scrollContainerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            const edgeThreshold = 80;
            if (e.clientX < rect.left + edgeThreshold) {
                startAutoScroll('left');
            } else if (e.clientX > rect.right - edgeThreshold) {
                startAutoScroll('right');
            } else {
                stopAutoScroll();
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        stopAutoScroll();
        if (draggedIndex === null) return;
        mediaStore.reorderMyList(draggedIndex, dropIndex);
        handleDragEnd();
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDropTargetIndex(null);
        setIsDragging(false);
        setActiveDragIndex(null);
        stopAutoScroll();
    };

    const scrollButtonStyles = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        height: '100%',
        width: '4rem',
        zIndex: 20,
        color: 'white',
        borderRadius: 0,
        backgroundColor: 'transparent',
        '&:hover': {
            backgroundColor: 'rgba(20, 20, 30, 0.8)',
        },
    };

    return (
        <Box component="section">
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0}}>
                <Typography variant="h5" component="h2" fontWeight="bold">
                    {title}
                </Typography>
                {isMobile && isReorderable && (
                    <Typography variant="caption" color="warning.main" sx={{opacity: 0.8}}>
                        {t('contentRow.holdToReorder') || 'Hold to reorder'}
                    </Typography>
                )}
            </Box>
            
            <Box
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    stopAutoScroll();
                }}
                sx={{position: 'relative'}}
            >
                {/* Scroll Left Button */}
                <Fade in={(isMobile && isMyList) || (isHovered && canScrollLeft)}>
                    <IconButton
                        onClick={() => handleScroll('left')}
                        sx={{
                            ...scrollButtonStyles,
                            left: 0,
                            opacity: (isMobile && isMyList) ? 1 : undefined,
                        }}
                        aria-label={t('contentRow.scrollLeft')}
                    >
                        <ChevronLeftIcon fontSize="large"/>
                    </IconButton>
                </Fade>

                <Box
                    ref={scrollContainerRef}
                    className={`filmstrip-container ${isDragging ? 'is-dragging' : ''} ${selectedForReorder !== null ? 'is-reorder-mode' : ''} ${swipeTargetIndex !== null ? 'is-swiping' : ''}`}
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        py: 6,
                        px: 'calc(4rem + 40px)',
                        marginLeft: '-4rem',
                        scrollPadding: '0 0 0 calc(4rem + 40px)',
                        scrollBehavior: 'smooth',
                        '&::-webkit-scrollbar': {
                            display: 'none',
                        },
                        scrollbarWidth: 'none',
                        '&:hover .media-card': {
                            opacity: 0.4,
                        },
                        '&:hover .media-card:hover': {
                            opacity: 1,
                        },
                        '&:hover .dnd-wrapper:hover ~ .dnd-wrapper': {
                            transform: 'translateX(60px)',
                        }
                    }}
                >
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`dnd-wrapper ${draggedIndex === index ? 'dragging-item' : ''} ${dropTargetIndex === index ? 'drop-target-item' : ''} ${selectedForReorder === index ? 'long-press-selected' : ''} ${swipeTargetIndex === index ? 'reorder-target' : ''}`}
                            draggable={isReorderable && !isMobile}
                            onDragStart={(e) => isReorderable && !isMobile && handleDragStart(e, index)}
                            onDragOver={(e) => isReorderable && !isMobile && handleDragOver(e, index)}
                            onDrop={(e) => isReorderable && !isMobile && handleDrop(e, index)}
                            onDragEnd={() => isReorderable && !isMobile && handleDragEnd()}
                            onDragLeave={() => {
                                if (isReorderable && !isMobile) setDropTargetIndex(null);
                                stopAutoScroll();
                            }}
                            // Mobile touch handlers for long press reorder
                            onTouchStart={(e) => isReorderable && isMobile && handleTouchStart(e, index)}
                            onTouchMove={(e) => isReorderable && isMobile && handleTouchMove(e)}
                            onTouchEnd={(e) => isReorderable && isMobile && handleTouchEnd(e, index)}
                            style={{
                                marginLeft: index === 0 ? 0 : '-40px',
                                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            }}
                        >
                            <Card
                                item={item}
                                onClick={() => handleCardClick(item, index)}
                                displayMode="row"
                                className="media-card"
                                style={{zIndex: items.length - index}}
                                isContinueWatching={isContinueWatching}
                                isReorderable={isReorderable}
                                onReorderTop={() => moveToTop(index)}
                                onReorderBottom={() => moveToBottom(index)}
                                isDragActive={activeDragIndex === index}
                            />
                        </div>
                    ))}
                </Box>

                {/* Scroll Right Button */}
                <Fade in={(isMobile && isMyList) || (isHovered && canScrollRight)}>
                    <IconButton
                        onClick={() => handleScroll('right')}
                        sx={{
                            ...scrollButtonStyles,
                            right: 0,
                            opacity: (isMobile && isMyList) ? 1 : undefined,
                        }}
                        aria-label={t('contentRow.scrollRight')}
                    >
                        <ChevronRightIcon fontSize="large"/>
                    </IconButton>
                </Fade>
            </Box>

            {/* Reorder hint snackbar */}
            <Snackbar
                open={selectedForReorder !== null}
                message={reorderHint || ''}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                sx={{
                    '& .MuiSnackbarContent-root': {
                        bgcolor: '#ff9800',
                    }
                }}
            />
        </Box>
    );
});
