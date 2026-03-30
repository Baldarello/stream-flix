import React, {useCallback, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../store/mediaStore.ts';
import {
    Box,
    Button,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Popover,
    Slider,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Forward10Icon from '@mui/icons-material/Forward10';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Replay10Icon from '@mui/icons-material/Replay10';
import ShutterSpeedIcon from '@mui/icons-material/ShutterSpeed';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {useTranslations} from '../hooks/useTranslations.ts';

const formatTime = (timeInSeconds: number) => {
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

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface PlayerState {
    isPlaying: boolean;
    progress: number;
    volume: number;
    isMuted: boolean;
    duration: number;
    currentTime: number;
    isFullScreen: boolean;
    playbackRate: number;
}

export interface VideoControlsProps {
    playerState: PlayerState;
    handleSeek: (event: Event, newValue: number | number[]) => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    handleRewind10: () => void;
    handleTogglePlay: () => void;
    handleForward10: () => void;
    handleSkipIntro: () => void;
    setVolumeAnchorEl: (el: HTMLButtonElement | null) => void;
    volumeAnchorEl: HTMLButtonElement | null;
    handleVolumeChange: (event: Event, newValue: number | number[]) => void;
    handleDownload: () => void;
    setSpeedAnchorEl: (el: HTMLButtonElement | null) => void;
    speedAnchorEl: HTMLButtonElement | null;
    handleToggleFullScreen: () => void;
    handleSpeedChange: (rate: number) => void;
    t: ReturnType<typeof useTranslations>;
}

const VideoControls: React.FC<VideoControlsProps> = observer(({
                                                                  playerState,
                                                                  handleSeek,
                                                                  videoRef,
                                                                  handleRewind10,
                                                                  handleTogglePlay,
                                                                  handleForward10,
                                                                  handleSkipIntro,
                                                                  handleVolumeChange,
                                                                  handleDownload,
                                                                  handleToggleFullScreen
                                                              }) => {

    const {t} = useTranslations();
    const {roomId, isHost, activeTheme} = mediaStore;
    const [volumeAnchorEl, setVolumeAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [speedAnchorEl, setSpeedAnchorEl] = useState<HTMLButtonElement | null>(null);

    const handleSpeedChange = useCallback((rate: number) => {
        if (videoRef.current) videoRef.current.playbackRate = rate;
        setSpeedAnchorEl(null);
    }, []);
    const themeColor = {
        SerieTV: 'var(--glow-seriestv-color)',
        Film: 'var(--glow-film-color)',
        Anime: 'var(--glow-anime-color)'
    }[activeTheme] as string;

    return (
        <>
            <Slider
                className="video-player-slider"
                aria-label="progress"
                value={isNaN(playerState.progress) ? 0 : playerState.progress}
                onChange={handleSeek}
                onChangeCommitted={(_, value) => {
                    if (videoRef.current && (!roomId || isHost)) {
                        const newTime = ((value as number) / 100) * playerState.duration;
                        videoRef.current.currentTime = newTime;
                    }
                }}
                sx={{color: themeColor}}
                disabled={!!roomId && !isHost}
                disableSwap={true}
            />
            <Stack direction="row" sx={{justifyContent: 'space-between', alignItems: 'center'}}>
                <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                    <Tooltip title={t('videoPlayer.skipBack10') || 'Rewind 10s'}>
                        <IconButton onClick={handleRewind10} color="inherit"
                                    disabled={!!roomId && !isHost}
                        >
                            <Replay10Icon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={handleTogglePlay} color="inherit"
                                disabled={!!roomId && !isHost}>
                        {playerState.isPlaying ? <PauseIcon fontSize="large"/> :
                            <PlayArrowIcon fontSize="large"/>}
                    </IconButton>
                    <Tooltip title={t('videoPlayer.forward10') || 'Forward 10s'}>
                        <IconButton onClick={handleForward10} color="inherit"
                                    disabled={!!roomId && !isHost}>
                            <Forward10Icon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('videoPlayer.skipIntro') || 'Skip Intro/Credits'}>
                        <IconButton onClick={handleSkipIntro} color="inherit"
                                    disabled={!!roomId && !isHost}>
                            <SkipNextIcon fontSize="large"/>
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={(e) => setVolumeAnchorEl(e.currentTarget)}
                                color="inherit">
                        {playerState.isMuted || playerState.volume === 0 ? <VolumeOffIcon/> :
                            <VolumeUpIcon/>}
                    </IconButton>
                    {volumeAnchorEl && (
                        <Popover
                            open={true}
                            anchorEl={volumeAnchorEl}
                            onClose={() => setVolumeAnchorEl(null)}
                            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                            transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
                            PaperProps={{
                                sx: {
                                    bgcolor: 'rgba(30,30,30,0.8)',
                                    backdropFilter: 'blur(5px)',
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundImage: 'none'
                                }
                            }}
                        >
                            <Slider
                                className="video-player-slider"
                                sx={{height: 100, color: themeColor}}
                                orientation="vertical"
                                value={playerState.isMuted ? 0 : playerState.volume}
                                onChange={handleVolumeChange}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                        </Popover>
                    )}
                    <Typography variant="body2" sx={{fontFamily: 'monospace'}}>
                        {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                    <Tooltip title={t('videoPlayer.downloadVideo')}>
                        <IconButton onClick={handleDownload}
                                    color="inherit"><DownloadIcon/></IconButton>
                    </Tooltip>
                    <Button
                        onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
                        color="inherit"
                        variant="text"
                        startIcon={<ShutterSpeedIcon/>}
                        sx={{
                            fontFamily: 'monospace',
                            textTransform: 'none',
                            p: '4px 8px',
                            minWidth: '48px'
                        }}
                        disabled={!!roomId && !isHost}
                    >
                        {playerState.playbackRate.toFixed(2)}x
                    </Button>
                    {speedAnchorEl && (
                        <Popover
                            open={true}
                            anchorEl={speedAnchorEl}
                            onClose={() => setSpeedAnchorEl(null)}
                            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                            transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
                            PaperProps={{
                                sx: {
                                    bgcolor: 'rgba(30,30,30,0.8)',
                                    backdropFilter: 'blur(5px)',
                                    backgroundImage: 'none'
                                }
                            }}
                        >
                            <List dense>
                                {playbackRates.map(rate => (
                                    <ListItemButton key={rate}
                                                    onClick={() => handleSpeedChange(rate)}
                                                    selected={playerState.playbackRate === rate}>
                                        <ListItemText primary={`${rate}x`}/>
                                    </ListItemButton>
                                ))}
                            </List>
                        </Popover>
                    )}
                    <IconButton onClick={handleToggleFullScreen} color="inherit">
                        {playerState.isFullScreen ? <FullscreenExitIcon/> : <FullscreenIcon/>}
                    </IconButton>
                </Stack>
            </Stack>
        </>
    );
});

export default VideoControls;
