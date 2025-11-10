import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a a default one.
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, TextField, Stack, IconButton, List, ListItem, ListItemText, CircularProgress, Tooltip, Alert, FormControl, InputLabel, Select, MenuItem, ListItemButton, Card, CardMedia } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Episode, MediaItem, PlayableItem } from '../types';
import { searchShow } from '../services/apiCall';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslations } from '../hooks/useTranslations';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 600 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: {xs: 2, sm: 4},
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const WatchTogetherModal: React.FC = observer(() => {
  const { 
      watchTogetherModalOpen, closeWatchTogetherModal, createRoom, joinRoom, roomId, 
      isHost, participants, hostId, selectedItem, watchTogetherError, isDetailLoading, 
      changeWatchTogetherMedia, joinRoomIdFromUrl, setJoinRoomIdFromUrl, changeRoomCode,
      watchTogetherSelectedItem
  } = mediaStore;
  // In the modal, the source of truth for the content can either be the globally selected item (when creating a room)
  // or the specific item for the watch together session (when joining or after the room is created).
  const itemForModal = roomId ? watchTogetherSelectedItem : selectedItem;
  const { t } = useTranslations();
  
  const [inputRoomId, setInputRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  // FIX: Add type guard to safely access 'seasons' property.
  const [selectedSeason, setSelectedSeason] = useState((itemForModal && 'seasons' in itemForModal && itemForModal.seasons?.[0]?.season_number) || 1);
  const [isChangingContent, setIsChangingContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (joinRoomIdFromUrl) {
      setInputRoomId(joinRoomIdFromUrl);
    }
  }, [joinRoomIdFromUrl]);
  
  useEffect(() => {
      // FIX: Add a type guard to ensure 'seasons' exists on itemForModal before accessing it.
      if (itemForModal && 'seasons' in itemForModal && itemForModal.seasons && itemForModal.seasons.length > 0) {
          const seasonExists = itemForModal.seasons.some(s => s.season_number === selectedSeason);
          if (!seasonExists) {
              setSelectedSeason(itemForModal.seasons[0].season_number);
          }
      } else if (itemForModal) {
          setSelectedSeason(1);
      }
  // FIX: The dependency should be on the item's ID to reset season when content changes.
  }, [itemForModal?.id]);
  
  useEffect(() => {
    const searchDebounce = setTimeout(async () => {
        if (searchQuery.trim()) {
            setIsSearching(true);
            const results = await searchShow(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        } else {
            setSearchResults([]);
        }
    }, 500);
    return () => clearTimeout(searchDebounce);
  }, [searchQuery]);

  const handleCopyToClipboard = () => {
    if (roomId) {
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const baseUrl = isLocalhost ? `${window.location.origin}${window.location.pathname}` : 'https://q.tnl.one/';
      const joinUrl = `${baseUrl}?roomId=${roomId}`;
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInputRoomId('');
    setUsername('');
    if (joinRoomIdFromUrl) {
        setJoinRoomIdFromUrl(null);
    }
    setIsChangingContent(false);
    setSearchQuery('');
    setSearchResults([]);
    closeWatchTogetherModal();
  };

  const handleSelectEpisode = (episode: Episode) => {
    // FIX: Add a type guard to ensure itemForModal is a MediaItem before accessing its properties.
    if (!itemForModal || !('seasons' in itemForModal) || !currentSeason) return;
    const itemToPlay: PlayableItem = {
      ...episode,
      show_id: itemForModal.id,
      show_title: itemForModal.title || itemForModal.name || '',
      backdrop_path: itemForModal.backdrop_path,
      season_number: currentSeason.season_number,
    };
    changeWatchTogetherMedia(itemToPlay);
  };
  
  const handleSelectNewContent = (item: MediaItem) => {
      changeWatchTogetherMedia(item);
      setIsChangingContent(false);
      setSearchQuery('');
      setSearchResults([]);
  }

  // FIX: Add a type guard to safely access the 'seasons' property.
  const currentSeason = (itemForModal && 'seasons' in itemForModal && itemForModal.seasons)
    ? itemForModal.seasons.find(s => s.season_number === selectedSeason)
    : undefined;

  const renderInitialView = () => {
    // FIX: Add a type guard to safely access the 'media_type' property.
    const isTvShow = itemForModal && 'media_type' in itemForModal && itemForModal.media_type === 'tv';
    const isJoiningViaLink = !!joinRoomIdFromUrl;
    
    // The staged item for playback can be a movie or an episode.
    const isEpisodeSelected = watchTogetherSelectedItem && 'episode_number' in watchTogetherSelectedItem;
    // Safely check for 'media_type' property before accessing it, as PlayableItem is a union type
    // and one of its types (Episode) does not have this property.
    const isMovieSelected = watchTogetherSelectedItem && 'media_type' in watchTogetherSelectedItem && watchTogetherSelectedItem.media_type === 'movie';

    // Enable the create button only when a username is entered and a valid media item is selected.
    const canCreateRoom = !!username.trim() && (isMovieSelected || isEpisodeSelected);

    return (
     <Stack spacing={3}>
       <Typography variant="h6" component="h2">
         {isJoiningViaLink ? t('watchTogether.joinRoomTitle') : t('watchTogether.createRoomTitle')}
       </Typography>
       
       {watchTogetherError && <Alert severity="error">{watchTogetherError}</Alert>}
       
       <TextField
          label={t('watchTogether.yourName')}
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          autoFocus
        />
        
        {!isJoiningViaLink && (
            <>
                {isTvShow && itemForModal && (
                    <React.Fragment>
                        <Typography variant="subtitle1" fontWeight="bold">{t('watchTogether.selectEpisode')}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">{t('watchTogether.episodes')}</Typography>
                            {itemForModal.seasons && itemForModal.seasons.length > 1 && (
                                <FormControl size="small" sx={{minWidth: 150}}>
                                    {/* FIX: (line 173) Pass label text as children to InputLabel */}
                                    <InputLabel>{t('watchTogether.season')}</InputLabel>
                                    <Select value={selectedSeason} label={t('watchTogether.season')} onChange={e => setSelectedSeason(Number(e.target.value))}>
                                        {itemForModal.seasons.map(s => <MenuItem key={s.id} value={s.season_number}>{s.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                        <List dense sx={{ overflowY: 'auto', maxHeight: '30vh', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, p: 1 }}>
                            {isDetailLoading ? (
                                <Box sx={{display: 'flex', justifyContent: 'center', p: 2}}><CircularProgress size={24}/></Box>
                            ) : (
                                currentSeason?.episodes.map(ep => (
                                    <ListItemButton 
                                        key={ep.id} 
                                        selected={isEpisodeSelected && watchTogetherSelectedItem.id === ep.id} 
                                        onClick={() => handleSelectEpisode(ep)}
                                        disabled={!ep.video_url}
                                    >
                                        <ListItemText primary={`${ep.episode_number}. ${ep.name}`} />
                                    </ListItemButton>
                                ))
                            )}
                        </List>
                    </React.Fragment>
                )}

               <Button variant="contained" size="large" onClick={() => createRoom(username)} disabled={!canCreateRoom}>{t('watchTogether.createRoom')}</Button>
               <Typography sx={{textAlign: 'center'}}>{t('watchTogether.or')}</Typography>
           </>
        )}

       <Stack direction="row" spacing={1}>
         <TextField
            fullWidth
            label={t('watchTogether.roomCodePlaceholder')}
            variant="outlined"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 6, style: { textTransform: 'uppercase' } }}
            disabled={isJoiningViaLink}
         />
         <Button variant="outlined" onClick={() => joinRoom(inputRoomId, username)} disabled={!inputRoomId.trim() || !username.trim()}>{t('watchTogether.join')}</Button>
       </Stack>
    </Stack>
    );
  };
  
  const renderChangeContentView = () => (
      <Stack spacing={2}>
          <Typography variant="h6">{t('watchTogether.changeContentTitle')}</Typography>
          <TextField 
            label={t('watchTogether.searchPlaceholder')}
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            InputProps={{
                endAdornment: isSearching ? <CircularProgress size={20} /> : <SearchIcon />
            }}
          />
          <List sx={{ overflowY: 'auto', maxHeight: '40vh' }}>
              {searchResults.map(item => (
                  <ListItemButton key={item.id} onClick={() => handleSelectNewContent(item)}>
                      <CardMedia component="img" image={item.poster_path} sx={{ width: 50, height: 75, mr: 2, borderRadius: 1 }} />
                      <ListItemText primary={item.title || item.name} secondary={item.first_air_date?.substring(0,4) || item.release_date?.substring(0,4)} />
                  </ListItemButton>
              ))}
          </List>
          <Button onClick={() => setIsChangingContent(false)}>{t('watchTogether.cancel')}</Button>
      </Stack>
  );

  const renderRoomView = () => {
    if (!itemForModal) {
        return <Box sx={{textAlign: 'center', p: 4}}><CircularProgress /><Typography sx={{mt:2}}>Sincronizzazione contenuti...</Typography></Box>
    }
    
    // FIX: Safely determine the title for the room based on the item type (Movie/Show vs Episode).
    let roomTitle = '';
    if (itemForModal) {
      // By checking for 'episode_number', we can reliably distinguish Episodes from MediaItems within the PlayableItem union type.
      if ('episode_number' in itemForModal) {
        // This is an Episode with show context from PlayableItem.
        roomTitle = itemForModal.show_title;
        // FIX: Added 'else if' to create a stronger type guard, resolving an error where '.title' might be accessed on an Episode type.
      } else if ('title' in itemForModal) {
        // If it's not an episode, it's a MediaItem.
        roomTitle = itemForModal.title || itemForModal.name || '';
      }
    }

    if (isChangingContent && isHost) {
        return renderChangeContentView();
    }
    
    return (
        <Stack spacing={2} sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="h6" component="h2" noWrap>{t('watchTogether.roomTitle', { title: roomTitle })}</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 1 }}>
            <Typography variant="h5" component="p" sx={{ flexGrow: 1, textAlign: 'center', letterSpacing: '0.2rem', fontFamily: 'monospace' }}>
              {roomId}
            </Typography>
            {isHost && (
                // FIX: (line 277) Wrap IconButton with Tooltip component
                <Tooltip title={t('watchTogether.changeCode')}>
                    <IconButton onClick={changeRoomCode}><RefreshIcon /></IconButton>
                </Tooltip>
            )}
            {/* FIX: (line 281) Wrap IconButton with Tooltip component */}
            <Tooltip title={copied ? t('watchTogether.copied') : t('watchTogether.copyLink')}>
              <IconButton onClick={handleCopyToClipboard}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* Episode List for Host */}
          {/* FIX: Add a type guard to safely access the 'media_type' property. */}
          {isHost && 'media_type' in itemForModal && itemForModal.media_type === 'tv' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="bold">{t('watchTogether.episodes')}</Typography>
                    {itemForModal.seasons && itemForModal.seasons.length > 1 && (
                        <FormControl size="small" sx={{minWidth: 150}}>
                            {/* FIX: (line 296) Pass label text as children to InputLabel */}
                            <InputLabel>{t('watchTogether.season')}</InputLabel>
                            <Select value={selectedSeason} label={t('watchTogether.season')} onChange={e => setSelectedSeason(Number(e.target.value))}>
                                {itemForModal.seasons.map(s => <MenuItem key={s.id} value={s.season_number}>{s.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}
                </Box>
                <List dense sx={{ overflowY: 'auto', flex: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, p: 1 }}>
                  {isDetailLoading ? <CircularProgress sx={{display: 'block', margin: 'auto'}}/> : currentSeason?.episodes.map(ep => (
                    <ListItemButton key={ep.id} selected={watchTogetherSelectedItem && 'episode_number' in watchTogetherSelectedItem && watchTogetherSelectedItem.id === ep.id} onClick={() => handleSelectEpisode(ep)}>
                      <ListItemText primary={`${ep.episode_number}. ${ep.name}`} />
                    </ListItemButton>
                  ))}
                </List>
              </>
          )}

          <Box>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GroupIcon /> {t('watchTogether.participants', { count: participants.length })}
            </Typography>
            <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
              {participants.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText primary={p.name} secondary={p.id === hostId ? t('watchTogether.host') : ''} />
                </ListItem>
              ))}
            </List>
          </Box>
          {isHost && watchTogetherSelectedItem && (
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" fullWidth onClick={() => setIsChangingContent(true)}>{t('watchTogether.changeContent')}</Button>
              <Button variant="contained" fullWidth color="primary" onClick={() => mediaStore.startPlayback(watchTogetherSelectedItem)}>
                {t('watchTogether.startForAll')}
              </Button>
            </Stack>
          )}
          {!isHost && (
             <Box sx={{textAlign: 'center', color: 'text.secondary', p: 2}}>
                <CircularProgress size={20} sx={{mr: 1, verticalAlign: 'middle'}}/>
                <Typography component="span" sx={{verticalAlign: 'middle'}}>{t('watchTogether.waitingForHost')}</Typography>
             </Box>
          )}
        </Stack>
    );
  };

  return (
    // FIX: (line 344) Wrap Box with Modal component
    <Modal
      open={watchTogetherModalOpen}
      onClose={handleClose}
      aria-labelledby="watch-together-modal-title"
    >
      <Box sx={style}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
        {roomId ? renderRoomView() : renderInitialView()}
      </Box>
    </Modal>
  );
});

export default WatchTogetherModal;