import React, { useRef, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, useScrollTrigger, Slide, TextField, InputAdornment, Grow, Fade } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloseIcon from '@mui/icons-material/Close';
import { observer } from 'mobx-react-lite';
import { mediaStore, ActiveView } from '../store/mediaStore';
import { useTranslations } from '../hooks/useTranslations';

const navKeys: { key: keyof typeof mediaStore.translations.header, view: ActiveView }[] = [
    { key: 'home', view: 'Home'},
    { key: 'series', view: 'Serie TV'},
    { key: 'movies', view: 'Film'},
    { key: 'anime', view: 'Anime'},
    { key: 'myList', view: 'La mia lista'},
];

export const Header: React.FC = observer(() => {
  const { isSearchActive, toggleSearch, searchQuery, setSearchQuery } = mediaStore;
  const { t } = useTranslations();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchActive) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchActive]);

  const handleNavClick = (view: ActiveView) => {
    toggleSearch(false);
    if (mediaStore.isRemoteMaster) {
        // If remote master, clear any selected item on its own UI
        mediaStore.clearMasterUiSelection();
        // And set the master's active view
        mediaStore.setActiveView(view);
    } else {
        // Otherwise, set the local active view
        mediaStore.setActiveView(view);
    }
  }

  const getGlowColor = () => {
    switch (mediaStore.activeTheme) {
        case 'Film': return 'var(--glow-film-color)';
        case 'Anime': return 'var(--glow-anime-color)';
        case 'SerieTV':
        default: return 'var(--glow-seriestv-color)';
    }
  }

  return (
    <AppBar 
      elevation={0}
      sx={{ 
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '1600px',
        borderRadius: '16px',
        backdropFilter: 'blur(16px)',
        bgcolor: 'background.paper',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'background 0.3s ease-in-out',
        zIndex: 1100, // Above content
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', height: 64 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography 
            variant="h6" 
            noWrap
            component="div"
            onClick={() => handleNavClick('Home')}
            sx={{
              mr: 2,
              fontWeight: 800,
              color: 'white',
              textDecoration: 'none',
              letterSpacing: '.1rem',
              cursor: 'pointer',
              transition: 'text-shadow 0.3s ease',
              '&:hover': {
                textShadow: `0 0 8px ${getGlowColor()}`,
              }
            }}
          >
            Quix
          </Typography>
          {/* FIX: (line 95) Wrap Box with Grow component */}
          <Grow in={!isSearchActive}>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
              {navKeys.map((item) => (
                  <Button 
                  key={String(item.key)} 
                  sx={{ 
                      color: 'white', 
                      my: 2, 
                      display: 'block',
                      // Use currentActiveView for highlighting the active button
                      fontWeight: mediaStore.currentActiveView === item.view ? 700 : 400,
                      opacity: mediaStore.currentActiveView === item.view ? 1 : 0.8,
                      position: 'relative',
                      '&:hover': {
                        opacity: 1,
                      },
                      '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          // Use currentActiveView for the underline
                          width: mediaStore.currentActiveView === item.view ? '60%' : '0',
                          height: '2px',
                          background: getGlowColor(),
                          boxShadow: `0 0 8px ${getGlowColor()}`,
                          transition: 'width 0.3s ease-in-out',
                      },
                      '&:hover::after': {
                          width: mediaStore.currentActiveView !== item.view ? '40%' : '60%',
                      }
                  }}
                  onClick={() => handleNavClick(item.view)}
                  >
                  {t(`header.${String(item.key)}`)}
                  </Button>
              ))}
              </Box>
          </Grow>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: isSearchActive ? 1 : 0, ml: 2 }}>
           {/* FIX: (line 138) Wrap TextField with Grow component */}
           <Grow in={isSearchActive}>
              <TextField
                  fullWidth
                  variant="standard"
                  placeholder={t('header.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  inputRef={searchInputRef}
                  sx={{
                      '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.42)' },
                      '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'white' },
                  }}
                  InputProps={{
                      startAdornment: (
                          <InputAdornment position="start">
                              <SearchIcon />
                          </InputAdornment>
                      ),
                  }}
              />
           </Grow>
          <IconButton color="inherit" onClick={() => toggleSearch(!isSearchActive)}>
              {isSearchActive ? <CloseIcon /> : <SearchIcon />}
          </IconButton>
          {/* FIX: (line 162) Wrap Box with Fade component */}
          <Fade in={!isSearchActive}>
              <Box sx={{ display: isSearchActive ? 'none' : 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton color="inherit">
                      <NotificationsIcon />
                  </IconButton>
                  <IconButton color="inherit" onClick={() => mediaStore.toggleProfileDrawer(true)}>
                      <AccountCircleIcon />
                  </IconButton>
              </Box>
          </Fade>
        </Box>
      </Toolbar>
    </AppBar>
  );
});