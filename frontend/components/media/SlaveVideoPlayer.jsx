import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {remoteStore} from '../../store/remoteStore.js';
import {
    AppBar,
    Box,
    Button,
    Fade,
    FormControl,
    IconButton,
    Menu,
    MenuItem,
    Select,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import LanguageIcon from '@mui/icons-material/Language';
import EpisodesDrawer from '../library/EpisodesDrawer.jsx';
import VideoControlsContainer from './VideoControlsContainer.jsx';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import {useTranslations} from '../../hooks/useTranslations.js';


const SlaveVideoPlayer = observer(() => {
    // Use remoteStore for slave-specific state
    const { 
        remoteSlaveState,
        sendSlaveStatusUpdate,
        setIntroSkippableOnSlave,
        shouldAutoFullscreen
    } = remoteStore;
    
    // For slave, nowPlayingItem comes from remoteSlaveState
    const nowPlayingItem = remoteSlaveState?.nowPlayingItem || mediaStore.nowPlayingItem;
    
    const {t} = useTranslations();
    const videoRef = useRef(null);
    const playerContainerRef = useRef(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const uiTimeoutRef = useRef(null);
    const lastHostUpdateTimeRef = useRef(0);
    const isSeekingRef = useRef(false);
    const lastProgressBeforeLanguageChangeRef = useRef(null);

    // Detect if we're in portrait mobile (narrow screen and not fullscreen)
    const [isPortraitMobile, setIsPortraitMobile] = useState(false);
    const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
    // Track current video src for filter changes
    const [currentVideoSrc, setCurrentVideoSrc] = useState('');
    useEffect(() => {
        const checkPortrait = () => {
            const isPortrait = window.matchMedia('(orientation: portrait)').matches;
            const isMobile = window.matchMedia('(max-width: 599px)').matches;
            const isFs = !!document.fullscreenElement;
            // Minimal controls in portrait mobile when not fullscreen
            setIsPortraitMobile(isPortrait && isMobile && !isFs);
        };
        checkPortrait();
        const mediaQuery = window.matchMedia('(orientation: portrait)');
        const handleChange = () => checkPortrait();
        mediaQuery.addEventListener('change', handleChange);
        document.addEventListener('fullscreenchange', handleChange);
        window.addEventListener('resize', handleChange);
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            document.removeEventListener('fullscreenchange', handleChange);
            window.removeEventListener('resize', handleChange);
        };
    }, []);

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
            else video.addEventListener('loadedmetadata', handleMetadata, {once: true});
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
                mediaStore.updateEpisodeProgress({episodeId, currentTime: video.currentTime, duration: video.duration});
            }
        };
        const interval = setInterval(saveProgress, 5000); // Save every 5 seconds
        video.addEventListener('pause', saveProgress);
        return () => {
            clearInterval(interval);
            if (video) {
                video.removeEventListener('pause', saveProgress);
                saveProgress();
            }
        };
    }, [nowPlayingItem?.id]);

    // Effect for periodic Smart TV status updates - slave sends status to master
    useEffect(() => {
        if (playerState.isPlaying) {
            const interval = setInterval(() => {
                sendSlaveStatusUpdate();
            }, 1000); // Send update every second
            return () => clearInterval(interval);
        }
    }, [playerState.isPlaying, sendSlaveStatusUpdate]);

    // Effect for "Skip Intro" button visibility
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || !nowPlayingItem || !('intro_start_s' in nowPlayingItem) || !nowPlayingItem.intro_start_s) {
            if (showSkipIntro) setShowSkipIntro(false);
            setIntroSkippableOnSlave(false);
            return;
        }
        const handleTimeUpdate = () => {
            const currentTime = videoElement.currentTime;
            const introStart = nowPlayingItem.intro_start_s ?? -1;
            const introEnd = nowPlayingItem.intro_end_s ?? -1;
            const isSkippable = currentTime >= introStart && currentTime < introEnd;
            if (isSkippable !== showSkipIntro) {
                setShowSkipIntro(isSkippable);
                setIntroSkippableOnSlave(isSkippable);
            }
        };
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        return () => {
            if (videoElement) videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [nowPlayingItem?.id, showSkipIntro, setIntroSkippableOnSlave, nowPlayingItem]);

    // Effect to manage UI visibility
    useEffect(() => {
        const playerContainer = playerContainerRef.current;
        if (!playerContainer) return;
        const showAndThenHideUi = () => {
            setIsUiVisible(true);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            uiTimeoutRef.current = window.setTimeout(() => {
                if (!videoRef.current?.paused) setIsUiVisible(false);
            }, 3000);
        };
        const showUiPermanently = () => {
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            setIsUiVisible(true);
        };
        playerContainer.addEventListener('mousemove', showAndThenHideUi);
        playerContainer.addEventListener('mouseleave', () => {
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            if (!videoRef.current?.paused) setIsUiVisible(false);
        });
        showAndThenHideUi();
        return () => {
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
            playerContainer.removeEventListener('mousemove', showAndThenHideUi);
            playerContainer.removeEventListener('mouseleave', () => {
            });
        };
    }, [playerState.isPlaying]);

    // Effect for auto-fullscreen on slave when playback starts from master
    useEffect(() => {
        if (shouldAutoFullscreen) {
            // Small delay to ensure video is ready
            const timer = setTimeout(async () => {
                try {
                    if (!document.fullscreenElement) {
                        await playerContainerRef.current?.requestFullscreen();
                    }
                } catch (e) {
                    console.error('Auto-fullscreen failed:', e);
                }
                // Reset the trigger
                remoteStore.shouldAutoFullscreen = false;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [shouldAutoFullscreen]);

    const handleTogglePlay = useCallback(() => {
        if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }, []);
    const handleToggleMute = useCallback(() => {
        if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
    }, []);
    const handleToggleFullScreen = useCallback(() => {
        if (!document.fullscreenElement) playerContainerRef.current?.requestFullscreen(); else document.exitFullscreen();
    }, []);


    const handleRewind10 = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        }
    }, []);

    const handleForward10 = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        }
    }, []);

    const handleSkipIntro = useCallback(() => {
        if (videoRef.current && nowPlayingItem) {
            let skipDuration = 0;
            if ('intro_end_s' in nowPlayingItem && nowPlayingItem.intro_end_s && nowPlayingItem.intro_end_s > nowPlayingItem.intro_start_s) {
                skipDuration = nowPlayingItem.intro_end_s - videoRef.current.currentTime;
            } else {
                const showId = 'show_id' in nowPlayingItem ? nowPlayingItem.show_id : nowPlayingItem.id;
                skipDuration = mediaStore.showIntroDurations.get(showId) || 80;
            }
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + skipDuration);
        }
    }, [nowPlayingItem]);

    // Effect for Keyboard Shortcuts - slave can control playback locally
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const video = videoRef.current;
            if (!video) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    handleTogglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    handleToggleFullScreen();
                    break;
                case 'm':
                    e.preventDefault();
                    handleToggleMute();
                    break;
                case 'arrowright':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 5);
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    break;
                case 'j':
                    e.preventDefault();
                    handleRewind10();
                    break;
                case 'l':
                    e.preventDefault();
                    handleForward10();
                    break;
                case 'n':
                    e.preventDefault();
                    handleSkipIntro();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [playerState.playbackRate, handleTogglePlay, handleToggleFullScreen, handleToggleMute, handleRewind10, handleForward10, handleSkipIntro]);

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

    const handleSeek = (event, newValue) => {
        if (videoRef.current) {
            const newTime = (newValue / 100) * playerState.duration;
            videoRef.current.currentTime = newTime;
        }
    };
    const handleVolumeChange = (event, newValue) => {
        if (videoRef.current) videoRef.current.volume = newValue;
    };

    const isEpisode = 'episode_number' in nowPlayingItem;
    const currentShowId = isEpisode && 'show_id' in nowPlayingItem ? nowPlayingItem.show_id : null;
    let videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    let title;

    if (isEpisode) {
        videoSrc = nowPlayingItem.video_url || videoSrc;
        const S = String(nowPlayingItem.season_number).padStart(2, '0');
        const E = String(nowPlayingItem.episode_number).padStart(2, '0');
        title = `${nowPlayingItem.show_title} - S${S}E${E}: ${nowPlayingItem.name}`;
    } else {
        videoSrc = nowPlayingItem.video_url || videoSrc;
        title = nowPlayingItem.title || nowPlayingItem.name || 'Video';
    }

    // Extract initial language/type from the current video_url if not already in preferences
    const videoUrls = nowPlayingItem.video_urls || [];
    const currentVideoUrl = videoSrc && videoSrc !== "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" ? videoSrc : null;
    if (currentVideoUrl && currentShowId && !mediaStore.showFilterPreferences.get(currentShowId)) {
        const currentLink = videoUrls.find(l => l.url === currentVideoUrl);
        if (currentLink) {
            mediaStore.setShowFilterPreference(currentShowId, {
                language: currentLink.language,
                type: currentLink.type
            });
        }
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
            const showId = mediaStore.currentShow.id;
            // Get current language/type preferences to apply to next episode
            const prefs = mediaStore.showFilterPreferences.get(showId) || {};
            
            // Filter the video URLs based on preferences
            const allUrls = nextEp.video_urls || [];
            const filteredUrls = allUrls.filter(link => {
                const langMatch = !prefs.language || link.language.toUpperCase() === prefs.language.toUpperCase();
                const typeMatch = !prefs.type || link.type === prefs.type;
                return langMatch && typeMatch;
            });
            
            // Get the video_url from filtered results, or first available
            const videoUrl = filteredUrls[0]?.url || allUrls[0]?.url;
            
            mediaStore.startPlayback({
                ...nextEp,
                show_id: showId,
                show_title: mediaStore.currentShow.title || mediaStore.currentShow.name || '',
                backdrop_path: mediaStore.currentShow.backdrop_path,
                season_number: nowPlayingItem.season_number,
                video_url: videoUrl,
            });
        }
    };

    const skipIntro = () => {
        if (videoRef.current && 'intro_end_s' in nowPlayingItem && nowPlayingItem.intro_end_s) {
            videoRef.current.currentTime = nowPlayingItem.intro_end_s;
            setShowSkipIntro(false);
        }
    };

    // Extract available languages and types from video_urls (videoUrls already declared at line 456)
    const availableLanguages = useMemo(() => {
        const langs = new Set();
        videoUrls.forEach(link => langs.add(link.language));
        return Array.from(langs);
    }, [videoUrls]);

    const availableTypes = useMemo(() => {
        const types = new Set();
        videoUrls.forEach(link => types.add(link.type));
        return Array.from(types);
    }, [videoUrls]);

    const hasMultipleLanguages = availableLanguages.length > 1;
    const hasMultipleTypes = availableTypes.length > 1;
    // Show pickers when there are multiple video URLs (multiple languages OR multiple types)
    const showLanguagePickers = videoUrls.length > 1;
    // Get current selection from showFilterPreferences
    const currentPrefs = currentShowId ? mediaStore.showFilterPreferences.get(currentShowId) || {} : {};
    const selectedLanguage = currentPrefs.language || '';
    const selectedType = currentPrefs.type || '';

    const handleLanguageChange = (lang) => {
        if (currentShowId) {
            const newType = lang ? selectedType : null;
            const updates = {language: lang};
            if (newType && (newType === 'sub' || newType === 'dub')) {
                updates.type = newType;
            }
            mediaStore.setShowFilterPreference(currentShowId, updates);
            reloadVideoWithFilters(lang, newType || '');
        }
    };

    const handleTypeChange = (type) => {
        if (currentShowId) {
            mediaStore.setShowFilterPreference(currentShowId, {type});
            reloadVideoWithFilters(selectedLanguage, type);
        }
    };

    const reloadVideoWithFilters = (lang, type) => {
        const filteredLinks = videoUrls.filter(link => {
            const langMatch = !lang || link.language.toUpperCase() === lang.toUpperCase();
            const typeMatch = !type || link.type === type;
            return langMatch && typeMatch;
        });
        if (filteredLinks.length > 0 && videoRef.current) {
            const newVideoSrc = filteredLinks[0].url;
            // Use currentVideoSrc to track changes across multiple filter updates
            if (newVideoSrc !== currentVideoSrc) {
                // Save current progress before changing src
                const currentTime = videoRef.current.currentTime;
                lastProgressBeforeLanguageChangeRef.current = currentTime;
                
                setCurrentVideoSrc(newVideoSrc);
                videoRef.current.src = newVideoSrc;
                
                // Restore progress after new video loads metadata
                const video = videoRef.current;
                const restoreProgress = () => {
                    if (lastProgressBeforeLanguageChangeRef.current !== null && video.readyState >= 1) {
                        video.currentTime = lastProgressBeforeLanguageChangeRef.current;
                        lastProgressBeforeLanguageChangeRef.current = null;
                    }
                };
                
                if (video.readyState >= 1) {
                    restoreProgress();
                } else {
                    video.addEventListener('loadedmetadata', restoreProgress, { once: true });
                }
                
                videoRef.current.play().catch(console.error);
            }
        }
    };

    // Effect to sync initial video src
    useEffect(() => {
        if (videoSrc && videoSrc !== currentVideoSrc) {
            setCurrentVideoSrc(videoSrc);
        }
    }, [videoSrc]);

    // Mobile language menu handlers
    const handleOpenLanguageMenu = (event) => {
        setLanguageMenuAnchor(event.currentTarget);
    };

    const handleCloseLanguageMenu = () => {
        setLanguageMenuAnchor(null);
    };

    return (
        <Box ref={playerContainerRef} sx={{
            position: 'relative',
            width: '100vw',
            height: '100dvh',
            bgcolor: 'black',
            display: 'flex',
            flexDirection: 'row',
            cursor: isUiVisible ? 'default' : 'none'
        }}>
            <Box sx={{flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <video
                    ref={videoRef}
                    src={videoSrc}
                    autoPlay
                    onClick={handleTogglePlay}
                    style={{width: '100%', height: '100%', objectFit: 'contain'}}
                />
                {/* FIX: (line 358) Wrap Box with Fade component */}
                <Fade in={isUiVisible} timeout={500}>
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.7) 100%)',
                        pointerEvents: 'none'
                    }}>

                        {/* Top Bar */}
                        <AppBar position="static" sx={{
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            pointerEvents: 'auto',
                            paddingTop: 'env(safe-area-inset-top)'
                        }}>
                            <Toolbar>
                                <IconButton edge="start" color="inherit" aria-label={t('videoPlayer.back')}
                                            onClick={mediaStore.stopPlayback}><ArrowBackIcon/></IconButton>
                                <Typography variant="h6" sx={{flexGrow: 1}} noWrap>{title}</Typography>
                                {/* Language/Subtitle pickers - only show when multiple options available */}
                                {showLanguagePickers && (
                                    isPortraitMobile ? (
                                        // Mobile: IconButton with Popover
                                        <>
                                            <IconButton color="inherit" onClick={handleOpenLanguageMenu}>
                                                <LanguageIcon />
                                            </IconButton>
                                            <Menu
                                                anchorEl={languageMenuAnchor}
                                                open={Boolean(languageMenuAnchor)}
                                                onClose={handleCloseLanguageMenu}
                                                slotProps={{
                                                    paper: {
                                                        sx: {
                                                            bgcolor: 'rgba(30, 30, 30, 0.95)',
                                                            minWidth: 120
                                                        }
                                                    }
                                                }}
                                            >
                                                {hasMultipleLanguages && (
                                                    <>
                                                        <MenuItem disabled sx={{ opacity: 0.7, fontSize: '0.75rem' }}>
                                                            Lingua
                                                        </MenuItem>
                                                        {availableLanguages.map(lang => (
                                                            <MenuItem 
                                                                key={lang} 
                                                                value={lang} 
                                                                onClick={() => { handleLanguageChange(lang); handleCloseLanguageMenu(); }}
                                                                sx={{
                                                                    py: 0.75,
                                                                    px: 2,
                                                                    opacity: 0.7,
                                                                    fontSize: '0.875rem',
                                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                    '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' }
                                                                }}
                                                            >
                                                                {selectedLanguage === lang && '✓ '}{lang}
                                                            </MenuItem>
                                                        ))}
                                                    </>
                                                )}
                                                {hasMultipleLanguages && hasMultipleTypes && <Box sx={{ borderTop: 1, borderColor: 'divider', my: 0.5 }} />}
                                                {hasMultipleTypes && (
                                                    <>
                                                        <MenuItem disabled sx={{ opacity: 0.7, fontSize: '0.75rem' }}>
                                                            Tipo
                                                        </MenuItem>
                                                        {availableTypes.map(type => (
                                                            <MenuItem 
                                                                key={type} 
                                                                value={type} 
                                                                onClick={() => { handleTypeChange(type); handleCloseLanguageMenu(); }}
                                                                sx={{
                                                                    py: 0.75,
                                                                    px: 2,
                                                                    opacity: 0.7,
                                                                    fontSize: '0.875rem',
                                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                    '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' }
                                                                }}
                                                            >
                                                                {selectedType === type && '✓ '}{type === 'dub' ? 'Doppiaggio' : 'Sottotitoli'}
                                                            </MenuItem>
                                                        ))}
                                                    </>
                                                )}
                                            </Menu>
                                        </>
                                    ) : (
                                        // Desktop: Select dropdowns
                                        <Box sx={{display: 'flex', gap: 1, mr: 1}}>
                                            {hasMultipleLanguages && (
                                                <FormControl size="small" sx={{minWidth: 80}}>
                                                    <Select
                                                        value={selectedLanguage}
                                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                                        sx={{
                                                            color: 'white',
                                                            bgcolor: 'rgba(0,0,0,0.5)',
                                                            borderRadius: 4,
                                                            '& .MuiOutlinedInput-notchedOutline': {border: 'none'},
                                                            '& .MuiSelect-icon': {color: 'white'},
                                                            '& .MuiSelect-select': {py: 0.5, px: 1}
                                                        }}
                                                        slotProps={{
                                                            paper: {
                                                                sx: {
                                                                    bgcolor: 'rgba(30, 30, 30, 0.95)',
                                                                    color: 'white',
                                                                    minWidth: 120
                                                                }
                                                            },
                                                            list: {
                                                                sx: {
                                                                    py: 0.5
                                                                }
                                                            }
                                                        }}
                                                        renderValue={(val) => (
                                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                                                                <VolumeUpIcon sx={{fontSize: 18}} />
                                                                <Typography variant="caption">{val || 'Lingua'}</Typography>
                                                            </Box>
                                                        )}
                                                    >
                                                        {availableLanguages.map(lang => (
                                                            <MenuItem 
                                                                key={lang} 
                                                                value={lang}
                                                                sx={{
                                                                    py: 0.75,
                                                                    px: 2,
                                                                    opacity: 0.7,
                                                                    fontSize: '0.875rem',
                                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                    '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' }
                                                                }}
                                                            >
                                                                {selectedLanguage === lang && '✓ '}{lang}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                            {hasMultipleTypes && (
                                                <FormControl size="small" sx={{minWidth: 70}}>
                                                    <Select
                                                        value={selectedType}
                                                        onChange={(e) => handleTypeChange(e.target.value)}
                                                        sx={{
                                                            color: 'white',
                                                            bgcolor: 'rgba(0,0,0,0.5)',
                                                            borderRadius: 4,
                                                            '& .MuiOutlinedInput-notchedOutline': {border: 'none'},
                                                            '& .MuiSelect-icon': {color: 'white'},
                                                            '& .MuiSelect-select': {py: 0.5, px: 1}
                                                        }}
                                                        slotProps={{
                                                            paper: {
                                                                sx: {
                                                                    bgcolor: 'rgba(30, 30, 30, 0.95)',
                                                                    color: 'white',
                                                                    minWidth: 120
                                                                }
                                                            },
                                                            list: {
                                                                sx: {
                                                                    py: 0.5
                                                                }
                                                            }
                                                        }}
                                                        renderValue={(val) => (
                                                            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                                                                <ClosedCaptionIcon sx={{fontSize: 18}} />
                                                                <Typography variant="caption">{val || 'Sub'}</Typography>
                                                            </Box>
                                                        )}
                                                    >
                                                        {availableTypes.map(type => (
                                                            <MenuItem 
                                                                key={type} 
                                                                value={type}
                                                                sx={{
                                                                    py: 0.75,
                                                                    px: 2,
                                                                    opacity: 0.7,
                                                                    fontSize: '0.875rem',
                                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                                                    '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' }
                                                                }}
                                                            >
                                                                {selectedType === type && '✓ '}{type === 'dub' ? 'Doppiaggio' : 'Sottotitoli'}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        </Box>
                                    )
                                )}
                                {/* Buttons - positioned after language pickers */}
                                {mediaStore.nextEpisode &&
                                    <Tooltip title={t('videoPlayer.nextEpisode')}><IconButton color="inherit"
                                                                                              onClick={handleNextEpisode}
                                                                                              ><SkipNextIcon/></IconButton></Tooltip>}
                                {isEpisode && <Tooltip title={t('videoPlayer.episodeList')}><IconButton color="inherit"
                                                                                                        onClick={mediaStore.openEpisodesDrawer}
                                                                                                        ><ListAltIcon/></IconButton></Tooltip>}
                            </Toolbar>
                        </AppBar>

                        {/* Slave (Smart TV) Bottom Controls - always visible, no fade */}
                        <Box sx={{
                            px: 2,
                            pt: 2,
                            pb: 'calc(1rem + env(safe-area-inset-bottom))',
                            pointerEvents: 'auto'
                        }}>
                            <VideoControlsContainer
                                playerState={playerState}
                                handleSeek={handleSeek}
                                videoRef={videoRef}
                                handleRewind10={handleRewind10}
                                handleTogglePlay={handleTogglePlay}
                                handleForward10={handleForward10}
                                handleSkipIntro={handleSkipIntro}
                                handleVolumeChange={handleVolumeChange}
                                handleDownload={handleDownload}
                                handleToggleFullScreen={handleToggleFullScreen}
                            />
                        </Box>

                        {/* Slave (Smart TV) Overlay: Play/Pause button only - fullscreen is in bottom bar */}
                        <Fade in={isUiVisible} timeout={500}>
                            <Box sx={{
                                position: 'absolute',
                                inset: 0,
                                width: "100%",
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none'
                            }}>

                                <Box sx={{
                                    width: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto'
                                }}>
                                    <IconButton onClick={handleRewind10} color="inherit"
                                                sx={{
                                                    bgcolor: 'rgba(0,0,0,0.6)',
                                                    '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'},
                                                    width: 80,
                                                    height: 80
                                                }}>
                                        <Replay10Icon fontSize="large"/>
                                    </IconButton>
                                </Box>
                                <Box sx={{
                                    width: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto'
                                }}>
                                    <IconButton onClick={handleTogglePlay} sx={{
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'},
                                        width: 80,
                                        height: 80
                                    }}>
                                        {playerState.isPlaying ? <PauseIcon sx={{fontSize: 48, color: 'white'}}/> :
                                            <PlayArrowIcon sx={{fontSize: 48, color: 'white'}}/>}
                                    </IconButton>
                                </Box>
                                <Box sx={{
                                    width: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto'
                                }}>
                                    <IconButton onClick={handleForward10} color="inherit"
                                                sx={{
                                                    bgcolor: 'rgba(0,0,0,0.6)',
                                                    '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'},
                                                    width: 80,
                                                    height: 80
                                                }}>
                                        <Forward10Icon fontSize="large"/>
                                    </IconButton>
                                </Box>
                                <Box sx={{
                                    width: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto'
                                }}>
                                    <IconButton onClick={handleSkipIntro} color="inherit"
                                                sx={{
                                                    bgcolor: 'rgba(0,0,0,0.6)',
                                                    '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'},

                                                    width: 80,
                                                    height: 80
                                                }}>
                                        <SkipNextIcon fontSize="large"/>
                                    </IconButton>
                                </Box>
                                <Box sx={{
                                    width: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto'
                                }}>
                                    <IconButton onClick={handleToggleFullScreen} sx={{
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'},
                                        width: 80,
                                        height: 80
                                    }}>
                                        {playerState.isFullScreen ?
                                            <FullscreenExitIcon sx={{fontSize: 48, color: 'white'}}/> :
                                            <FullscreenIcon sx={{fontSize: 48, color: 'white'}}/>}
                                    </IconButton>
                                </Box>

                            </Box>
                        </Fade>
                    </Box>
                </Fade>

                {showSkipIntro && (
                    // FIX: (line 453) Wrap Button with Fade component
                    <Fade in={showSkipIntro && isUiVisible} timeout={500}>
                        <Button
                            variant="contained"
                            onClick={skipIntro}
                            sx={{
                                position: 'absolute',
                                bottom: {xs: '80px', md: '100px'},
                                right: '20px',
                                zIndex: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.8)', color: 'black',
                                '&:hover': {bgcolor: 'white'},
                            }}
                        >
                            {t('videoPlayer.skipIntro')}
                        </Button>
                    </Fade>
                )}
            </Box>
            {isEpisode && <EpisodesDrawer/>}
        </Box>
    );
});

export default SlaveVideoPlayer;
