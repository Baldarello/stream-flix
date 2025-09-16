import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, IconButton, TextField, CircularProgress, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { parseDataFromLink } from '../services/shareService';
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
};

const ImportLibraryModal: React.FC = observer(() => {
    const { isImportModalOpen, closeImportModal, importUrl, importSharedLibrary, isImportingLibrary } = mediaStore;
    const { t } = useTranslations();

    const [link, setLink] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (importUrl) {
            setLink(importUrl);
        }
    }, [importUrl]);
    
    const handleImport = () => {
        setError('');
        const data = parseDataFromLink(link);
        if (data) {
            importSharedLibrary(data);
            // The modal will stay open showing the progress spinner
        } else {
            setError(t('notifications.importInvalidLink'));
        }
    };
    
    const handleClose = () => {
        setLink('');
        setError('');
        closeImportModal();
    }

    return (
        <Modal open={isImportModalOpen} onClose={handleClose}>
            <Box sx={style}>
                 <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 8, top: 8 }} disabled={isImportingLibrary}><CloseIcon /></IconButton>
                <Typography variant="h6" component="h2">{t('shareAndImport.importTitle')}</Typography>
                
                {isImportingLibrary ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>{t('shareAndImport.importing')}</Typography>
                    </Box>
                ) : (
                    <>
                        <Typography sx={{ mt: 2 }}>{t('shareAndImport.pasteLink')}</Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder={t('shareAndImport.linkPlaceholder')}
                        />
                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                        <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={!link.trim()}
                            sx={{ mt: 2 }}
                        >
                            {t('shareAndImport.import')}
                        </Button>
                    </>
                )}
            </Box>
        </Modal>
    );
});

export default ImportLibraryModal;