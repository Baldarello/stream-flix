import React, {useCallback, useEffect, useRef, useState} from 'react';

import {Card} from '../layout/Card.jsx';
import {Box, Fade, IconButton, Typography, useMediaQuery, useTheme} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import {observer} from 'mobx-react-lite';
import {useTranslations} from '../../hooks/useTranslations.js';
import {mediaStore} from '../../store/mediaStore.js';
import {ReorderDrawer} from '../utilities/ReorderDrawer.jsx';


export const ContentRow = observer(({
                                                                   title,
                                                                   items,
                                                                   onCardClick,
                                                                   isContinueWatching,
                                                                   isReorderable = false
                                                               }) => {
    const scrollContainerRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [isReorderDrawerOpen, setIsReorderDrawerOpen] = useState(false);
    const {t} = useTranslations();

    // Detect mobile and my list context
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isMyList = title.toLowerCase().includes('my list') || title.toLowerCase().includes('mia lista');

    // State for Drag and Drop (desktop only)
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dropTargetIndex, setDropTargetIndex] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeDragIndex, setActiveDragIndex] = useState(null);

    const autoScrollRef = useRef(null);

    // Handle card click
    const handleCardClick = useCallback((item) => {
        onCardClick(item);
    }, [onCardClick]);

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
    const startAutoScroll = useCallback((direction) => {
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

    const handleScroll = (direction) => {
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
    const moveToTop = (index) => {
        if (index > 0) {
            mediaStore.reorderMyList(index, 0);
        }
    };

    const moveToBottom = (index) => {
        if (index < items.length - 1) {
            mediaStore.reorderMyList(index, items.length - 1);
        }
    };

    // Drag and Drop handlers (desktop only)
    const handleDragStart = (e, index) => {
        e.dataTransfer.setData("itemIndex", index.toString());
        setDraggedIndex(index);
        setIsDragging(true);
        setActiveDragIndex(index);
    };

    const handleDragOver = (e, index) => {
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

    const handleDrop = (e, dropIndex) => {
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
        // backgroundColor: 'transparent',
        backgroundColor: 'rgba(20, 20, 30, 0.8)',
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
                    <IconButton
                        onClick={() => setIsReorderDrawerOpen(true)}
                        size="small"
                        sx={{color: 'warning.main'}}
                        aria-label={t('contentRow.editOrder') || 'Edit order'}
                    >
                        <EditIcon fontSize="small"/>
                    </IconButton>
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
                            left: "-16px",
                            // opacity: (isMobile && isMyList) ? 1 ,
                            opacity: 1 ,
                        }}
                        aria-label={t('contentRow.scrollLeft')}
                    >
                        <ChevronLeftIcon fontSize="large"/>
                    </IconButton>
                </Fade>

                <Box
                    ref={scrollContainerRef}
                    className={`filmstrip-container ${isDragging ? 'is-dragging' : ''}`}
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
                            className={`dnd-wrapper ${draggedIndex === index ? 'dragging-item' : ''} ${dropTargetIndex === index ? 'drop-target-item' : ''}`}
                            draggable={isReorderable && !isMobile}
                            onDragStart={(e) => isReorderable && !isMobile && handleDragStart(e, index)}
                            onDragOver={(e) => isReorderable && !isMobile && handleDragOver(e, index)}
                            onDrop={(e) => isReorderable && !isMobile && handleDrop(e, index)}
                            onDragEnd={() => isReorderable && !isMobile && handleDragEnd()}
                            onDragLeave={() => {
                                if (isReorderable && !isMobile) setDropTargetIndex(null);
                                stopAutoScroll();
                            }}

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
                            right: "-16px",
                            opacity: 1 ,
                            // opacity: (isMobile && isMyList) ? 1 ,
                        }}
                        aria-label={t('contentRow.scrollRight')}
                    >
                        <ChevronRightIcon fontSize="large"/>
                    </IconButton>
                </Fade>
            </Box>

            {/* Reorder Drawer for mobile */}
            <ReorderDrawer
                open={isReorderDrawerOpen}
                onClose={() => setIsReorderDrawerOpen(false)}
                items={items}
                onSave={async (orderedIds) => {
                    await mediaStore.setMyListOrder(orderedIds);
                }}
            />
        </Box>
    );
});
