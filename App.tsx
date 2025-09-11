import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore, ThemeName } from './store/mediaStore';
// FIX: Import 'colors' from '@mui/material' as it is no longer exported from '@mui/material/styles'.
import { Box, CircularProgress, Alert, Container, Typography, colors } from '@mui/material';
// FIX: Import `ThemeOptions` to provide an explicit type for the theme configuration.
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
import NotificationSnackbar from './components/NotificationSnackbar';

// FIX: Explicitly type `baseThemeOptions` with `ThemeOptions`. This prevents TypeScript from widening
// the types of CSS properties (e.g., `textTransform`) to a generic `string`, which resolves the
// type error when passing this configuration to `createTheme`.
const baseThemeOptions: ThemeOptions = {
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 'bold',
                }
            }
        }
    }
};

const themePalettes: Record<ThemeName, any> = {
    SerieTV: {
        primary: { main: '#E50914' }, // Netflix Red
        background: { default: '#141414', paper: '#181818' },
        text: { primary: '#ffffff', secondary: '#b3b3b3' }
    },
    Film: {
        primary: { main: colors.amber[500] }, // Cinematic Gold
        background: { default: '#101010', paper: '#1d1d1d' },
        text: { primary: '#f5f5f5', secondary: '#a0a0a0' }
    },
    Anime: {
        primary: { main: colors.deepPurple[400] }, // Vibrant Purple
        background: { default: '#1a1820', paper: '#24212c' },
        text: { primary: '#e9e7ef', secondary: '#adaab8' }
    }
};

const App: React.FC = () => {
  useEffect(() => {
    mediaStore.loadPersistedData();
    mediaStore.fetchAllData();
    
    const params = new URLSearchParams(window.location.search);
    const roomIdFromUrl = params.get('roomId');
    if (roomIdFromUrl) {
        mediaStore.setJoinRoomIdFromUrl(roomIdFromUrl);
        mediaStore.openWatchTogetherModal(null); 
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const {
    activeTheme,
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
  } = mediaStore;

  const dynamicTheme = createTheme({
    palette: {
        mode: 'dark',
        ...themePalettes[activeTheme],
    },
    ...baseThemeOptions,
  });

  if (loading) {
    return (
        <ThemeProvider theme={dynamicTheme}><CssBaseline />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
            <CircularProgress color="primary" />
          </Box>
        </ThemeProvider>
    );
  }

  if (error) {
    return (
        <ThemeProvider theme={dynamicTheme}><CssBaseline />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        </ThemeProvider>
    );
  }

  if (isRemoteMaster) return <ThemeProvider theme={dynamicTheme}><CssBaseline /><RemoteControlView /> <NotificationSnackbar /></ThemeProvider>;
  if (nowPlayingItem) return <ThemeProvider theme={dynamicTheme}><CssBaseline /><VideoPlayer /> <NotificationSnackbar /></ThemeProvider>;
  if (isSmartTVPairingVisible) return <ThemeProvider theme={dynamicTheme}><CssBaseline /><SmartTVScreen /> <NotificationSnackbar /></ThemeProvider>;

  const renderSearchView = () => {
    if (isSearching && searchQuery) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 20 }}><CircularProgress /></Box>;
    }
    if (!searchQuery) {
      return (
        <Box sx={{ textAlign: 'center', pt: 20 }}>
          <Typography variant="h5">Cerca film, serie TV e tanto altro</Typography>
          <Typography color="text.secondary">Trova subito i tuoi contenuti preferiti.</Typography>
        </Box>
      )
    }
    return <GridView title={`Risultati per "${searchQuery}"`} items={searchResults} />;
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
            <Container maxWidth={false} sx={{ py: { xs: 4, md: 8 }, pl: { xs: 2, md: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                {mediaStore.homePageRows.map(row => (
                    <ContentRow
                        key={row.title}
                        title={row.title}
                        items={row.items}
                        onCardClick={item => mediaStore.selectMedia(item)}
                    />
                ))}
              </Box>
            </Container>
          </>
        );
      case 'Serie TV': return <GridView title="Serie TV" items={topSeries} />;
      case 'Film': return <GridView title="Film" items={allMovies} />;
      case 'Anime': return <GridView title="Anime" items={popularAnime} />;
      case 'La mia lista': return <GridView title="La mia lista" items={myListItems} />;
      default: return null;
    }
  };

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
        <Header />
        <main>{selectedItem ? <DetailView /> : renderMainContent()}</main>
        <Footer />
        <ProfileDrawer />
        <QRScanner />
        <WatchTogetherModal />
        <NotificationSnackbar />
      </Box>
    </ThemeProvider>
  );
};

export default observer(App);