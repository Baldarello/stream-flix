import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, IconButton, List, ListItem, ListItemText, TextField, Stack, Paper, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslations } from '../hooks/useTranslations';
import type { MediaLink } from '../types';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 600 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const LinkMovieModal: React.FC = observer(() => {
  // FIX: Destructure the correct properties from mediaStore, which will be added in the store refactoring.
  const { isLinkMovieModalOpen, closeLinkMovieModal, linkingMovieItem, mediaLinks, addLinksToMedia, deleteMediaLink } = mediaStore;
  const { t } = useTranslations();
  
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const item = linkingMovieItem;
  
  const currentLinks = useMemo(() => {
    if (!item) return [];
    return mediaLinks.get(item.id) || [];
  }, [mediaLinks, item]);

  if (!item) return null;

  const handleAddLink = () => {
    if (newUrl.trim()) {
      addLinksToMedia(item.id, [{ url: newUrl.trim(), label: newLabel.trim() || newUrl.trim() }]);
      setNewUrl('');
      setNewLabel('');
    }
  };

  const handleDeleteLink = (linkId: number) => {
    deleteMediaLink(linkId);
  };

  return (
    <Modal open={isLinkMovieModalOpen} onClose={closeLinkMovieModal}>
      <Box sx={style}>
        <IconButton onClick={closeLinkMovieModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        <Typography variant="h6" component="h2" noWrap>{t('linkMovieModal.title', { title: item.title })}</Typography>

        <Stack spacing={2} sx={{ mt: 3, flex: 1, overflow: 'hidden' }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>{t('linkMovieModal.addLink')}</Typography>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                    <TextField label={t('linkMovieModal.url')} value={newUrl} onChange={e => setNewUrl(e.target.value)} size="small" fullWidth />
                    <TextField label={t('linkMovieModal.label')} value={newLabel} onChange={e => setNewLabel(e.target.value)} size="small" fullWidth />
                    <Button onClick={handleAddLink} variant="contained" startIcon={<AddIcon />} sx={{ flexShrink: 0 }}>{t('linkMovieModal.add')}</Button>
                </Stack>
            </Paper>

            <List sx={{ flex: 1, overflowY: 'auto' }}>
                {currentLinks.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{p: 2}}>
                        {t('linkMovieModal.noLinks')}
                    </Typography>
                ) : (
                    currentLinks.map((link: MediaLink) => (
                        <ListItem
                            key={link.id}
                            secondaryAction={
                                <Tooltip title={t('linkMovieModal.deleteLink')}>
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteLink(link.id!)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            }
                            disablePadding
                        >
                            <ListItemText
                                primary={link.label}
                                secondary={link.url}
                                primaryTypographyProps={{ noWrap: true }}
                                secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}
                            />
                        </ListItem>
                    ))
                )}
            </List>
        </Stack>
      </Box>
    </Modal>
  );
});

export default LinkMovieModal;
