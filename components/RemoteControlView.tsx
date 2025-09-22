import React from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Container, AppBar, Toolbar } from '@mui/material';
import { ContentRow } from './ContentRow';
import RemoteDetailView from './RemoteDetailView';
import RemotePlayerControlView from './RemotePlayerControlView';
import { useTranslations } from '../hooks/useTranslations';
import type { MediaItem, PlayableItem } from '../types';

const RemoteControlView: React.FC = observer(() => {
    const { t } = useTranslations();
    const { 
        latestMovies, 
        trending, 
        topSeries, 
        popularAnime,
        remoteSlaveState,
        continueWatchingItems,
        myListItems,
        remoteSelectedItem,
        playRemoteItem,
        setRemoteSelectedItem
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
                        {t('remote.title')}
                    </Typography>
                </Toolbar>
             </AppBar>

             <Container maxWidth={false} sx={{ py: 4, pl: { xs: 2, md: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 4, md: 8 } }}>
                <Typography variant="h4" fontWeight="bold">{t('remote.chooseForTV')}</Typography>
                  {continueWatchingItems.length > 0 && (
                      <ContentRow 
                        title={t('misc.continueWatching')} 
                        items={continueWatchingItems as MediaItem[]} 
                        onCardClick={(item) => playRemoteItem(item as PlayableItem)}
                        isContinueWatching={true}
                      />
                  )}
                  {myListItems.length > 0 && (
                      <ContentRow title={t('misc.myList')} items={myListItems} onCardClick={setRemoteSelectedItem} />
                  )}
                <ContentRow title={t('misc.latestReleases')} items={latestMovies} onCardClick={setRemoteSelectedItem} />
                <ContentRow title={t('misc.topRated')} items={trending} onCardClick={setRemoteSelectedItem} />
                <ContentRow title={t('misc.popularSeries')} items={topSeries} onCardClick={setRemoteSelectedItem} />
                <ContentRow title={t('misc.mustWatchAnime')} items={popularAnime} onCardClick={setRemoteSelectedItem} />
              </Box>
            </Container>
        </Box>
    );
});

export default RemoteControlView;