import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
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
import RemotePlayerControlView from './components/RemotePlayerControlView';
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
    nowPlayingItem,
    isRemoteMaster,
    remoteSlaveState,
    isSmartTVPairingVisible,
    isSearchActive,
    searchResults,
    searchQuery,
    isSearching,
    isQRScannerOpen,
    topSeries,
    allMovies,
    popularAnime,
    myListItems,
    currentActiveView,   // <-- Using computed property
    currentSelectedItem, // <-- Using computed property
  } = mediaStore;

  useEffect(() => {
    // Determine if scroll should be locked based on *current* UI state
    const shouldLockScroll = !!currentSelectedItem || !!nowPlayingItem || isSmartTVPairingVisible || (isRemoteMaster && !!remoteSlaveState?.nowPlayingItem);
    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentSelectedItem, nowPlayingItem, isSmartTVPairingVisible, isRemoteMaster, remoteSlaveState?.nowPlayingItem]);

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

  // Smart TV pairing mode always takes precedence
  if (isSmartTVPairingVisible) return <><SmartTVScreen /> <NotificationSnackbar /><DebugOverlay /></>;
  
  // If remote master, and slave is playing, show the remote player controls
  if (isRemoteMaster && remoteSlaveState?.nowPlayingItem) return <><RemotePlayerControlView /> <NotificationSnackbar /><DebugOverlay /></>;
  
  // If local client is playing, show local video player
  if (nowPlayingItem) return <><VideoPlayer /> <LinkSelectionModal /><NotificationSnackbar /><DebugOverlay /></>;

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

    // Use currentActiveView for rendering decisions
    switch (currentActiveView) {
      case 'Home':
        return (
          <>
            {heroContent && (
              <Hero
                item={heroContent}
                onMoreInfoClick={() => mediaStore.selectMedia(heroContent, 'detailView')}
                onPlayClick={() => mediaStore.startPlayback(heroContent)}
              />
            )}
            <Container maxWidth={false} sx={{ pt: { xs: 4, md: 8 }, pb: 8, pl: { xs: 2, md: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                {mediaStore.homePageRows.map(row => {
                  const isContinueWatching = row.titleKey === 'misc.continueWatching';
                  const handleCardClick = (item: MediaItem) => {
                    if (isContinueWatching) {
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
        {currentSelectedItem && <DetailView />} {/* Use currentSelectedItem */}
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
    const handlePopState = (event: PopStateEvent) => {
        // This event is triggered by the browser's back/forward buttons.
        const state = event.state || {}; // Handle initial null state

        // Case 1: User navigates BACK from the video player.
        // We check if a player should be open. If not, but we have a playing item,
        // it means we need to close it.
        if (!state.playerOpen && mediaStore.nowPlayingItem) {
            mediaStore._stopPlaybackWithoutHistory();
        }
        
        // Case 2: User navigates BACK from the detail view.
        // We check if a detail view should be open. If not, but we have one selected,
        // it means we need to close it. We also ensure we are not currently playing a video.
        // For remote master, we check currentSelectedItem, for slave/local, we check selectedItem.
        if (!state.detailViewOpen && mediaStore.currentSelectedItem && !mediaStore.nowPlayingItem) {
            // Check if it's a remote master clearing its UI state
            if (mediaStore.isRemoteMaster) {
                mediaStore.clearMasterUiSelection();
                // We don't push history for remote master's UI. The popstate should only be local.
            } else {
                mediaStore._closeDetailWithoutHistory();
            }
        }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
        window.removeEventListener('popstate', handlePopState);
    };
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