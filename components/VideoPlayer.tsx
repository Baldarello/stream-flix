import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, IconButton, Typography, AppBar, Toolbar, CircularProgress, Tooltip, Button, Fade } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chat from './Chat';
import EpisodesDrawer from './EpisodesDrawer';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useTranslations } from '../hooks/useTranslations';

const VideoPlayer: React.FC = observer(() => {
  const { nowPlayingItem, roomId, isHost, sendPlaybackControl, stopPlayback, isSmartTV, isPlaying, sendSlaveStatusUpdate, setIntroSkippableOnSlave } = mediaStore;
  const { t } = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const uiTimeoutRef = useRef<number | null>(null);
  const lastHostUpdateTimeRef = useRef(0);
  const isSeekingRef = useRef(false);

  // Effect for Watch Together Synchronization
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !roomId) return;

    // For clients, set the initial state from the store when the component first loads for this room.
    if (!isHost) {
        const { playbackState } = mediaStore;
        
        const initialSync = () => {
             if (!videoRef.current) return;
             // Set time
             if (Math.abs(videoRef.current.currentTime - playbackState.time) > 1.5) {
                videoRef.current.currentTime = playbackState.time;
             }
             // Set play/pause status
             if (playbackState.status === 'playing' && videoRef.current.paused) {
                 videoRef.current.play().catch(e => console.error("Sync play failed", e));
             } else if (playbackState.status === 'paused' && !videoRef.current.paused) {
                 videoRef.current.pause();
             }
        };

        // If video metadata is already loaded, sync now. Otherwise, wait for it.
        if (videoElement.readyState >= videoElement.HAVE_METADATA) {
            initialSync();
        } else {
            videoElement.addEventListener('loadedmetadata', initialSync, { once: true });
        }
    }


    // Host event listeners to send updates
    const handlePlay = () => {
      if (isHost && !isSyncing) {
        sendPlaybackControl({ status: 'playing', time: videoElement.currentTime });
      }
    };
    const handlePause = () => {
      if (isHost && !isSyncing && !isSeekingRef.current) {
        sendPlaybackControl({ status: 'paused', time: videoElement.currentTime });
      }
    };
    const handleSeeking = () => {
        if(isHost && !isSyncing) {
            isSeekingRef.current = true;
        }
    };
    const handleSeeked = () => {
        if(isHost && !isSyncing) {
            isSeekingRef.current = false;
            sendPlaybackControl({ status: videoElement.paused ? 'paused' : 'playing', time: videoElement.currentTime });
        }
    };
    const handleTimeUpdate = () => {
        const now = Date.now();
        // Send periodic updates during playback, at most once per second, and not while seeking.
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
    
    // Client listener to receive updates
    const disposer = mediaStore.addPlaybackListener((state) => {
        if (!isHost && videoElement) {
            setIsSyncing(true);
            // Only seek if the time difference is significant to avoid jerky playback
            if (Math.abs(videoElement.currentTime - state.time) > 1.5) {
                videoElement.currentTime = state.time;
            }
            if (state.status === 'playing' && videoElement.paused) {
                videoElement.play().catch(console.error);
            } else if (state.status === 'paused' && !videoElement.paused) {
                videoElement.pause();
            }
            // Release the sync lock after a short delay
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
            if (video.readyState >= 1) {
                handleMetadata();
            } else {
                video.addEventListener('loadedmetadata', handleMetadata, { once: true });
            }
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
                mediaStore.updateEpisodeProgress({
                    episodeId,
                    currentTime: video.currentTime,
                    duration: video.duration,
                });
            }
        };
    
        const interval = setInterval(saveProgress, 5000); // Save every 5 seconds
        video.addEventListener('pause', saveProgress);
    
        return () => {
            clearInterval(interval);
            if (video) {
                video.removeEventListener('pause', saveProgress);
                saveProgress(); // Final save on unmount/cleanup
            }
        };
    }, [nowPlayingItem?.id]);

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

  // Effect to handle remote actions like seeking and fullscreen
  useEffect(() => {
    const action = mediaStore.remoteAction;
    const videoElement = videoRef.current;
    const containerElement = playerContainerRef.current;
    if (isSmartTV && action && containerElement) {
      if (action.type === 'seek' && videoElement) {
        videoElement.currentTime += action.payload;
      }
      if (action.type === 'fullscreen') {
        if (!document.fullscreenElement) {
            containerElement.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen().catch(console.error);
        }
      }
      if (action.type === 'skip_intro' && videoElement && nowPlayingItem && 'intro_end_s' in nowPlayingItem && nowPlayingItem.intro_end_s) {
          videoElement.currentTime = nowPlayingItem.intro_end_s;
      }
      mediaStore.clearRemoteAction();
    }
  }, [isSmartTV, mediaStore.remoteAction, nowPlayingItem]);

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
            if (isSmartTV) {
                setIntroSkippableOnSlave(isSkippable);
            }
        }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
        if(videoElement) {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        }
    };
  }, [nowPlayingItem, showSkipIntro, isSmartTV, setIntroSkippableOnSlave]);
  
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
  }, []);

    // Effect to manage UI visibility
    useEffect(() => {
        const playerContainer = playerContainerRef.current;
        const video = videoRef.current;
        if (!playerContainer || !video) return;

        const showAndThenHideUi = () => {
            setIsUiVisible(true);
            if (uiTimeoutRef.current) {
                clearTimeout(uiTimeoutRef.current);
            }
            uiTimeoutRef.current = window.setTimeout(() => {
                if (!video.paused) {
                    setIsUiVisible(false);
                }
            }, 3000); // Hide after 3 seconds
        };

        const showUiPermanently = () => {
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            setIsUiVisible(true);
        };

        playerContainer.addEventListener('mousemove', showAndThenHideUi);
        video.addEventListener('pause', showUiPermanently);
        video.addEventListener('play', showAndThenHideUi);

        showAndThenHideUi(); // Initial show

        return () => {
            if (uiTimeoutRef.current) {
                clearTimeout(uiTimeoutRef.current);
            }
            playerContainer.removeEventListener('mousemove', showAndThenHideUi);
            video.removeEventListener('pause', showUiPermanently);
            video.removeEventListener('play', showAndThenHideUi);
        };
    }, []);

  if (!nowPlayingItem) {
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
          controls={!roomId || isHost}
          autoPlay
          onEnded={handleNextEpisode}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {/* Top bar overlay */}
          {!isSmartTV && (
            <Fade in={isUiVisible} timeout={500}>
              <AppBar position="absolute" sx={{
                  top: 16,
                  left: 16,
                  right: 16,
                  width: 'auto',
                  borderRadius: '16px',
                  background: 'rgba(20, 20, 30, 0.6)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: 'none',
                  transition: 'opacity 0.5s ease-in-out'
              }}>
                  <Toolbar>
                      <IconButton edge="start" color="inherit" aria-label={t('videoPlayer.back')} onClick={stopPlayback}>
                          <ArrowBackIcon/>
                      </IconButton>
                      <Typography variant="h6" sx={{flexGrow: 1}}>{title}</Typography>
                      {mediaStore.nextEpisode && (
                          <Tooltip title={t('videoPlayer.nextEpisode')}>
                              <IconButton color="inherit" onClick={handleNextEpisode}>
                                  <SkipNextIcon/>
                              </IconButton>
                          </Tooltip>
                      )}
                      {isEpisode && (
                          <Tooltip title={t('videoPlayer.episodeList')}>
                              <IconButton color="inherit" onClick={mediaStore.openEpisodesDrawer}>
                                  <ListAltIcon/>
                              </IconButton>
                          </Tooltip>
                      )}
                  </Toolbar>
              </AppBar>
            </Fade>
          )}

        {showSkipIntro && (
            <Fade in={isUiVisible} timeout={500}>
              <Button 
                  variant="contained" 
                  color="inherit" 
                  onClick={skipIntro}
                  sx={{
                      position: 'absolute',
                      bottom: '80px',
                      right: '20px',
                      zIndex: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.8)',
                      color: 'black',
                      '&:hover': { bgcolor: 'white' },
                      transition: 'opacity 0.5s ease-in-out'
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