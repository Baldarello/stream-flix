import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from './store/mediaStore';
import { Box, CircularProgress, Alert, Container } from '@mui/material';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ContentRow } from './components/ContentRow';
import { Footer } from './components/Footer';
import DetailView from './components/DetailView';
import VideoPlayer from './components/VideoPlayer';
import GridView from './components/GridView';
import SmartTVScreen from './components/SmartTVScreen';
import RemoteControlView from './components/RemoteControlView';

const App: React.FC = () => {
  useEffect(() => {
    mediaStore.fetchAllData();
    mediaStore.initRemoteSession();
  }, []);

  if (mediaStore.loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (mediaStore.error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Alert severity="error">{mediaStore.error}</Alert>
      </Box>
    );
  }

  const {
    heroContent,
    latestMovies,
    myListItems,
    trending,
    topSeries,
    popularAnime,
    selectedItem,
    nowPlayingItem,
    activeView,
    allMovies,
    isRemoteMaster,
    isSmartTV,
  } = mediaStore;

  // Remote Control (Master) View
  if (isRemoteMaster) {
      return <RemoteControlView />;
  }
  
  // Video Player takes precedence
  if (nowPlayingItem) {
    return <VideoPlayer />;
  }
  
  // Smart TV (Slave) View
  if (isSmartTV) {
      return <SmartTVScreen />;
  }

  // Standard App View
  const renderMainContent = () => {
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
                <ContentRow title="Ultime Uscite" items={latestMovies} />
                {myListItems.length > 0 && (
                  <ContentRow title="La mia lista" items={myListItems} />
                )}
                <ContentRow title="I più Votati" items={trending} />
                <ContentRow title="Serie TV Popolari" items={topSeries} />
                <ContentRow title="Anime da non Perdere" items={popularAnime} />
              </Box>
            </Container>
          </>
        );
      case 'Serie TV':
        return <GridView title="Serie TV" items={topSeries} />;
      case 'Film':
        return <GridView title="Film" items={allMovies} />;
      case 'Anime':
        return <GridView title="Anime" items={popularAnime} />;
      case 'La mia lista':
        return <GridView title="La mia lista" items={myListItems} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
      <Header />
      <main>{selectedItem ? <DetailView /> : renderMainContent()}</main>
      <Footer />
    </Box>
  );
};

export default observer(App);
