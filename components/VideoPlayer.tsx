import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const VideoPlayer: React.FC = () => {
  const { nowPlayingItem } = mediaStore;

  if (!nowPlayingItem) {
    // Fallback if component is rendered without an item
    mediaStore.stopPlayback();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'black' }}>
            <CircularProgress color="primary" />
        </Box>
    );
  }

  const title = nowPlayingItem.title || nowPlayingItem.name;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      zIndex: 2000, // Ensure it's on top of everything
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <AppBar position="absolute" sx={{ 
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        boxShadow: 'none' 
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => mediaStore.stopPlayback()}
            aria-label="go back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2, textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
            Stai guardando: {title}
          </Typography>
        </Toolbar>
      </AppBar>
      <video
        src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        controls
        autoPlay
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onEnded={() => mediaStore.stopPlayback()}
      />
    </Box>
  );
};

export default observer(VideoPlayer);
