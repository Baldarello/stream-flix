
import React, { useRef, useState, useEffect } from 'react';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { Box, Typography, IconButton, Fade } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { observer } from 'mobx-react-lite';
import { useTranslations } from '../hooks/useTranslations';
import { mediaStore } from '../store/mediaStore';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  onCardClick: (item: MediaItem) => void;
  isContinueWatching?: boolean;
  isReorderable?: boolean;
}

export const ContentRow: React.FC<ContentRowProps> = observer(({ title, items, onCardClick, isContinueWatching, isReorderable = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { t } = useTranslations();
  
  // State for Drag and Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("itemIndex", index.toString());
    setDraggedIndex(index);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (index !== draggedIndex) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    mediaStore.reorderMyList(draggedIndex, dropIndex);
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setIsDragging(false);
  };

  const scrollButtonStyles = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    width: '4rem',
    zIndex: 20,
    bgcolor: 'transparent',
    color: 'white',
    borderRadius: 0,
    '&:hover': {
      bgcolor: 'rgba(20, 20, 30, 0.8)',
    },
  };

  return (
    <Box component="section">
      <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 0 }}>
        {title}
      </Typography>
      <Box 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{ position: 'relative' }}
      >
        <Fade in={isHovered && canScrollLeft}>
          <IconButton
            onClick={() => handleScroll('left')}
            sx={{
              ...scrollButtonStyles,
              left: 0,
            }}
            aria-label={t('contentRow.scrollLeft')}
          >
            <ChevronLeftIcon fontSize="large" />
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
            px: 'calc(4rem + 40px)', // Space for buttons and overlap
            marginLeft: '-4rem',
            scrollPadding: '0 0 0 calc(4rem + 40px)',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none', // For Firefox
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
              draggable={isReorderable}
              onDragStart={(e) => isReorderable && handleDragStart(e, index)}
              onDragOver={(e) => isReorderable && handleDragOver(e, index)}
              onDrop={(e) => isReorderable && handleDrop(e, index)}
              onDragEnd={() => isReorderable && handleDragEnd()}
              onDragLeave={() => isReorderable && setDropTargetIndex(null)}
              style={{
                marginLeft: index === 0 ? 0 : '-40px',
                transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
              }}
            >
              <Card 
                  item={item} 
                  onClick={() => onCardClick(item)} 
                  displayMode="row"
                  className="media-card"
                  style={{ zIndex: items.length - index }}
                  isContinueWatching={isContinueWatching}
                  isReorderable={isReorderable}
              />
            </div>
          ))}
        </Box>

        <Fade in={isHovered && canScrollRight}>
          <IconButton
            onClick={() => handleScroll('right')}
            sx={{
              ...scrollButtonStyles,
              right: 0,
            }}
            aria-label={t('contentRow.scrollRight')}
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </Fade>
      </Box>
    </Box>
  );
});
