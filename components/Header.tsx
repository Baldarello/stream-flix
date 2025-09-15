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
  
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  useEffect(() => {
    if (isSearchActive) {
      // Timeout ensures the input is focusable after the transition starts
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchActive]);

  const handleNavClick = (view: ActiveView) => {
    toggleSearch(false);
    mediaStore.setActiveView(view);
  }

  return (
    <Slide appear={false} direction="down" in={!trigger || isSearchActive}>
      <AppBar 
        elevation={0}
        sx={{ 
          backdropFilter: (trigger || isSearchActive) ? 'blur(10px)' : 'none',
          background: (trigger || isSearchActive) ? 'rgba(20, 20, 20, 0.8)' : 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          transition: 'background 0.3s ease-in-out',
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
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                letterSpacing: '.1rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Quix
            </Typography>
            <Grow in={!isSearchActive}>
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
                {navKeys.map((item) => (
                    <Button 
                    // FIX: Explicitly convert `item.key` to a string. The inferred type `string | number | symbol` is not assignable to React's `Key` type, which excludes symbols.
                    key={String(item.key)} 
                    sx={{ 
                        color: 'white', 
                        my: 2, 
                        display: 'block',
                        fontWeight: mediaStore.activeView === item.view ? 700 : 400,
                        opacity: mediaStore.activeView === item.view ? 1 : 0.8,
                        '&:hover': {
                        opacity: 1,
                        }
                    }}
                    onClick={() => handleNavClick(item.view)}
                    >
                    {/* FIX: Explicitly convert `item.key` to a string to prevent a runtime error from implicit symbol-to-string conversion in template literals. */}
                    {t(`header.${String(item.key)}`)}
                    </Button>
                ))}
                </Box>
            </Grow>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: isSearchActive ? 1 : 0, ml: 2 }}>
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
    </Slide>
  );
});