
import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, IconButton, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { MediaLink } from '../types';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslations } from '../hooks/useTranslations';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
};

const LinkSelectionModal: React.FC = () => {
  const { isLinkSelectionModalOpen, linksForSelection, itemForLinkSelection, closeLinkSelectionModal, startPlayback, linkSelectionContext, playRemoteItem } = mediaStore;
  const { t } = useTranslations();

  const handleSelectLink = (link: MediaLink) => {
    if (itemForLinkSelection) {
      // Create a new item object with the selected video_url to pass to the player
      const itemToPlay = { ...itemForLinkSelection, video_url: link.url };
      if (linkSelectionContext === 'remote') {
        playRemoteItem(itemToPlay);
      } else {
        startPlayback(itemToPlay);
      }
    }
  };

  const handleClose = () => {
    closeLinkSelectionModal();
  };
  
  // FIX: Use an explicit type guard to safely access properties on the PlayableItem union type.
  let title: string;
  if (itemForLinkSelection && 'episode_number' in itemForLinkSelection) {
      title = t('linkSelectionModal.title', { episode: itemForLinkSelection.episode_number, name: itemForLinkSelection.name });
  // FIX: Property 'title' does not exist on type 'PlayableItem'. Added a more specific type guard.
  } else if (itemForLinkSelection && 'media_type' in itemForLinkSelection) { // This will be a MediaItem
      title = itemForLinkSelection.title || itemForLinkSelection.name || t('linkSelectionModal.defaultTitle');
  } else {
      title = t('linkSelectionModal.defaultTitle');
  }

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
