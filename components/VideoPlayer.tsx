import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, CircularProgress, Tooltip, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';
import EpisodesDrawer from './EpisodesDrawer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ListAltIcon from '@mui/icons-material/ListAlt';

const VideoPlayer: React.FC = () => {
  const { nowPlayingItem, roomId, isHost, sendPlaybackControl, stopPlayback, isSmartTV, isPlaying, sendSlaveStatusUpdate } = mediaStore;
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  // Effect for Watch Together Synchronization
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !roomId) return;

    const handlePlay = () => {
      if (isHost && !isSyncing) {
        sendPlaybackControl({ status: 'playing', time: videoElement.currentTime });
      }
    };
    
    const handlePause = () => {
      if (isHost && !isSyncing) {
        sendPlaybackControl({ status: 'paused', time: videoElement.currentTime });
      }
    };

    if (isHost) {
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
    }
    
    const disposer = mediaStore.addPlaybackListener((state) => {
        if (!isHost && videoElement) {
            setIsSyncing(true);
            if (Math.abs(videoElement.currentTime - state.time) > 1.5) {
                videoElement.currentTime = state.time;
            }
            if (state.status === 'playing' && videoElement.paused) {
                videoElement.play().catch(console.error);
            } else if (state.status === 'paused' && !videoElement.paused) {
                videoElement.pause();
            }
            setTimeout(() => setIsSyncing(false), 200);
        }
    });

    return () => {
      if (videoElement) {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      }
      if (disposer) disposer();
    };
  }, [isHost, sendPlaybackControl, roomId]);

  // Effect for Remote Control (Smart TV Slave)
  useEffect(() => {
      const videoElement = videoRef.current;
      if (isSmartTV && videoElement) {
          if (isPlaying && videoElement.paused) {
              videoElement.play().catch(console.error);
          } else if (!isPlaying && !videoElement.paused) {
              videoElement.pause();
          }
          sendSlaveStatusUpdate();
      }
  }, [isPlaying, isSmartTV, sendSlaveStatusUpdate]);

  // Effect for "Skip Intro" button visibility
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !nowPlayingItem || !('intro_start_s' in nowPlayingItem) || !nowPlayingItem.intro_start_s) {
        setShowSkipIntro(false);
        return;
    }

    const handleTimeUpdate = () => {
        const currentTime = videoElement.currentTime;
        const introStart = nowPlayingItem.intro_start_s ?? -1;
        const introEnd = nowPlayingItem.intro_end_s ?? -1;

        if (currentTime >= introStart && currentTime < introEnd) {
            if (!showSkipIntro) setShowSkipIntro(true);
        } else {
            if (showSkipIntro) setShowSkipIntro(false);
        }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
        videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [nowPlayingItem, showSkipIntro]);
  
  // Effect for Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Do not trigger shortcuts if the user is typing in an input (e.g., chat)
      if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') {
        return;
      }

      const videoElement = videoRef.current;
      if (!videoElement) return;

      const key = event.key.toLowerCase();
      
      if (['arrowright', 'arrowleft', 'arrowup', 'arrowdown', 'f', 'm'].includes(key)) {
          event.preventDefault();
      }

      switch (key) {
        case 'arrowright':
          videoElement.currentTime += 10;
          break;
        case 'arrowleft':
          videoElement.currentTime -= 10;
          break;
        case 'arrowup':
            videoElement.currentTime += 30;
            break;
        case 'arrowdown':
            videoElement.currentTime -= 30;
            break;
        case 'f':
          if (!document.fullscreenElement) {
            playerContainerRef.current?.requestFullscreen().catch(console.error);
          } else {
            document.exitFullscreen().catch(console.error);
          }
          break;
        case 'm':
          videoElement.muted = !videoElement.muted;
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array ensures this runs once on mount/unmount


  if (!nowPlayingItem) {
    // This component should be unmounted by App.tsx when nowPlayingItem is null.
    // This is a safeguard against race conditions, preventing render errors and recursive loops.
    return null;
  }
  
  const isEpisode = 'episode_number' in nowPlayingItem;
  let videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  let title: string;

  if (isEpisode) {
      videoSrc = nowPlayingItem.video_url || videoSrc; // Fallback to bunny
      const S = String(nowPlayingItem.season_number).padStart(2,'0');
      const E = String(nowPlayingItem.episode_number).padStart(2,'0');
      title = `${nowPlayingItem.show_title} - S${S}E${E}: ${nowPlayingItem.name}`;
  } else {
      title = nowPlayingItem.title || nowPlayingItem.name || 'Video';
  }

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
      const videoElement = videoRef.current;
      if (videoElement && 'intro_end_s' in nowPlayingItem && nowPlayingItem.intro_end_s) {
          videoElement.currentTime = nowPlayingItem.intro_end_s;
          setShowSkipIntro(false);
      }
  };
  
  return (
    <Box ref={playerContainerRef} sx={{ position: 'relative', width: '100vw', height: '100vh', bgcolor: 'black', display: 'flex', flexDirection: 'row' }}>
      <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          src={videoSrc}
          controls={!isSmartTV} // Hide controls on Smart TV
          autoPlay
          onEnded={handleNextEpisode}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {/* Top bar overlay */}
        <AppBar position="absolute" sx={{ top: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)', boxShadow: 'none' }}>
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="back" onClick={stopPlayback}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
                 {mediaStore.nextEpisode && (
                     <Tooltip title="Prossimo Episodio">
                        <IconButton color="inherit" onClick={handleNextEpisode}>
                            <SkipNextIcon />
                        </IconButton>
                     </Tooltip>
                 )}
                 {isEpisode && (
                    <Tooltip title="Lista Episodi">
                        <IconButton color="inherit" onClick={mediaStore.openEpisodesDrawer}>
                            <ListAltIcon />
                        </IconButton>
                    </Tooltip>
                 )}
            </Toolbar>
        </AppBar>

        {showSkipIntro && (
            <Button 
                variant="contained" 
                color="inherit" 
                onClick={skipIntro}
                sx={{
                    position: 'absolute',
                    bottom: '80px', // Adjust as needed
                    right: '20px',
                    zIndex: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    color: 'black',
                    '&:hover': { bgcolor: 'white' }
                }}
            >
                Salta Intro
            </Button>
        )}
      </Box>
      {roomId && <Chat />}
      {isEpisode && <EpisodesDrawer />}
    </Box>
  );
};

export default observer(VideoPlayer);
