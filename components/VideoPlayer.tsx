import React, { useRef, useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, Tooltip, Button, Fade, Slider, Stack, Popover, List, ListItemButton, ListItemText } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';
import EpisodesDrawer from './EpisodesDrawer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DownloadIcon from '@mui/icons-material/Download';
import ShutterSpeedIcon from '@mui/icons-material/ShutterSpeed';
import { useTranslations } from '../hooks/useTranslations';

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

const VideoPlayer: React.FC = observer(() => {
  const { nowPlayingItem, roomId, isHost, sendPlaybackControl, stopPlayback, isSmartTV, isPlaying, sendSlaveStatusUpdate, setIntroSkippableOnSlave, activeTheme } = mediaStore;
  const { t } = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<number | null>(null);
  const lastHostUpdateTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  
  const [playerState, setPlayerState] = useState({
      isPlaying: false,
      progress: 0,
      volume: 1,
      isMuted: false,
      duration: 0,
      currentTime: 0,
      isFullScreen: false,
      playbackRate: 1,
  });
  const [volumeAnchorEl, setVolumeAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [speedAnchorEl, setSpeedAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Effect for Watch Together Synchronization
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !roomId) return;

    if (!isHost) {
        const { playbackState } = mediaStore;
        const initialSync = () => {
             if (!videoRef.current) return;
             if (Math.abs(videoRef.current.currentTime - playbackState.time) > 1.5) {
                videoRef.current.currentTime = playbackState.time;
             }
             if (playbackState.status === 'playing' && videoRef.current.paused) {
                 videoRef.current.play().catch(e => console.error("Sync play failed", e));
             } else if (playbackState.status === 'paused' && !videoRef.current.paused) {
                 videoRef.current.pause();
             }
        };
        if (videoElement.readyState >= videoElement.HAVE_METADATA) initialSync();
        else videoElement.addEventListener('loadedmetadata', initialSync, { once: true });
    }

    const handlePlay = () => isHost && !isSyncing && sendPlaybackControl({ status: 'playing', time: videoElement.currentTime });
    const handlePause = () => isHost && !isSyncing && !isSeekingRef.current && sendPlaybackControl({ status: 'paused', time: videoElement.currentTime });
    const handleSeeking = () => { if(isHost && !isSyncing) isSeekingRef.current = true; };
    const handleSeeked = () => {
        if(isHost && !isSyncing) {
            isSeekingRef.current = false;
            sendPlaybackControl({ status: videoElement.paused ? 'paused' : 'playing', time: videoElement.currentTime });
        }
    };
    const handleTimeUpdate = () => {
        const now = Date.now();
        if(isHost && !isSyncing && !isSeekingRef.current && !videoElement.paused && (now - lastHostUpdateTimeRef.current > 1000)) {
            lastHostUpdateTimeRef.current = now;
            sendPlaybackControl({ status: 'playing', time: videoElement.currentTime });
        }
    }

    if (isHost) {
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      videoElement.addEventListener('seeking', handleSeeking);
      videoElement.addEventListener('seeked', handleSeeked);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
    }
    
    const disposer = mediaStore.addPlaybackListener((state) => {
        if (!isHost && videoElement) {
            setIsSyncing(true);
            if (Math.abs(videoElement.currentTime - state.time) > 1.5) videoElement.currentTime = state.time;
            if (state.status === 'playing' && videoElement.paused) videoElement.play().catch(console.error);
            else if (state.status === 'paused' && !videoElement.paused) videoElement.pause();
            setTimeout(() => setIsSyncing(false), 200);
        }
    });

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('seeking', handleSeeking);
        videoElement.removeEventListener('seeked', handleSeeked);
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      }
      if (disposer) disposer();
    };
  }, [isHost, sendPlaybackControl, roomId]);
  
    // Effect for resuming playback from startTime
    useEffect(() => {
        const video = videoRef.current;
        const startTime = nowPlayingItem?.startTime;
        if (video && startTime) {
            const handleMetadata = () => {
                if (videoRef.current && videoRef.current.readyState >= 1) { // HAVE_METADATA
                    videoRef.current.currentTime = startTime;
                }
            };
            if (video.readyState >= 1) handleMetadata();
            else video.addEventListener('loadedmetadata', handleMetadata, { once: true });
            return () => video.removeEventListener('loadedmetadata', handleMetadata);
        }
    }, [nowPlayingItem?.id, nowPlayingItem?.startTime]);
  
    // Effect for saving progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !nowPlayingItem || !('episode_number' in nowPlayingItem)) return;
    
        const episodeId = nowPlayingItem.id;
        const saveProgress = () => {
            if (video && video.duration > 0 && !video.seeking) {
                mediaStore.updateEpisodeProgress({ episodeId, currentTime: video.currentTime, duration: video.duration });
            }
        };
        const interval = setInterval(saveProgress, 5000); // Save every 5 seconds
        video.addEventListener('pause', saveProgress);
        return () => { clearInterval(interval); if (video) { video.removeEventListener('pause', saveProgress); saveProgress(); } };
    }, [nowPlayingItem?.id]);

  // Effect for "Skip Intro" button visibility
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !nowPlayingItem || !('intro_start_s' in nowPlayingItem) || !nowPlayingItem.intro_start_s) {
        if(showSkipIntro) setShowSkipIntro(false);
        if (isSmartTV) setIntroSkippableOnSlave(false);
        return;
    }
    const handleTimeUpdate = () => {
        const currentTime = videoElement.currentTime;
        const introStart = nowPlayingItem.intro_start_s ?? -1;
        const introEnd = nowPlayingItem.intro_end_s ?? -1;
        const isSkippable = currentTime >= introStart && currentTime < introEnd;
        if (isSkippable !== showSkipIntro) {
            setShowSkipIntro(isSkippable);
            if (isSmartTV) setIntroSkippableOnSlave(isSkippable);
        }
    };
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => { if(videoElement) videoElement.removeEventListener('timeupdate', handleTimeUpdate); };
  }, [nowPlayingItem?.id, showSkipIntro, isSmartTV, setIntroSkippableOnSlave, nowPlayingItem]);
  
    // Effect to manage UI visibility
    useEffect(() => {
        const playerContainer = playerContainerRef.current;
        if (!playerContainer) return;
        const showAndThenHideUi = () => {
            setIsUiVisible(true);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            uiTimeoutRef.current = window.setTimeout(() => { if (!videoRef.current?.paused) setIsUiVisible(false); }, 3000);
        };
        const showUiPermanently = () => { if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current); setIsUiVisible(true); };
        playerContainer.addEventListener('mousemove', showAndThenHideUi);
        playerContainer.addEventListener('mouseleave', () => { if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current); if(!videoRef.current?.paused) setIsUiVisible(false); });
        showAndThenHideUi();
        return () => {
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            playerContainer.removeEventListener('mousemove', showAndThenHideUi);
            playerContainer.removeEventListener('mouseleave', () => {});
        };
    }, [playerState.isPlaying]);
    
    const handleTogglePlay = useCallback(() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }, []);
    const handleToggleMute = useCallback(() => { if(videoRef.current) videoRef.current.muted = !videoRef.current.muted; }, []);
    const handleToggleFullScreen = useCallback(() => { if(!document.fullscreenElement) playerContainerRef.current?.requestFullscreen(); else document.exitFullscreen(); }, []);
    const handleSpeedChange = useCallback((rate: number) => { if (videoRef.current) videoRef.current.playbackRate = rate; setSpeedAnchorEl(null); }, []);

    // Effect for Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const video = videoRef.current;
            if (!video) return;

            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); handleTogglePlay(); break;
                case 'f': e.preventDefault(); handleToggleFullScreen(); break;
                case 'm': e.preventDefault(); handleToggleMute(); break;
                case 'arrowright': e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); break;
                case 'arrowleft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); break;
                case 'arrowup': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
                case 'arrowdown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
                case '>': case '.': e.preventDefault();
                    const nextIndex = playbackRates.indexOf(playerState.playbackRate) + 1;
                    if (nextIndex < playbackRates.length) handleSpeedChange(playbackRates[nextIndex]);
                    break;
                case '<': case ',': e.preventDefault();
                    const prevIndex = playbackRates.indexOf(playerState.playbackRate) - 1;
                    if (prevIndex >= 0) handleSpeedChange(playbackRates[prevIndex]);
                    break;
                default: break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [playerState.playbackRate, handleTogglePlay, handleToggleFullScreen, handleToggleMute, handleSpeedChange]);
    
    // Player state management and event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateState = () => setPlayerState(prev => ({
            ...prev,
            isPlaying: !video.paused,
            progress: (video.currentTime / video.duration) * 100,
            currentTime: video.currentTime,
            duration: video.duration,
            volume: video.volume,
            isMuted: video.muted,
            playbackRate: video.playbackRate,
        }));

        const onPlay = () => setPlayerState(p => ({...p, isPlaying: true}));
        const onPause = () => setPlayerState(p => ({...p, isPlaying: false}));
        const onFsChange = () => setPlayerState(p => ({...p, isFullScreen: !!document.fullscreenElement}));
        
        video.addEventListener('timeupdate', updateState);
        video.addEventListener('durationchange', updateState);
        video.addEventListener('volumechange', updateState);
        video.addEventListener('ratechange', updateState);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', handleNextEpisode);
        document.addEventListener('fullscreenchange', onFsChange);

        return () => {
            video.removeEventListener('timeupdate', updateState);
            video.removeEventListener('durationchange', updateState);
            video.removeEventListener('volumechange', updateState);
            video.removeEventListener('ratechange', updateState);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', handleNextEpisode);
            document.removeEventListener('fullscreenchange', onFsChange);
        };
    }, [nowPlayingItem?.id]);


  if (!nowPlayingItem) return null;
  
  const handleSeek = (event: Event, newValue: number | number[]) => { if (videoRef.current) videoRef.current.currentTime = (newValue as number / 100) * playerState.duration; };
  const handleVolumeChange = (event: Event, newValue: number | number[]) => { if(videoRef.current) videoRef.current.volume = newValue as number; };

  const isEpisode = 'episode_number' in nowPlayingItem;
  let videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  let title: string;

  if (isEpisode) {
      videoSrc = nowPlayingItem.video_url || videoSrc;
      const S = String(nowPlayingItem.season_number).padStart(2,'0');
      const E = String(nowPlayingItem.episode_number).padStart(2,'0');
      title = `${nowPlayingItem.show_title} - S${S}E${E}: ${nowPlayingItem.name}`;
  } else {
      title = nowPlayingItem.title || nowPlayingItem.name || 'Video';
  }
  
  const handleDownload = () => {
        if (!videoSrc) return;
        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '_');
        const fileExtension = videoSrc.split('.').pop()?.split('?')[0] || 'mp4';
        const link = document.createElement('a');
        link.href = videoSrc;
        link.download = `${safeTitle}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  const handleNextEpisode = () => {
      const nextEp = mediaStore.nextEpisode;
      if (nextEp && mediaStore.currentShow && 'episode_number' in nowPlayingItem) {
          mediaStore.startPlayback({
              ...nextEp,
              show_id: mediaStore.currentShow.id,
              show_title: mediaStore.currentShow.title || mediaStore.currentShow.name || '',
              backdrop_path: mediaStore.currentShow.backdrop_path,
              season_number: nowPlayingItem.season_number,
          });
      }
  };

  const skipIntro = () => {
      if (videoRef.current && 'intro_end_s' in nowPlayingItem && nowPlayingItem.intro_end_s) {
          videoRef.current.currentTime = nowPlayingItem.intro_end_s;
          setShowSkipIntro(false);
      }
  };
  
  const themeColor = { SerieTV: 'var(--glow-seriestv-color)', Film: 'var(--glow-film-color)', Anime: 'var(--glow-anime-color)' }[activeTheme];

  return (
    <Box ref={playerContainerRef} sx={{ position: 'relative', width: '100vw', height: '100vh', bgcolor: 'black', display: 'flex', flexDirection: 'row', cursor: isUiVisible ? 'default' : 'none' }}>
      <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        <Fade in={isUiVisible} timeout={500}>
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }}>
            
            {/* Top Bar */}
            <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none', pointerEvents: 'auto' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" aria-label={t('videoPlayer.back')} onClick={stopPlayback}><ArrowBackIcon/></IconButton>
                    <Typography variant="h6" sx={{flexGrow: 1}} noWrap>{title}</Typography>
                    {mediaStore.nextEpisode && <Tooltip title={t('videoPlayer.nextEpisode')}><IconButton color="inherit" onClick={handleNextEpisode}><SkipNextIcon/></IconButton></Tooltip>}
                    {isEpisode && <Tooltip title={t('videoPlayer.episodeList')}><IconButton color="inherit" onClick={mediaStore.openEpisodesDrawer}><ListAltIcon/></IconButton></Tooltip>}
                </Toolbar>
            </AppBar>
            
            {/* Bottom Controls */}
            <Box sx={{ p: 2, pointerEvents: 'auto' }}>
                 <Slider
                    className="video-player-slider"
                    aria-label="progress"
                    value={isNaN(playerState.progress) ? 0 : playerState.progress}
                    onChange={handleSeek}
                    sx={{ color: themeColor }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={handleTogglePlay} color="inherit">
                            {playerState.isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                        </IconButton>
                        <IconButton onClick={(e) => setVolumeAnchorEl(e.currentTarget)} color="inherit">
                            {playerState.isMuted || playerState.volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                        </IconButton>
                         <Popover
                            open={Boolean(volumeAnchorEl)}
                            anchorEl={volumeAnchorEl}
                            onClose={() => setVolumeAnchorEl(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                            PaperProps={{ sx: { bgcolor: 'rgba(30,30,30,0.8)', backdropFilter: 'blur(5px)', p: 2, borderRadius: 2, backgroundImage: 'none' } }}
                        >
                            <Slider
                                className="video-player-slider"
                                sx={{ height: 100, color: themeColor }}
                                orientation="vertical"
                                value={playerState.isMuted ? 0 : playerState.volume}
                                onChange={handleVolumeChange}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                        </Popover>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip title={t('videoPlayer.downloadVideo')}>
                            <IconButton onClick={handleDownload} color="inherit"><DownloadIcon /></IconButton>
                        </Tooltip>
                        <Button
                            onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
                            color="inherit"
                            variant="text"
                            startIcon={<ShutterSpeedIcon />}
                            sx={{ fontFamily: 'monospace', textTransform: 'none', p: '4px 8px', minWidth: '48px' }}
                        >
                           {playerState.playbackRate.toFixed(2)}x
                        </Button>
                        <Popover
                            open={Boolean(speedAnchorEl)}
                            anchorEl={speedAnchorEl}
                            onClose={() => setSpeedAnchorEl(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                            PaperProps={{ sx: { bgcolor: 'rgba(30,30,30,0.8)', backdropFilter: 'blur(5px)', backgroundImage: 'none' } }}
                        >
                           <List dense>
                                {playbackRates.map(rate => (
                                    <ListItemButton key={rate} onClick={() => handleSpeedChange(rate)} selected={playerState.playbackRate === rate}>
                                        <ListItemText primary={`${rate}x`} />
                                    </ListItemButton>
                                ))}
                           </List>
                        </Popover>
                        <IconButton onClick={handleToggleFullScreen} color="inherit">
                            {playerState.isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    </Stack>
                </Stack>
            </Box>
          </Box>
        </Fade>

        {showSkipIntro && (
            <Fade in={isUiVisible} timeout={500}>
              <Button 
                  variant="contained" 
                  onClick={skipIntro}
                  sx={{
                      position: 'absolute',
                      bottom: { xs: '80px', md: '100px' },
                      right: '20px',
                      zIndex: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.8)', color: 'black',
                      '&:hover': { bgcolor: 'white' },
                  }}
              >
                  {t('videoPlayer.skipIntro')}
              </Button>
            </Fade>
        )}
      </Box>
      {roomId && <Chat />}
      {isEpisode && <EpisodesDrawer />}
    </Box>
  );
});

export default VideoPlayer;
