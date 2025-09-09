import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';

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
    mediaStore.stopPlayback();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'black' }}>
            <CircularProgress color="primary" />
        </Box>
    );
  }

  const title = nowPlayingItem.title || nowPlayingItem.name;
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
                <Typography variant="h6" sx={{ ml: 2, textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                {roomId ? `Stanza: ${roomId} - ` : ''}Stai guardando: {title}
                </Typography>
            </Toolbar>
            </AppBar>
        )}
        <video
          ref={videoRef}
          src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          controls={!roomId && !isRemoteControlled || isHost}
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onPlay={sendSlaveStatusUpdate}
          onPause={sendSlaveStatusUpdate}
          onEnded={() => stopPlayback()}
        />
      </Box>
      {roomId && <Chat />}
    </Box>
  );
};

export default observer(VideoPlayer);
