import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Container, AppBar, Toolbar } from '@mui/material';
import { ContentRow } from './ContentRow';
import RemoteDetailView from './RemoteDetailView';
import RemotePlayerControlView from './RemotePlayerControlView';

const RemoteControlView: React.FC = () => {
    const { 
        latestMovies, 
        trending, 
        topSeries, 
        popularAnime,
        remoteSlaveState,
        continueWatchingItems,
        myListItems,
        remoteSelectedItem
    } = mediaStore;
    
    // Determine which view to show
    const nowPlayingItem = remoteSlaveState?.nowPlayingItem;

    if (nowPlayingItem) {
        return <RemotePlayerControlView />;
    }

    if (remoteSelectedItem) {
        return <RemoteDetailView />;
    }
    
    // Default view: Content Browser
    return (
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
             <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
                <Toolbar>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                        Telecomando Quix
                    </Typography>
                </Toolbar>
             </AppBar>

             <Container maxWidth={false} sx={{ py: 4, pl: { xs: 2, md: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                <Typography variant="h4" fontWeight="bold">Scegli cosa guardare sulla TV</Typography>
                  {continueWatchingItems.length > 0 && (
                      <ContentRow title="Continua a guardare" items={continueWatchingItems} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
                  )}
                  {myListItems.length > 0 && (
                      <ContentRow title="La mia lista" items={myListItems} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
                  )}
                <ContentRow title="Ultime Uscite" items={latestMovies} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
                <ContentRow title="I più Votati" items={trending} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
                <ContentRow title="Serie TV Popolari" items={topSeries} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
                <ContentRow title="Anime da non Perdere" items={popularAnime} onCardClick={item => mediaStore.setRemoteSelectedItem(item)} />
              </Box>
            </Container>
        </Box>
    );
};

export default observer(RemoteControlView);