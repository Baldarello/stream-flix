import React, { useRef, useState, useEffect } from 'react';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { Box, Typography, IconButton, Fade } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  onCardClick: (item: MediaItem) => void;
}

export const ContentRow: React.FC<ContentRowProps> = ({ title, items, onCardClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    
    // Check on mount and when items change
    checkScrollability();

    const handleResize = () => checkScrollability();
    const handleScrollEvent = () => checkScrollability();
    
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', handleScrollEvent);

    // Re-check after a small delay to account for image loading and layout shifts
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

  const scrollButtonStyles = {
    position: 'absolute',
    top: 0,
    bottom: 16, // Corresponds to pb: 2 on the scroll container
    width: '4rem',
    zIndex: 20,
    bgcolor: 'rgba(20, 20, 20, 0.7)',
    color: 'white',
    '&:hover': {
      bgcolor: 'rgba(20, 20, 20, 0.9)',
    },
    borderRadius: '4px',
  };

  return (
    <Box component="section">
      <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 2 }}>
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
            aria-label="scorri a sinistra"
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        </Fade>

        <Box
          ref={scrollContainerRef}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            gap: 2,
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none', // For Firefox
          }}
        >
          {items.map((item) => (
            <Card key={item.id} item={item} onClick={() => onCardClick(item)} />
          ))}
        </Box>

        <Fade in={isHovered && canScrollRight}>
          <IconButton
            onClick={() => handleScroll('right')}
            sx={{
              ...scrollButtonStyles,
              right: 0,
            }}
            aria-label="scorri a destra"
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </Fade>
      </Box>
    </Box>
  );
};