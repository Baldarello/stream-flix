import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Container, Paper, IconButton, AppBar, Toolbar, Slide } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { ContentRow } from './ContentRow';
import type { MediaItem } from '../types';

const RemoteControlView: React.FC = () => {
    const { latestMovies, trending, topSeries, popularAnime, remoteSlaveState, sendRemoteCommand } = mediaStore;

    const handleSelectMedia = (item: MediaItem) => {
        sendRemoteCommand({
            command: 'select_media',
            media: item,
        });
    };
    
    const handleTogglePlay = () => {
        if (remoteSlaveState?.isPlaying) {
            sendRemoteCommand({ command: 'pause' });
        } else {
            sendRemoteCommand({ command: 'play' });
        }
    };
    
    const nowPlayingItem = remoteSlaveState?.nowPlayingItem;
    const title = nowPlayingItem?.title || nowPlayingItem?.name;
    const showNowPlaying = !!nowPlayingItem;

    return (
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary', pb: showNowPlaying ? '100px' : 0 }}>
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
                <ContentRow title="Ultime Uscite" items={latestMovies} />
                <ContentRow title="I più Votati" items={trending} />
                <ContentRow title="Serie TV Popolari" items={topSeries} />
                <ContentRow title="Anime da non Perdere" items={popularAnime} />
              </Box>
            </Container>

            <Slide direction="up" in={showNowPlaying} mountOnEnter unmountOnExit>
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        bgcolor: '#181818',
                        zIndex: 1500
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                        {nowPlayingItem?.poster_path && (
                             <Box
                                component="img"
                                src={nowPlayingItem.poster_path}
                                sx={{ width: 60, height: 90, borderRadius: 1, objectFit: 'cover' }}
                             />
                        )}
                        <Box sx={{ flex: 1, mx: 2, overflow: 'hidden' }}>
                            <Typography variant="body1" fontWeight="bold" noWrap>{title}</Typography>
                            <Typography variant="body2" color="text.secondary">In riproduzione sulla TV</Typography>
                        </Box>
                        <IconButton
                            onClick={handleTogglePlay}
                            sx={{
                                bgcolor: 'white',
                                color: 'black',
                                width: 56,
                                height: 56,
                                '&:hover': { bgcolor: 'grey.300' }
                            }}
                        >
                            {remoteSlaveState?.isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                        </IconButton>
                    </Box>
                </Paper>
            </Slide>
        </Box>
    );
};

export default observer(RemoteControlView);