import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, IconButton, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { EpisodeLink } from '../types';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslations } from '../hooks/useTranslations';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 },
  bgcolor: 'rgba(20, 20, 30, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
};

const LinkSelectionModal: React.FC = () => {
  const { isLinkSelectionModalOpen, linksForSelection, itemForLinkSelection, closeLinkSelectionModal, startPlaybackConfirmed } = mediaStore;
  const { t } = useTranslations();

  const handleSelectLink = (link: EpisodeLink) => {
    if (itemForLinkSelection) {
      // Create a new item object with the selected video_url to pass to the player
      const itemToPlay = { ...itemForLinkSelection, video_url: link.url };
      startPlaybackConfirmed(itemToPlay);
    }
  };

  const handleClose = () => {
    closeLinkSelectionModal();
  };
  
  const title = (itemForLinkSelection && 'episode_number' in itemForLinkSelection) 
    ? t('linkSelectionModal.title', { episode: itemForLinkSelection.episode_number, name: itemForLinkSelection.name })
    : t('linkSelectionModal.defaultTitle');

  return (
    <Modal
      open={isLinkSelectionModalOpen}
      onClose={handleClose}
      aria-labelledby="link-selection-modal-title"
    >
      <Box sx={style}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
        <Typography id="link-selection-modal-title" variant="h6" component="h2" noWrap>
          {title}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, mb: 2 }}>
            {t('linkSelectionModal.subtitle')}
        </Typography>
        <List>
          {linksForSelection.map((link) => (
            <ListItem key={link.id} disablePadding>
              <ListItemButton onClick={() => handleSelectLink(link)}>
                <PlayArrowIcon sx={{ mr: 2 }}/>
                <ListItemText 
                  primary={link.label} 
                  secondary={link.url} 
                  primaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden'}}
                  secondaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden'}}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Modal>
  );
};

export default observer(LinkSelectionModal);