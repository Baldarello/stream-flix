
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Routes, Route, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { mediaStore, ThemeName } from './store/mediaStore';
import { Box, CircularProgress, Alert, Container } from '@mui/material';
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
    SerieTV: { primary: { main: '#00A3FF' }, secondary: { main: '#E50914' }, background: { default: 'transparent', paper: 'rgba(16, 24, 45, 0.75)' }, text: { primary: '#f5f5f5', secondary: '#c0c0c0' } },
    Film: { primary: { main: '#ffab00' }, secondary: { main: '#ffab00' }, background: { default: 'transparent', paper: 'rgba(45, 32, 16, 0.75)' }, text: { primary: '#f5f5f5', secondary: '#c0c0c0' } },
    Anime: { primary: { main: '#ab47bc' }, secondary: { main: '#ab47bc' }, background: { default: 'transparent', paper: 'rgba(40, 20, 48, 0.75)' }, text: { primary: '#f5f5f5', secondary: '#c0c0c0' } }
};

const Layout: React.FC = observer(() => (
    <Box sx={{ color: 'text.primary' }}>
        <Header />
        <main>
            <Outlet />
        </main>
        <Footer />
        <ProfileDrawer />
        {mediaStore.isQRScannerOpen && <QRScanner />}
        <WatchTogetherModal />
        <NotificationSnackbar />
        <LinkSelectionModal />
        <LinkMovieModal />
        <ShareLibraryModal />
        <ImportLibraryModal />
        <RevisionsModal />
    </Box>
));

const HomePage: React.FC = observer(() => {
    const { t } = useTranslations();
    const navigate = useNavigate();
    const { heroContent } = mediaStore;
    
    const handlePlayClick = async (item: PlayableItem) => {
        const playableItem = await mediaStore.prepareItemForPlayback(item);
        if (playableItem) {
            const isEpisode = 'episode_number' in playableItem;
            const type = isEpisode ? 'episode' : 'movie';
            const showIdParam = isEpisode ? `/${playableItem.show_id}` : '';
            navigate(`/watch/${type}/${playableItem.id}${showIdParam}`);
        }
    };

    return (
      <>
        {heroContent && (
          <Hero
            item={heroContent}
            onMoreInfoClick={() => navigate(`/detail/${heroContent.media_type}/${heroContent.id}`)}
            onPlayClick={() => handlePlayClick(heroContent)}
          />
        )}
        <Container maxWidth={false} sx={{ pt: { xs: 4, md: 8 }, pb: 8, pl: { xs: 2, md: 6 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
            {mediaStore.homePageRows.map(row => {
              const isContinueWatching = row.titleKey === 'misc.continueWatching';
              const handleCardClick = (item: MediaItem) => {
                if (isContinueWatching) {
                  handlePlayClick(item as PlayableItem);
                } else {
                  navigate(`/detail/${item.media_type}/${item.id}`);
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
});

const SearchPage: React.FC = observer(() => {
    const { t } = useTranslations();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    useEffect(() => {
        mediaStore.setSearchQuery(query);
    }, [query]);
    
    const { searchResults, isSearching } = mediaStore;
    
    if(isSearching) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 20 }}><CircularProgress /></Box>;
    }

    return <GridView title={t('gridView.searchResultsFor', { query })} items={searchResults} />;
});


const AppContent: React.FC = observer(() => {
  const { loading, error, isRemoteMaster, isSmartTVPairingVisible } = mediaStore;
  const location = useLocation();

  useEffect(() => {
    const shouldLockScroll = location.pathname.startsWith('/detail') || location.pathname.startsWith('/watch') || isSmartTVPairingVisible || isRemoteMaster;
    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [location.pathname, isSmartTVPairingVisible, isRemoteMaster]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress color="primary" /></Box>;
  }

  if (error) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Alert severity="error">{error}</Alert></Box>;
  }

  if (isRemoteMaster) return <><RemoteControlView /> <NotificationSnackbar /><DebugOverlay /></>;
  if (isSmartTVPairingVisible) return <><SmartTVScreen /> <NotificationSnackbar /><DebugOverlay /></>;
  
  const { t } = useTranslations();

  return (
      <Routes>
        <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="series" element={<GridView title={t('gridView.seriesTitle')} items={mediaStore.topSeries} />} />
            <Route path="movies" element={<GridView title={t('gridView.moviesTitle')} items={mediaStore.allMovies} />} />
            <Route path="anime" element={<GridView title={t('gridView.animeTitle')} items={mediaStore.popularAnime} />} />
            <Route path="my-list" element={<GridView title={t('gridView.myListTitle')} items={mediaStore.myListItems} />} />
            <Route path="search" element={<SearchPage />} />
        </Route>
        <Route path="/watch/:type/:id" element={<VideoPlayer />} />
        <Route path="/watch/episode/:id/:showId" element={<VideoPlayer />} />
        <Route path="/detail/:type/:id" element={<DetailView />} />
      </Routes>
  );
});

const App: React.FC = () => {
  const { activeTheme } = mediaStore;
  
  useEffect(() => {
    const initializeApp = async () => {
        await initGoogleAuth();
        await mediaStore.loadPersistedData();
        mediaStore.fetchAllData();
    };
    initializeApp();
  }, []);
  
  useEffect(() => {
    const themeClassMap: Record<ThemeName, string> = { 'SerieTV': 'theme-serietv', 'Film': 'theme-film', 'Anime': 'theme-anime' };
    document.body.className = themeClassMap[activeTheme] || 'theme-serietv';
  }, [activeTheme]);

  const dynamicTheme = createTheme({
    palette: { mode: 'dark', ...themePalettes[activeTheme] },
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
