import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, TextField, IconButton, List, ListItem, ListItemText, Avatar, Paper, Divider, Chip, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const Chat: React.FC = () => {
  const { chatHistory, sendChatMessage, username, participants, hostId, isHost, myClientId, transferHost } = mediaStore;
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = () => {
    if (text.trim()) {
      sendChatMessage({ text });
      setText('');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64Image = await fileToBase64(file);
        sendChatMessage({ image: base64Image });
      } catch (error) {
        console.error("Error converting image to base64:", error);
      }
    }
  };

  return (
    <Box
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
         <Typography variant="h6">Chat della stanza</Typography>
      </Box>
      <Divider />
      
      {/* Participant List */}
      <Box sx={{ p: 1 }}>
          <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              Partecipanti ({participants.length})
          </Typography>
          <List dense sx={{ maxHeight: 180, overflowY: 'auto' }}>
              {participants.map(p => (
                  <ListItem
                      key={p.id}
                      secondaryAction={
                          isHost && p.id !== myClientId ? (
                              <Tooltip title="Rendi Host">
                                  <IconButton edge="end" aria-label="make host" onClick={() => transferHost(p.id)}>
                                      <SwapHorizIcon />
                                  </IconButton>
                              </Tooltip>
                          ) : null
                      }
                      sx={{ pr: isHost && p.id !== myClientId ? 8 : 2 }}
                  >
                      <ListItemText 
                          primary={p.name} 
                          primaryTypographyProps={{ 
                              fontWeight: p.id === myClientId ? 'bold' : 'normal',
                              fontStyle: p.id === myClientId ? 'italic' : 'normal',
                              noWrap: true,
                           }}
                      />
                      {p.id === hostId && <Chip label="Host" size="small" color="primary" variant="outlined" sx={{height: 20}} />}
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
                  alt="Immagine inviata"
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
      <Box sx={{ p: 1, bgcolor: '#202020', display: 'flex', alignItems: 'center' }}>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <IconButton onClick={() => fileInputRef.current?.click()} aria-label="upload image">
            <ImageIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="standard"
          size="small"
          placeholder="Scrivi un messaggio..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          InputProps={{ disableUnderline: true }}
        />
        <IconButton onClick={handleSendMessage} color="primary" disabled={!text.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default observer(Chat);