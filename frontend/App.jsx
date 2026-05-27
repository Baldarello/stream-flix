import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from './store/mediaStore.js';
import {remoteStore} from './store/remoteStore.js';
import {Alert, Box, CircularProgress, colors, Container, Typography} from '@mui/material';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {Header} from './components/layout/Header.jsx';
import {Hero} from './components/layout/Hero.jsx';
import {ContentRow} from './components/layout/ContentRow.jsx';
import {Footer} from './components/layout/Footer.jsx';
import DetailView from './components/media/DetailView.jsx';
import VideoPlayer from './components/media/VideoPlayer.jsx';
import GridView from './components/layout/GridView.jsx';
import SmartTVScreen from './components/smarttv/SmartTVScreen.jsx';
import RemotePlayerControlView from './components/utilities/RemotePlayerControlView.jsx';
import ProfileDrawer from './components/utilities/ProfileDrawer.jsx';
import QRScanner from './components/smarttv/QRScanner.jsx';
import WatchTogetherModal from './components/modals/WatchTogetherModal.jsx';
import {NotificationSnackbar} from './components/utilities/NotificationSnackbar.jsx';
import DebugOverlay from './components/utilities/DebugOverlay.jsx';
import LinkSelectionModal from './components/modals/LinkSelectionModal.jsx';
import LinkMovieModal from './components/modals/LinkMovieModal.jsx';
import ShareLibraryModal from './components/modals/ShareLibraryModal.jsx';
import ImportLibraryModal from './components/modals/ImportLibraryModal.jsx';
import RevisionsModal from './components/modals/RevisionsModal.jsx';
import MediaSyncModal from './components/modals/MediaSyncModal.jsx';
import GoogleDriveSyncConflictModal from './components/modals/GoogleDriveSyncConflictModal.jsx';
import LibraryManagementView from './components/library/LibraryManagementView.jsx';
import EpisodeInfoModal from './components/modals/EpisodeInfoModal.jsx';
import NotificationsModal from './components/modals/NotificationsModal.jsx';
import {useTranslations} from './hooks/useTranslations.js';
import {initGoogleAuth} from './services/googleAuthService';
import {websocketService} from './services/websocketService.js';


const baseThemeOptions = {
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: {fontFamily: "'Poppins', sans-serif", fontWeight: 800},
        h2: {fontFamily: "'Poppins', sans-serif", fontWeight: 700},
        h3: {fontFamily: "'Poppins', sans-serif", fontWeight: 700},
        h4: {fontFamily: "'Poppins', sans-serif", fontWeight: 600},
        h5: {fontFamily: "'Poppins', sans-serif", fontWeight: 600},
        h6: {fontFamily: "'Poppins', sans-serif", fontWeight: 600},
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

const themePalettes = {
    SerieTV: {
        primary: {main: '#00A3FF'}, // Electric Blue
        secondary: {main: '#E50914'},
        background: {default: 'transparent', paper: 'rgba(16, 24, 45, 0.75)'}, // Deep Blue
        text: {primary: '#f5f5f5', secondary: '#c0c0c0'}
    },
    Film: {
        primary: {main: colors.amber[500]},
        secondary: {main: '#ffab00'},
        background: {default: 'transparent', paper: 'rgba(45, 32, 16, 0.75)'}, // Warm Amber
        text: {primary: '#f5f5f5', secondary: '#c0c0c0'}
    },
    Anime: {
        primary: {main: colors.deepPurple[400]},
        secondary: {main: '#ab47bc'},
        background: {default: 'transparent', paper: 'rgba(40, 20, 48, 0.75)'}, // Vibrant Purple
        text: {primary: '#f5f5f5', secondary: '#c0c0c0'}
    }
};

const AppContent = observer(() => {
    const {t} = useTranslations();
    const {
        loading,
        isReloadingData,
        isGoogleAuthLoading,
        error,
        heroContent,
        nowPlayingItem,
        remoteSlaveState,
        isSmartTVPairingVisible,
        isSearchActive,
        searchResults,
        searchQuery,
        isSearching,
        topSeries,
        allMovies,
        popularAnime,
        myListItems,
        currentActiveView,   // <-- Using computed property
        currentSelectedItem, // <-- Using computed property
    } = mediaStore;
    const { isRemoteMaster, isQRScannerOpen } = remoteStore;

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

    if (loading || isReloadingData || isGoogleAuthLoading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
                <CircularProgress color="primary"/>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if(isQRScannerOpen ){
        return    <QRScanner/>
    }
    // Smart TV pairing mode always takes precedence, unless we're playing content
    // When nowPlayingItem is set (e.g., slave receiving playback from master), show VideoPlayer instead
    if (isSmartTVPairingVisible && !nowPlayingItem) return <><SmartTVScreen/> <NotificationSnackbar/><DebugOverlay/></>;

    // If remote master, and slave is playing, show the remote player controls
    if (isRemoteMaster && remoteSlaveState?.nowPlayingItem) return <>
        <RemotePlayerControlView/>
        <MediaSyncModal
            open={mediaStore.isMediaSyncModalOpen}
            onClose={() => mediaStore.closeMediaSyncModal()}
            slaveId={mediaStore.mediaSyncTargetSlaveId || ''}
        />
        <NotificationSnackbar/><DebugOverlay/>
    </>;

    // If local client is playing, show local video player
    if (nowPlayingItem) return <><VideoPlayer/> <LinkSelectionModal/><NotificationSnackbar/>
        <EpisodeInfoModal/>
        <DebugOverlay/></>;

    const renderSearchView = () => {
        if (isSearching && searchQuery) {
            return (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 'calc(100vh - 64px - 200px)',
                    pt: 'env(safe-area-inset-top)'
                }}>
                    <CircularProgress/>
                </Box>
            );
        }
        if (!searchQuery) {
            return (
                <Box sx={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'calc(100vh - 64px - 200px)',
                    pt: 'env(safe-area-inset-top)'
                }}>
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        {t('misc.searchPrompt.title')}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        {t('misc.searchPrompt.subtitle')}
                    </Typography>
                </Box>
            )
        }
        return <GridView title={t('gridView.searchResultsFor', {query: searchQuery})} items={searchResults}/>;
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
                        <Container maxWidth={false} sx={{pt: {xs: 4, md: 8}, pb: 8, pl: {xs: 2, md: 6}}}>
                            <Box sx={{display: 'flex', flexDirection: 'column', gap: {xs: 4, md: 8}}}>
                                {mediaStore.homePageRows.map(row => {
                                    const isContinueWatching = row.titleKey === 'misc.continueWatching';
                                    const handleCardClick = (item) => {
                                        if (isContinueWatching) {
                                            mediaStore.startPlayback(item);
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
            case 'Serie TV':
                return <GridView title={t('gridView.seriesTitle')} items={topSeries}/>;
            case 'Film':
                return <GridView title={t('gridView.moviesTitle')} items={allMovies}/>;
            case 'Anime':
                return <GridView title={t('gridView.animeTitle')} items={popularAnime}/>;
            case 'La mia lista':
                return <GridView title={t('gridView.myListTitle')} items={myListItems}/>;
            case 'Libreria':
                return <LibraryManagementView/>;
            default:
                return null;
        }
    };

    return (
        <Box sx={{color: 'text.primary'}}>
            <Header/>
            <main sx={{pt: 'calc(64px + env(safe-area-inset-top))'}}>{renderMainContent()}</main>
            {currentSelectedItem && <DetailView/>} {/* Use currentSelectedItem */}
            <Footer/>
            <ProfileDrawer/>

            <WatchTogetherModal/>
            <NotificationSnackbar/>
            <LinkSelectionModal/>
            <LinkMovieModal/>
            <ShareLibraryModal/>
            <ImportLibraryModal/>
            <RevisionsModal/>
            <MediaSyncModal
                open={mediaStore.isMediaSyncModalOpen}
                onClose={() => mediaStore.closeMediaSyncModal()}
                slaveId={mediaStore.mediaSyncTargetSlaveId || ''}
            />
            <GoogleDriveSyncConflictModal
                open={mediaStore.isSyncConflictModalOpen}
                onClose={() => mediaStore.closeSyncConflictModal()}
                conflictData={mediaStore.syncConflictData}
                onMerge={(choices, deletedIds) => mediaStore.mergeLocalAndRemote(choices, deletedIds)}
                onOverwriteLocal={() => mediaStore.overwriteLocalWithRemote()}
                onOverwriteRemote={() => mediaStore.overwriteRemoteWithLocal()}
                onCancel={() => mediaStore.cancelSyncAndLogout()}
                isProcessing={mediaStore.isProcessingSyncConflict}
            />
            <EpisodeInfoModal/>
            <NotificationsModal/>
        </Box>
    );
});

const App = () => {
    const {activeTheme} = mediaStore;

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
        const handlePopState = (event) => {
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
        const themeClassMap = {
            'SerieTV': 'theme-serietv',
            'Film': 'theme-film',
            'Anime': 'theme-anime',
        };
        document.body.className = themeClassMap[activeTheme] || 'theme-serietv';
    }, [activeTheme]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                websocketService.connect();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const dynamicTheme = createTheme({
        palette: {
            mode: 'dark',
            ...themePalettes[activeTheme],
        },
        ...baseThemeOptions,
    });


    return (
        <ThemeProvider theme={dynamicTheme}>
            <CssBaseline/>
            <AppContent/>
            <DebugOverlay/>
        </ThemeProvider>
    );
};

export default observer(App);