import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, IconButton, List, ListItem, ListItemText, TextField, Stack, Paper, Tooltip, Autocomplete, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
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
  const { 
    isLinkMovieModalOpen, 
    closeLinkMovieModal, 
    linkingMovieItem, 
    mediaLinks, 
    addLinksToMedia, 
    deleteMediaLink,
    preferredSources,
    setPreferredSource
  } = mediaStore;
  const { t } = useTranslations();
  
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newLanguage, setNewLanguage] = useState('ITA');
  const [newType, setNewType] = useState<'sub' | 'dub'>('sub');

  const item = linkingMovieItem;
  
  const linksByOrigin = useMemo(() => {
    if (!item) return {};
    const links = mediaLinks.get(item.id) || [];
    return links.reduce((acc, link) => {
        try {
            const origin = new URL(link.url).origin;
            if (!acc[origin]) acc[origin] = [];
            acc[origin].push(link);
        } catch (e) { /* ignore invalid URLs */ }
        return acc;
    }, {} as Record<string, MediaLink[]>);
  }, [mediaLinks, item]);

  const preferredOriginForMovie = item ? preferredSources.get(item.id) : undefined;

  if (!item) return null;

  const handleAddLink = () => {
    if (newUrl.trim() && newLanguage.trim()) {
      addLinksToMedia(item.id, [{ 
          url: newUrl.trim(), 
          label: newLabel.trim() || new URL(newUrl.trim()).hostname,
          language: newLanguage,
          type: newType 
        }]);
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
                <Stack spacing={2}>
                    <TextField label={t('linkMovieModal.url')} value={newUrl} onChange={e => setNewUrl(e.target.value)} size="small" fullWidth required />
                     <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                        <TextField
                            label={t('linkMovieModal.language')}
                            value={newLanguage}
                            onChange={e => setNewLanguage(e.target.value.toUpperCase())}
                            required
                            size="small"
                            sx={{width: {xs: '100%', sm: '120px'}}}
                            inputProps={{ maxLength: 3 }}
                        />
                        <FormControl fullWidth required size="small">
                            <InputLabel>{t('linkMovieModal.type')}</InputLabel>
                            <Select value={newType} label={t('linkMovieModal.type')} onChange={(e) => setNewType(e.target.value as 'sub' | 'dub')}>
                                <MenuItem value="sub">{t('linkMovieModal.sub')}</MenuItem>
                                <MenuItem value="dub">{t('linkMovieModal.dub')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                    <Autocomplete
                        freeSolo
                        fullWidth
                        size="small"
                        options={mediaStore.allUniqueLabels}
                        value={newLabel}
                        onInputChange={(event, newInputValue) => {
                            setNewLabel(newInputValue);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={t('linkMovieModal.label')}
                            />
                        )}
                    />
                    <Button onClick={handleAddLink} variant="contained" startIcon={<AddIcon />} sx={{ flexShrink: 0, alignSelf: 'flex-end' }}>{t('linkMovieModal.add')}</Button>
                </Stack>
            </Paper>

            <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                {Object.keys(linksByOrigin).length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{p: 2}}>
                        {t('linkMovieModal.noLinks')}
                    </Typography>
                ) : (
                    Object.entries(linksByOrigin).map(([origin, links]) => {
                        const isPreferred = preferredOriginForMovie === origin;
                        const tooltipTitle = isPreferred ? t('linkEpisodesModal.manage.removePreferred') : t('linkEpisodesModal.manage.setAsPreferred');
                        
                        return (
                            <Paper key={origin} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>{origin}</Typography>
                                    <Tooltip title={tooltipTitle}>
                                        <IconButton onClick={() => setPreferredSource(item.id, origin)}>
                                            {isPreferred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                {/* FIX: Add Array.isArray guard to prevent runtime errors if links is not an array. */}
                                {Array.isArray(links) && links.map((link: MediaLink) => (
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
                                        sx={{ pl: 1, borderTop: '1px solid rgba(255,255,255,0.12)' }}
                                    >
                                        <ListItemText
                                            primary={link.label}
                                            secondary={link.url}
                                            primaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}
                                            secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}
                                        />
                                    </ListItem>
                                ))}
                            </Paper>
                        );
                    })
                )}
            </List>
        </Stack>
      </Box>
    </Modal>
  );
});

export default LinkMovieModal;