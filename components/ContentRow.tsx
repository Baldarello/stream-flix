import React, { useRef, useState, useEffect } from 'react';
import type { MediaItem } from '../types';
import { Card } from './Card';
import { Box, Typography, IconButton, Fade } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { observer } from 'mobx-react-lite';
import { useTranslations } from '../hooks/useTranslations';

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  onCardClick: (item: MediaItem) => void;
}

export const ContentRow: React.FC<ContentRowProps> = observer(({ title, items, onCardClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { t } = useTranslations();

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
          className="filmstrip-container"
          sx={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            py: 4,
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
            '& .media-card:hover ~ .media-card': {
                transform: 'translateX(60px)',
            }
          }}
        >
          {items.map((item, index) => (
            <Card 
                key={item.id} 
                item={item} 
                onClick={() => onCardClick(item)} 
                displayMode="row"
                className="media-card"
                style={{ zIndex: items.length - index }}
            />
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