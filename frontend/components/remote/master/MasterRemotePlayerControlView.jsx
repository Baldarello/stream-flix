import React, {useEffect, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../../store/mediaStore.js';
import {remoteStore} from '../../../store/remoteStore.js';
import {websocketService} from '../../../services/websocketService.js';
import {
    AppBar,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Slider,
    Stack,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Replay10 from '@mui/icons-material/Replay10';
import Forward10 from '@mui/icons-material/Forward10';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

import {useTranslations} from '../../../hooks/useTranslations.js';
import ConnectionIndicator from '../../utilities/ConnectionIndicator.jsx';
import EpisodesDrawer from './EpisodesDrawer.jsx';

const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
        return '00:00';
    }
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${formattedMinutes}:${formattedSeconds}`;
};


const MasterRemotePlayerControlView = observer(() => {
    const {
        remoteSlaveState,
        sendRemoteCommand,
        stopRemotePlayback,
        remoteFullItem,
        isRemoteFullItemLoading,
        remoteNextEpisode,
        remotePreviousEpisode,
        playRemoteItem,
        masterReconnectAttempts,
        isReconnecting,
        isRemoteMasterConnected,
        slaveId,
        openQRScanner,
        disconnectRemoteMaster
    } = remoteStore;
    const {t} = useTranslations();
    const [isEpisodesDrawerOpen, setIsEpisodesDrawerOpen] = useState(false);

    const nowPlayingItem = remoteSlaveState?.nowPlayingItem;

    useEffect(() => {
        remoteStore.fetchRemoteFullItem();
    }, [nowPlayingItem?.id]);


    // Listen for slave not connected events
    useEffect(() => {
        const handleSlaveNotConnected = (payload) => {
            console.log('[MasterRemotePlayerControlView] Slave not connected:', payload);
            mediaStore.showSnackbar(payload.message || 'TV not connected. Please scan QR code to reconnect.', 'error');
        };

        websocketService.events.on('slave-not-connected', handleSlaveNotConnected);

        return () => {
            websocketService.events.off('slave-not-connected', handleSlaveNotConnected);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isRemoteMasterConnected && slaveId) {
                websocketService.masterDisconnecting(slaveId);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isRemoteMasterConnected, slaveId]);

    // Show reconnection UI when slave is disconnected
    if (!isRemoteMasterConnected && slaveId) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                bgcolor: 'background.default',
                gap: 3,
                p: 3
            }}>
                <Typography variant="h5"
                            color="error">{t('remote.player.connectionLost') || 'Connection Lost'}</Typography>
                <Typography color="text.secondary" textAlign="center">
                    {t('remote.player.connectionLostDesc') || 'The TV has disconnected. Scan the QR code to reconnect.'}
                </Typography>
                {isReconnecting && (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
                        <CircularProgress size={24}/>
                        <Typography variant="body2" color="text.secondary">
                            Reconnecting... ({masterReconnectAttempts}/12)
                        </Typography>
                    </Box>
                )}
                <Button variant="contained" color="primary" onClick={openQRScanner} size="large">
                    {t('remote.player.reconnect') || 'Reconnect'}
                </Button>
                <Button variant="outlined" color="inherit" onClick={disconnectRemoteMaster} sx={{mt: 2}}>
                    {t('remote.player.disconnect')}
                </Button>
            </Box>
        );
    }

    if (!nowPlayingItem) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                bgcolor: 'background.default'
            }}>
                <Typography>{t('remote.player.noContent') || 'Nessun contenuto in riproduzione.'}</Typography>
            </Box>
        );
    }

    const isPlaying = remoteSlaveState?.isPlaying ?? false;
    const isEpisode = 'episode_number' in nowPlayingItem;

    const title = isEpisode ? nowPlayingItem.show_title : (nowPlayingItem.title || nowPlayingItem.name);
    const episodeTitle = isEpisode ? `S${String(nowPlayingItem.season_number).padStart(2, '0')}E${String(nowPlayingItem.episode_number).padStart(2, '0')}: ${nowPlayingItem.name}` : t('remote.player.nowPlaying');

    const handleTogglePlay = () => sendRemoteCommand({command: isPlaying ? 'pause' : 'play'});
    const handleSeekForward = () => sendRemoteCommand({command: 'seek_forward'});
    const handleSeekBackward = () => sendRemoteCommand({command: 'seek_backward'});
    const handleSkipIntro = () => {
        const showId = 'show_id' in nowPlayingItem ? nowPlayingItem.show_id : nowPlayingItem.id;
        const skipDuration = mediaStore.showIntroDurations.get(showId) || 80;
        sendRemoteCommand({command: 'skip_intro', skipDuration});
    };

    const handlePlayNext = () => {
        if (remoteNextEpisode && remoteFullItem && isEpisode && 'season_number' in nowPlayingItem) {
            playRemoteItem({
                ...remoteNextEpisode,
                show_id: remoteFullItem.id,
                show_title: remoteFullItem.title || remoteFullItem.name || '',
                backdrop_path: remoteFullItem.backdrop_path,
                season_number: nowPlayingItem.season_number,
            });
        }
    };

    const handlePlayPrevious = () => {
        if (remotePreviousEpisode && remoteFullItem && isEpisode && 'season_number' in nowPlayingItem) {
            playRemoteItem({
                ...remotePreviousEpisode,
                show_id: remoteFullItem.id,
                show_title: remoteFullItem.title || remoteFullItem.name || '',
                backdrop_path: remoteFullItem.backdrop_path,
                season_number: nowPlayingItem.season_number,
            });
        }
    };

    const handleSeek = (event, newValue) => {
        const newTime = ((newValue) / 100) * (remoteSlaveState?.duration || 0);
        sendRemoteCommand({command: 'seek_to', time: newTime});
    };

    const isSeries = remoteFullItem?.media_type === 'tv';

    const currentTime = remoteSlaveState?.currentTime || 0;
    const duration = remoteSlaveState?.duration || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Box sx={{
            bgcolor: 'background.default',
            color: 'text.primary',
            minHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <AppBar position="sticky" sx={{bgcolor: 'background.paper'}}>
                <Toolbar>
                    <IconButton id="master-remote-back-button" edge="start" color="inherit" onClick={() => {
                        // Mark the remote as stopping so that any subsequent
                        // 'quix-slave-status-update' messages coming from the
                        // slave (sent every 1s) do not bounce the view back to
                        // the MasterRemotePlayerControlView.
                        remoteStore.isStoppingRemotePlayback = true;
                        stopRemotePlayback();
                        // Navigate to series list by clearing nowPlayingItem
                        if (remoteStore.remoteSlaveState) {
                            remoteStore.remoteSlaveState = {
                                ...remoteStore.remoteSlaveState,
                                nowPlayingItem: null
                            };
                        }
                        mediaStore.setActiveView('Serie TV');
                    }}
                                aria-label={t('remote.player.back')}>
                        <ArrowBackIcon/>
                    </IconButton>
                    <Typography variant="h6" noWrap sx={{flexGrow: 1}}>
                        {t('remote.player.title')}
                    </Typography>
                    <ConnectionIndicator/>
                    {/* FIX: (line 224) Wrap IconButton with Tooltip component */}
                    <Tooltip title={t('remote.player.disconnect')}>
                        <IconButton color="inherit" onClick={disconnectRemoteMaster}>
                            <PowerSettingsNewIcon/>
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Now Playing Info with Backdrop */}
            <Box sx={{
                position: 'relative',
                height: {xs: '250px', sm: '350px'},
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                p: {xs: 2, sm: 3},
                color: 'white',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${nowPlayingItem.backdrop_path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(20, 20, 20, 1) 10%, rgba(20, 20, 20, 0.7) 40%, transparent 80%)',
                }
            }}>
                <Box sx={{position: 'relative', zIndex: 1}}>
                    <Typography variant="h4" fontWeight="bold" noWrap>{title}</Typography>
                    <Typography color="text.secondary" noWrap>{episodeTitle}</Typography>
                </Box>
            </Box>

            {/* Controls section - pushed to bottom with flex layout */}
            <Box
                sx={{p: {xs: 2, sm: 3}, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1}}>
                {/* Progress Bar - at the bottom */}
                <Box sx={{mb: 4}}>
                    <Slider
                        className="video-player-slider"
                        aria-label="progress"
                        value={progress}
                        onChangeCommitted={handleSeek}
                    />
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: "space-between",
                        flexDirection: "row",
                        gap: 2,
                    }}>
                        <Typography variant="caption"
                                    sx={{fontFamily: 'monospace'}}>{formatTime(currentTime)}</Typography>

                        <Typography variant="caption" sx={{fontFamily: 'monospace'}}>{formatTime(duration)}</Typography>
                    </Box>
                </Box>

                {/* Main Controls */}
                <Stack direction="row" spacing={{xs: 2, sm: 4}} gap={"0.25rem"}
                       sx={{justifyContent: 'center', alignItems: 'center', mb: 3}}>
                    {isEpisode && (
                        <IconButton onClick={handlePlayPrevious} disabled={!remotePreviousEpisode}
                                    aria-label={t('remote.player.previousEpisode')} sx={{}}>
                            <SkipPreviousIcon fontSize="large"/>
                        </IconButton>
                    )}
                    <IconButton onClick={handleSeekBackward} aria-label={t('remote.player.seekBackward')} sx={{}}>
                        <Replay10 fontSize="large"/>
                    </IconButton>
                    <IconButton
                        id={"play-pause-button"}
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? t('remote.player.pause') : t('remote.player.play')}
                        sx={{
                            bgcolor: 'white', color: 'black', transform: "scale(1.5)",
                            '&:hover': {bgcolor: 'grey.300'}
                        }}
                    >
                        {isPlaying ? <PauseIcon fontSize="large"/> : <PlayArrowIcon fontSize="large"/>}
                    </IconButton>
                    <IconButton onClick={handleSeekForward} aria-label={t('remote.player.seekForward')} sx={{}}>
                        <Forward10 fontSize="large"/>
                    </IconButton>
                    {isEpisode && (
                        <IconButton onClick={handlePlayNext} disabled={!remoteNextEpisode}
                                    aria-label={t('remote.player.nextEpisode')} sx={{}}>
                            <SkipNextIcon fontSize="large"/>
                        </IconButton>
                    )}
                </Stack>

                {/* Secondary Controls */}
                <Stack direction="row" spacing={2} sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Button
                        variant="contained"
                        color="inherit"
                        onClick={handleSkipIntro}
                        sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            color: 'black',
                            '&:hover': {bgcolor: 'white'},
                        }}
                    >
                        {t('remote.player.skipIntro')}
                    </Button>
                    {isSeries && (
                        <Button
                            variant="outlined"
                            startIcon={<ListAltIcon/>}
                            onClick={() => setIsEpisodesDrawerOpen(true)}
                            sx={{borderColor: 'rgba(255,255,255,0.7)', color: 'white'}}
                        >
                            {t('remote.player.episodes')}
                        </Button>
                    )}
                </Stack>
            </Box>

            {isSeries && (
                <EpisodesDrawer
                    isOpen={isEpisodesDrawerOpen}
                    onClose={() => setIsEpisodesDrawerOpen(false)}
                />
            )}
        </Box>
    );
});

export default MasterRemotePlayerControlView;
