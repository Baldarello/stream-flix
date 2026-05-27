import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import {useTranslations} from '../../hooks/useTranslations.js';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB max

const compressImage = (base64, maxWidth = 800) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const Chat = observer(() => {
  const { chatHistory, sendChatMessage, participants, hostId, isHost, myClientId, transferHost, changeName } = mediaStore;
  const { t } = useTranslations();
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Host transfer confirmation modal state
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferTargetParticipant, setTransferTargetParticipant] = useState(null);

  // Name edit dialog state
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameEditTargetParticipant, setNameEditTargetParticipant] = useState(null);
  const [newName, setNewName] = useState('');

  const handleTransferHostClick = (participant) => {
    setTransferTargetParticipant(participant);
    setTransferConfirmOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (transferTargetParticipant) {
      transferHost(transferTargetParticipant.id);
    }
    setTransferConfirmOpen(false);
    setTransferTargetParticipant(null);
  };

  const handleCancelTransfer = () => {
    setTransferConfirmOpen(false);
    setTransferTargetParticipant(null);
  };

  const handleNameChangeClick = (participant) => {
    setNameEditTargetParticipant(participant);
    setNewName(participant.name);
    setNameEditOpen(true);
  };

  const handleConfirmNameChange = () => {
    if (nameEditTargetParticipant && newName.trim()) {
      changeName(nameEditTargetParticipant.id, newName.trim());
    }
    setNameEditOpen(false);
    setNameEditTargetParticipant(null);
    setNewName('');
  };

  const handleCancelNameChange = () => {
    setNameEditOpen(false);
    setNameEditTargetParticipant(null);
    setNewName('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = () => {
    const hasText = text.trim();
    const hasImage = selectedImage !== null;
    
    if (hasText || hasImage) {
      sendChatMessage({ 
        text: hasText ? text : '',
        image: hasImage ? selectedImage : undefined 
      });
      setText('');
      setSelectedImage(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await processAndSendImage(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processAndSendImage = async (file) => {
    if (!file.type.startsWith('image/')) {
      console.error('Selected file is not an image');
      return;
    }
    
    if (file.size > MAX_IMAGE_SIZE) {
      console.error('Image size exceeds 5MB limit');
      alert(t('chat.imageTooLarge') || `Image size exceeds 5MB limit`);
      return;
    }
    
    try {
      let base64Image = await fileToBase64(file);
      
      // Compress if image is large (only for full-size images)
      if (file.size > 500 * 1024) {
        base64Image = await compressImage(base64Image);
      }
      
      // Store for preview instead of sending immediately
      setSelectedImage(base64Image);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  const handlePaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processAndSendImage(file);
        }
        break;
      }
    }
  };

  return (
    <Box
      onPaste={handlePaste}
      sx={{
        width: 360,
        borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#181818',
        height: '100vh',
      }}
    >
      <Box sx={{ p: 2, bgcolor: '#202020' }}>
         <Typography variant="h6">{t('chat.title')}</Typography>
      </Box>
      <Divider />
      
      {/* Participant List */}
      <Box sx={{ p: 1 }}>
          <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              {t('chat.participants', { count: participants.length })}
          </Typography>
          <List dense sx={{ maxHeight: 180, overflowY: 'auto' }}>
              {participants.map(p => (
                  <ListItem
                      key={p.id}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {p.id === myClientId ? (
                            <Tooltip title={t('profileDrawer.changeName') || 'Change name'}>
                              <IconButton edge="end" aria-label={t('profileDrawer.changeName') || 'Change name'} size="small" onClick={() => handleNameChangeClick({ id: p.id, name: p.name })}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : isHost && p.id !== myClientId ? (
                            <Tooltip title={t('chat.makeHost')}>
                              <IconButton edge="end" aria-label={t('chat.makeHost')} onClick={() => handleTransferHostClick({ id: p.id, name: p.name })}>
                                <SwapHorizIcon />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Box>
                      }
                      sx={{ pr: (p.id === myClientId) || (isHost && p.id !== myClientId) ? 10 : 2 }}
                  >
                      <ListItemText 
                          primary={p.name} 
                          primaryTypographyProps={{ 
                              fontWeight: p.id === myClientId ? 'bold' : 'normal',
                              fontStyle: p.id === myClientId ? 'italic' : 'normal',
                              noWrap: true,
                           }}
                      />
                      {p.id === hostId && <Chip label={t('watchTogether.host')} size="small" color="primary" variant="outlined" sx={{height: 20}} />}
                  </ListItem>
              ))}
          </List>
      </Box>
      <Divider />

      <List sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {chatHistory.map((msg) => (
          <ListItem 
            key={msg.id} 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: msg.senderId === myClientId ? 'flex-end' : 'flex-start'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                 <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.8rem' }}>{msg.senderName.charAt(0)}</Avatar>
                 <Typography variant="caption" color="text.secondary">{msg.senderName}</Typography>
            </Box>
            <Paper
              elevation={3}
              sx={{
                p: 1.5,
                borderRadius: 4,
                borderTopLeftRadius: msg.senderId !== myClientId ? 0 : 4,
                borderTopRightRadius: msg.senderId === myClientId ? 0 : 4,
                bgcolor: msg.senderId === myClientId ? 'primary.main' : 'background.paper',
                maxWidth: '90%',
              }}
            >
              {msg.text && <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>}
              {msg.image && (
                <Box
                  component="img"
                  src={msg.image}
                  alt={t('chat.sentImageAlt')}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: 2,
                    mt: msg.text ? 1 : 0,
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(msg.image, '_blank')}
                />
              )}
            </Paper>
          </ListItem>
        ))}
        <div ref={messagesEndRef} />
      </List>
      <Divider />
      <Box sx={{ p: 1, bgcolor: '#202020', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <IconButton onClick={() => fileInputRef.current?.click()} aria-label={t('chat.uploadImage')}>
            <ImageIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="standard"
          size="small"
          placeholder={t('chat.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          InputProps={{ disableUnderline: true }}
        />
        <IconButton onClick={handleSendMessage} color="primary" disabled={!text.trim() && !selectedImage}>
          <SendIcon />
        </IconButton>
      </Box>
      {/* Image Preview Section */}
      {selectedImage && (
        <Box 
          sx={{ 
            position: 'absolute',
            bottom: 70,
            left: 16,
            right: 16,
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 1,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 1
          }}
        >
          <Box
            component="img"
            src={selectedImage}
            alt={t('chat.previewAlt') || 'Image preview'}
            sx={{
              width: 60,
              height: 60,
              objectFit: 'cover',
              borderRadius: 1
            }}
          />
          <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('chat.imageAttached') || 'Image attached'}
          </Typography>
          <IconButton size="small" onClick={handleRemoveImage} aria-label={t('chat.removeImage')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {/* Host Transfer Confirmation Dialog */}
      <Dialog
        open={transferConfirmOpen}
        onClose={handleCancelTransfer}
        aria-labelledby="transfer-host-dialog-title"
      >
        <DialogTitle id="transfer-host-dialog-title">
          {t('watchTogether.transferHostTitle') || 'Transfer Host'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('watchTogether.transferHostConfirm', { name: transferTargetParticipant?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelTransfer} color="primary">
            {t('watchTogether.cancel')}
          </Button>
          <Button onClick={handleConfirmTransfer} color="primary" variant="contained" autoFocus>
            {t('watchTogether.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Name Edit Dialog */}
      <Dialog
        open={nameEditOpen}
        onClose={handleCancelNameChange}
        aria-labelledby="name-edit-dialog-title"
      >
        <DialogTitle id="name-edit-dialog-title">
          {t('profileDrawer.changeName') || 'Change Name'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('watchTogether.yourName') || 'Your name'}
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                handleConfirmNameChange();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNameChange} color="primary">
            {t('watchTogether.cancel')}
          </Button>
          <Button onClick={handleConfirmNameChange} color="primary" variant="contained" disabled={!newName.trim()} autoFocus>
            {t('watchTogether.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default Chat;
