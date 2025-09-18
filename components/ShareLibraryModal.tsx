import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, Checkbox, TextField, InputAdornment, Tooltip, ListItemButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { createShareLink } from '../services/shareService';
import { useTranslations } from '../hooks/useTranslations';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 500 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const ShareLibraryModal: React.FC = observer(() => {
    const { isShareModalOpen, closeShareModal, shareableShows, generateShareableData, showSnackbar } = mediaStore;
    const { t } = useTranslations();
    
    const [selectedShows, setSelectedShows] = useState<Set<number>>(new Set());
    const [generatedLink, setGeneratedLink] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Memoize the initial selection to only run once when the modal opens
    useMemo(() => {
        if (isShareModalOpen) {
            setSelectedShows(new Set(shareableShows.map(s => s.id)));
        }
    }, [isShareModalOpen, shareableShows]);

    const handleToggle = (showId: number) => {
        const newSelection = new Set(selectedShows);
        if (newSelection.has(showId)) {
            newSelection.delete(showId);
        } else {
            newSelection.add(showId);
        }
        setSelectedShows(newSelection);
    };
    
    const handleSelectAll = () => {
        if (selectedShows.size === shareableShows.length) {
            setSelectedShows(new Set()); // Deselect all
        } else {
            setSelectedShows(new Set(shareableShows.map(s => s.id))); // Select all
        }
    }

    const handleGenerateLink = () => {
        setIsGenerating(true);
        const data = generateShareableData(Array.from(selectedShows));
        if (data.shows.length === 0) {
            showSnackbar("notifications.shareNoShowsSelected", "warning", true);
            setIsGenerating(false);
            return;
        }
        const link = createShareLink(data);
        setGeneratedLink(link);
        setIsGenerating(false);
    };
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        showSnackbar("notifications.copiedToClipboard", "success", true);
    }

    const handleClose = () => {
        setGeneratedLink('');
        setIsGenerating(false);
        closeShareModal();
    }

    const isAllSelected = selectedShows.size > 0 && selectedShows.size === shareableShows.length;
    const isIndeterminate = selectedShows.size > 0 && selectedShows.size < shareableShows.length;

    return (
        <Modal open={isShareModalOpen} onClose={handleClose}>
            <Box sx={style}>
                <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                <Typography variant="h6" component="h2">{t('shareAndImport.shareTitle')}</Typography>

                {generatedLink ? (
                    <Box mt={2}>
                        <Typography gutterBottom>{t('shareAndImport.shareLinkReady')}</Typography>
                        {/* The 'readOnly' prop on TextField is passed via 'InputProps' to avoid a TypeScript error. */}
                        <TextField
                            fullWidth
                            value={generatedLink}
                            variant="outlined"
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title={t('shareAndImport.copyLink')}>
                                            <IconButton onClick={handleCopyToClipboard}>
                                                <ContentCopyIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                )
                            }}
                        />
                         <Button onClick={() => setGeneratedLink('')} sx={{mt: 2}}>{t('shareAndImport.back')}</Button>
                    </Box>
                ) : (
                    <>
                        <Typography sx={{ mt: 2, mb: 1 }}>{t('shareAndImport.selectShows')}</Typography>
                        <List sx={{ flex: 1, overflowY: 'auto', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                            <ListItem>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={isAllSelected}
                                        indeterminate={isIndeterminate}
                                        onChange={handleSelectAll}
                                    />
                                </ListItemIcon>
                                <ListItemText primary={t('shareAndImport.selectAll', { count: shareableShows.length })} />
                            </ListItem>
                            {shareableShows.map(show => (
                                <ListItem key={show.id} secondaryAction={<IconButton edge="end" aria-label="comments" />}>
                                    <ListItemButton onClick={() => handleToggle(show.id)}>
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedShows.has(show.id)}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText primary={show.name} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                        <Button
                            variant="contained"
                            onClick={handleGenerateLink}
                            disabled={isGenerating || selectedShows.size === 0}
                            sx={{ mt: 2 }}
                        >
                            {isGenerating ? t('shareAndImport.generating') : t('shareAndImport.generateLink')}
                        </Button>
                    </>
                )}
            </Box>
        </Modal>
    );
});

export default ShareLibraryModal;