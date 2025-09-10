import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, TextField, Stack, IconButton, List, ListItem, ListItemText, CircularProgress, Tooltip, Alert, FormControl, InputLabel, Select, MenuItem, ListItemButton, Card, CardMedia } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Episode, MediaItem, PlayableItem } from '../types';
import { searchShow } from '../services/apiCall';
import SearchIcon from '@mui/icons-material/Search';

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

const WatchTogetherModal: React.FC = () => {
  const { 
      watchTogetherModalOpen, closeWatchTogetherModal, createRoom, joinRoom, roomId, 
      isHost, participants, hostId, selectedItem, watchTogetherError, isDetailLoading, 
      changeWatchTogetherMedia, joinRoomIdFromUrl, setJoinRoomIdFromUrl, changeRoomCode,
      watchTogetherSelectedItem
  } = mediaStore;
  
  const [inputRoomId, setInputRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(selectedItem?.seasons?.[0]?.season_number ?? 1);
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
      if (selectedItem?.seasons && selectedItem.seasons.length > 0) {
          const seasonExists = selectedItem.seasons.some(s => s.season_number === selectedSeason);
          if (!seasonExists) {
              setSelectedSeason(selectedItem.seasons[0].season_number);
          }
      } else if (selectedItem) {
          setSelectedSeason(1);
      }
  }, [selectedItem?.id, selectedItem?.seasons]);
  
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
      const inviteLink = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;
      navigator.clipboard.writeText(inviteLink);
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
    if (!selectedItem || !currentSeason) return;
    const itemToPlay: PlayableItem = {
      ...episode,
      show_id: selectedItem.id,
      show_title: selectedItem.title || selectedItem.name || '',
      backdrop_path: selectedItem.backdrop_path,
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

  const currentSeason = selectedItem?.seasons?.find(s => s.season_number === selectedSeason);

  const renderInitialView = () => (
     <Stack spacing={3}>
       <Typography variant="h6" component="h2">Guarda insieme ai tuoi amici</Typography>
       
       {watchTogetherError && <Alert severity="error">{watchTogetherError}</Alert>}
       
       <TextField
          label="Il tuo nome"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          autoFocus
        />

       <Button variant="contained" size="large" onClick={() => createRoom(username)} disabled={!username.trim() || !watchTogetherSelectedItem}>Crea una nuova stanza</Button>
       <Typography sx={{textAlign: 'center'}}>oppure</Typography>
       <Stack direction="row" spacing={1}>
         <TextField
            fullWidth
            label="Inserisci codice stanza"
            variant="outlined"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 6, style: { textTransform: 'uppercase' } }}
         />
         <Button variant="outlined" onClick={() => joinRoom(inputRoomId, username)} disabled={!inputRoomId.trim() || !username.trim()}>Unisciti</Button>
       </Stack>
    </Stack>
  );
  
  const renderChangeContentView = () => (
      <Stack spacing={2}>
          <Typography variant="h6">Cambia Contenuto</Typography>
          <TextField 
            label="Cerca film o serie tv"
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
          <Button onClick={() => setIsChangingContent(false)}>Annulla</Button>
      </Stack>
  );

  const renderRoomView = () => {
    if (!selectedItem || !watchTogetherSelectedItem) {
        return <Box sx={{textAlign: 'center', p: 4}}><CircularProgress /><Typography sx={{mt:2}}>Sincronizzazione contenuti...</Typography></Box>
    }
    
    if (isChangingContent && isHost) {
        return renderChangeContentView();
    }
    
    return (
        <Stack spacing={2} sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="h6" component="h2" noWrap>Stanza: {selectedItem.title || selectedItem.name}</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 1 }}>
            <Typography variant="h5" component="p" sx={{ flexGrow: 1, textAlign: 'center', letterSpacing: '0.2rem', fontFamily: 'monospace' }}>
              {roomId}
            </Typography>
            {isHost && (
                <Tooltip title="Cambia Codice">
                    <IconButton onClick={changeRoomCode}><RefreshIcon /></IconButton>
                </Tooltip>
            )}
            <Tooltip title={copied ? "Copiato!" : "Copia Link Invito"}>
              <IconButton onClick={handleCopyToClipboard}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* Episode List for Host */}
          {isHost && selectedItem.media_type === 'tv' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="bold">Episodi</Typography>
                    {selectedItem.seasons && selectedItem.seasons.length > 1 && (
                        <FormControl size="small" sx={{minWidth: 150}}>
                            <InputLabel>Stagione</InputLabel>
                            <Select value={selectedSeason} label="Stagione" onChange={e => setSelectedSeason(Number(e.target.value))}>
                                {selectedItem.seasons.map(s => <MenuItem key={s.id} value={s.season_number}>{s.name}</MenuItem>)}
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
              <GroupIcon /> Partecipanti ({participants.length})
            </Typography>
            <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
              {participants.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText primary={p.name} secondary={p.id === hostId ? 'Host' : ''} />
                </ListItem>
              ))}
            </List>
          </Box>
          {isHost && (
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" fullWidth onClick={() => setIsChangingContent(true)}>Cambia Contenuto</Button>
              <Button variant="contained" fullWidth color="primary" onClick={() => mediaStore.startPlayback(watchTogetherSelectedItem)}>
                Inizia per tutti
              </Button>
            </Stack>
          )}
          {!isHost && (
             <Box sx={{textAlign: 'center', color: 'text.secondary', p: 2}}>
                <CircularProgress size={20} sx={{mr: 1, verticalAlign: 'middle'}}/>
                <Typography component="span" sx={{verticalAlign: 'middle'}}>In attesa che l'host inizi...</Typography>
             </Box>
          )}
        </Stack>
    );
  };

  return (
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
};

export default observer(WatchTogetherModal);