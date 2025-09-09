import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, TextField, Stack, IconButton, List, ListItem, ListItemText, CircularProgress, Tooltip, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 450 },
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const WatchTogetherModal: React.FC = () => {
  const { watchTogetherModalOpen, closeWatchTogetherModal, createRoom, joinRoom, roomId, isHost, participants, hostId, selectedItem, watchTogetherError } = mediaStore;
  const [inputRoomId, setInputRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInputRoomId('');
    setUsername('');
    closeWatchTogetherModal();
  };
  
  const renderContent = () => {
    if (roomId) {
      return (
        <Stack spacing={2}>
          <Typography variant="h6" component="h2">Sei nella stanza!</Typography>
          <Typography>Condividi questo codice con i tuoi amici:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.1)', p: 1, borderRadius: 1 }}>
            <Typography variant="h5" component="p" sx={{ flexGrow: 1, textAlign: 'center', letterSpacing: '0.2rem', fontFamily: 'monospace' }}>
              {roomId}
            </Typography>
            <Tooltip title={copied ? "Copiato!" : "Copia"}>
              <IconButton onClick={handleCopyToClipboard}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GroupIcon /> Partecipanti ({participants.length})
            </Typography>
            <List dense sx={{ maxHeight: 150, overflow: 'auto', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
              {participants.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText primary={p.name} secondary={p.id === hostId ? 'Host' : ''} />
                </ListItem>
              ))}
            </List>
          </Box>
          {isHost && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => mediaStore.startPlayback(selectedItem!)}
            >
              Inizia a guardare
            </Button>
          )}
          {!isHost && (
             <Box sx={{textAlign: 'center', color: 'text.secondary', p: 2}}>
                <CircularProgress size={20} sx={{mr: 1, verticalAlign: 'middle'}}/>
                <Typography component="span" sx={{verticalAlign: 'middle'}}>In attesa che l'host inizi...</Typography>
             </Box>
          )}
        </Stack>
      );
    } else {
      return (
        <Stack spacing={3}>
           <Typography variant="h6" component="h2">Guarda insieme ai tuoi amici</Typography>
           
           {watchTogetherError && <Alert severity="error">{watchTogetherError}</Alert>}
           
           <TextField
              label="Il tuo nome"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />

           <Button variant="contained" size="large" onClick={() => createRoom(username)} disabled={!username.trim()}>Crea una nuova stanza</Button>
           <Typography sx={{textAlign: 'center'}}>oppure</Typography>
           <Stack direction="row" spacing={1}>
             <TextField
                fullWidth
                label="Inserisci codice stanza"
                variant="outlined"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                inputProps={{ maxLength: 5, style: { textTransform: 'uppercase' } }}
             />
             <Button variant="outlined" onClick={() => joinRoom(inputRoomId, username)} disabled={!inputRoomId.trim() || !username.trim()}>Unisciti</Button>
           </Stack>
        </Stack>
      );
    }
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
        {renderContent()}
      </Box>
    </Modal>
  );
};

export default observer(WatchTogetherModal);