import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore, ThemeName } from './store/mediaStore';
import { Box, CircularProgress, Alert, Container, Typography, colors } from '@mui/material';
import { ThemeProvider, createTheme, ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ContentRow } from './components/ContentRow';
import { Footer } from './components/Footer';
import DetailView from './components/DetailView';
import VideoPlayer from './components/VideoPlayer';
import GridView from './components/GridView';
import SmartTVScreen from './components/SmartTVScreen';
import RemoteControlView from './components/RemoteControlView';
import ProfileDrawer from './components/ProfileDrawer';
import QRScanner from './components/QRScanner';
import WatchTogetherModal from './components/WatchTogetherModal';
import { NotificationSnackbar } from './components/NotificationSnackbar';
import DebugOverlay from './components/DebugOverlay';
import LinkSelectionModal from './components/LinkSelectionModal';
import LinkMovieModal from './components/LinkMovieModal';
import ShareLibraryModal from './components/ShareLibraryModal';
import ImportLibraryModal from './components/ImportLibraryModal';
import RevisionsModal from './components/RevisionsModal';
import { useTranslations } from './hooks/useTranslations';
import { initGoogleAuth } from './services/googleAuthService';
import type { MediaItem, PlayableItem } from './types';

const baseThemeOptions: ThemeOptions = {
    typography: {
      fontFamily: "'Inter', sans-serif",
      h1: { fontFamily: "'Poppins', sans-serif", fontWeight: 800 },
      h2: { fontFamily: "'Poppins', sans-serif", fontWeight: 700 },
      h3: { fontFamily: "'Poppins', sans-serif", fontWeight: 700 },
      h4: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
      h5: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
      h6: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 'bold',
                    borderRadius: '20px',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'scale(1.05)',
                    }
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '12px',
                    backgroundImage: 'none', // Remove default gradient
                }
            }
        }
    }
};

const themePalettes: Record<ThemeName, any> = {
    SerieTV: {
        primary: { main: '#00A3FF' }, // Electric Blue
        secondary: { main: '#E50914' },
        background: { default: 'transparent', paper: 'rgba(16, 24, 45, 0.75)' }, // Deep Blue
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    },
    Film: {
        primary: { main: colors.amber[500] },
        secondary: { main: '#ffab00' },
        background: { default: 'transparent', paper: 'rgba(45, 32, 16, 0.75)' }, // Warm Amber
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    },
    Anime: {
        primary: { main: colors.deepPurple[400] },
        secondary: { main: '#ab47bc' },
        background: { default: 'transparent', paper: 'rgba(40, 20, 48, 0.75)' }, // Vibrant Purple
        text: { primary: '#f5f5f5', secondary: '#c0c0c0' }
    }
};

const AppContent: React.FC = observer(() => {
  const { t } = useTranslations();
  const {
    loading,
    error,
    heroContent,
    selectedItem,
    nowPlayingItem,
    activeView,
    topSeries,
    allMovies,
    popularAnime,
    myListItems,
    isRemoteMaster,
    isSmartTVPairingVisible,
    isSearchActive,
    searchResults,
    searchQuery,
    isSearching,
    isQRScannerOpen,
  } = mediaStore;

  useEffect(() => {
    const shouldLockScroll = !!selectedItem || !!nowPlayingItem || isSmartTVPairingVisible || isRemoteMaster;
    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup function to restore scroll on unmount, just in case.
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedItem, nowPlayingItem, isSmartTVPairingVisible, isRemoteMaster]);

  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress color="primary" />
        </Box>
    );
  }

  if (error) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Alert severity="error">{error}</Alert>
        </Box>
    );
  }

  if (isRemoteMaster) return <><RemoteControlView /> <NotificationSnackbar /><DebugOverlay /></>;
  if (nowPlayingItem) return <><VideoPlayer /> <NotificationSnackbar /><DebugOverlay /></>;
  if (isSmartTVPairingVisible) return <><SmartTVScreen /> <NotificationSnackbar /><DebugOverlay /></>;

  const renderSearchView = () => {
    if (isSearching && searchQuery) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 20 }}><CircularProgress /></Box>;
    }
    if (!searchQuery) {
      return (
        <Box sx={{ textAlign: 'center', pt: 20 }}>
          <Typography variant="h5">{t('misc.searchPrompt.title')}</Typography>
          <Typography color="text.secondary">{t('misc.searchPrompt.subtitle')}</Typography>
        </Box>
      )
    }
    return <GridView title={t('gridView.searchResultsFor', { query: searchQuery })} items={searchResults} />;
  }

  const renderMainContent = () => {
    if (isSearchActive) {
      return renderSearchView();
    }

    switch (activeView) {
      case 'Home':
        return (
          <>
            {heroContent && (
              <Hero
                item={heroContent}
                onMoreInfoClick={() => mediaStore.selectMedia(heroContent)}
                onPlayClick={() => mediaStore.startPlayback(heroContent)}
              />
            )}
            <Container maxWidth={false} sx={{ pt: { xs: 4, md: 8 }, pb: 8, pl: { xs: 2, md: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                {mediaStore.homePageRows.map(row => {
                  const isContinueWatching = row.titleKey === 'misc.continueWatching';
                  const handleCardClick = (item: MediaItem) => {
                    if (isContinueWatching) {
                      // The item is a PlayableItem here, safe to cast.
                      mediaStore.startPlayback(item as PlayableItem);
                    } else {
                      mediaStore.selectMedia(item);
                    }
                  };

                  return (
                    <ContentRow
                        key={row.titleKey}
                        title={t(row.titleKey)}
                        items={row.items}
                        onCardClick={handleCardClick}
                        isContinueWatching={isContinueWatching}
                        isReorderable={row.titleKey === 'misc.myList'}
                    />
                  );
                })}
              </Box>
            </Container>
          </>
        );
      case 'Serie TV': return <GridView title={t('gridView.seriesTitle')} items={topSeries} />;
      case 'Film': return <GridView title={t('gridView.moviesTitle')} items={allMovies} />;
      case 'Anime': return <GridView title={t('gridView.animeTitle')} items={popularAnime} />;
      case 'La mia lista': return <GridView title={t('gridView.myListTitle')} items={myListItems} />;
      default: return null;
    }
  };

  return (
      <Box sx={{ color: 'text.primary' }}>
        <Header />
        <main>{renderMainContent()}</main>
        {selectedItem && <DetailView />}
        <Footer />
        <ProfileDrawer />
        {isQRScannerOpen && <QRScanner />}
        <WatchTogetherModal />
        <NotificationSnackbar />
        <LinkSelectionModal />
        <LinkMovieModal />
        <ShareLibraryModal />
        <ImportLibraryModal />
        <RevisionsModal />
      </Box>
  );
});

const App: React.FC = () => {
  const { activeTheme } = mediaStore;
  
  useEffect(() => {
    const initializeApp = async () => {
        await initGoogleAuth();
        await mediaStore.loadPersistedData();
        mediaStore.fetchAllData();

        const params = new URLSearchParams(window.location.search);
        
        // Handle Watch Together room ID from URL
        const roomIdFromUrl = params.get('roomId');
        if (roomIdFromUrl) {
            mediaStore.setJoinRoomIdFromUrl(roomIdFromUrl);
            mediaStore.openWatchTogetherModal(null); 
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Handle Library Import from URL
        const importUrl = params.get('importFromUrl');
        if (importUrl) {
            mediaStore.setImportUrl(importUrl);
            mediaStore.openImportModal();
            // Clean the URL in the browser bar
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };
    initializeApp();
  }, []);
  
  useEffect(() => {
    // Dynamically update body background based on theme
    const themeClassMap: Record<ThemeName, string> = {
      'SerieTV': 'theme-serietv',
      'Film': 'theme-film',
      'Anime': 'theme-anime',
    };
    document.body.className = themeClassMap[activeTheme] || 'theme-serietv';
  }, [activeTheme]);

  const dynamicTheme = createTheme({
    palette: {
        mode: 'dark',
        ...themePalettes[activeTheme],
    },
    ...baseThemeOptions,
  });


  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <AppContent />
      <DebugOverlay />
    </ThemeProvider>
  );
};

export default observer(App);