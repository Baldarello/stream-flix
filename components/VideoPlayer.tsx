import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, CircularProgress, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';
import EpisodesDrawer from './EpisodesDrawer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ListAltIcon from '@mui/icons-material/ListAlt';

const VideoPlayer: React.FC = () => {
  const { nowPlayingItem, roomId, isHost, sendPlaybackControl, stopPlayback, isSmartTV, isPlaying, sendSlaveStatusUpdate } = mediaStore;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  if (!nowPlayingItem) {
    // This component should be unmounted by App.tsx when nowPlayingItem is null.
    // This is a safeguard against race conditions, preventing render errors and recursive loops.
    return null;
  }
  
  const isEpisode = 'episode_number' in nowPlayingItem;
  let videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  // Fix: The 'title' property does not exist on all types of 'PlayableItem'.
  // Initializing 'title' here caused a type error. The variable is correctly
  // assigned within the subsequent if/else block which acts as a type guard.
  let title: string;

  if (isEpisode) {
      videoSrc = nowPlayingItem.video_url || videoSrc; // Fallback to bunny
      const S = String(nowPlayingItem.season_number).padStart(2,'0');
      const E = String(nowPlayingItem.episode_number).padStart(2,'0');
      title = `${nowPlayingItem.show_title} - S${S}E${E}: ${nowPlayingItem.name}`;
  } else {
      title = nowPlayingItem.title || nowPlayingItem.name || 'Contenuto Video';
  }

  const isRemoteControlled = isSmartTV;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      zIndex: 2000,
      display: 'flex',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Do not show AppBar on remote controlled TV */}
        {!isRemoteControlled && (
            <AppBar position="absolute" sx={{ 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
                boxShadow: 'none' 
            }}>
            <Toolbar>
                <IconButton
                edge="start"
                color="inherit"
                onClick={() => stopPlayback()}
                aria-label="go back"
                >
                <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" noWrap sx={{ ml: 2, textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                  {roomId ? `Stanza: ${roomId} - ` : ''}{title}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                {isEpisode && (
                  <>
                    <Tooltip title="Prossimo episodio">
                      <span>
                        <IconButton
                          color="inherit"
                          onClick={() => {
                              if (mediaStore.nextEpisode) {
                                  mediaStore.startPlayback({
                                    ...mediaStore.nextEpisode,
                                    show_id: mediaStore.currentShow!.id,
                                    show_title: mediaStore.currentShow!.title || mediaStore.currentShow!.name || '',
                                    backdrop_path: mediaStore.currentShow!.backdrop_path,
                                    season_number: (nowPlayingItem as any).season_number,
                                  });
                              }
                          }}
                          disabled={!mediaStore.nextEpisode}
                        >
                          <SkipNextIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Lista episodi">
                      <IconButton
                        color="inherit"
                        onClick={mediaStore.openEpisodesDrawer}
                      >
                        <ListAltIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
            </Toolbar>
            </AppBar>
        )}
        <video
          ref={videoRef}
          src={videoSrc}
          controls={!roomId && !isRemoteControlled || isHost}
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onPlay={sendSlaveStatusUpdate}
          onPause={sendSlaveStatusUpdate}
          onEnded={() => stopPlayback()}
          key={videoSrc} // Force re-render if src changes
        />
      </Box>
      {roomId && <Chat />}
      {isEpisode && <EpisodesDrawer />}
    </Box>
  );
};

export default observer(VideoPlayer);