import React from 'react';
import {observer} from 'mobx-react-lite';
import {Alert, Button, Snackbar} from '@mui/material';
import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';

export const NotificationSnackbar = observer(() => {
    const { snackbarMessage, hideSnackbar } = mediaStore;
    const { t } = useTranslations();

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        hideSnackbar();
    };

    const messageText = snackbarMessage 
      ? snackbarMessage.isTranslationKey 
        ? t(snackbarMessage.message, snackbarMessage.translationValues)
        : snackbarMessage.message
      : '';
      
    const actionLabelText = snackbarMessage?.action?.label
        ? snackbarMessage.isTranslationKey
            ? t(snackbarMessage.action.label)
            : snackbarMessage.action.label
        : '';


    const action = snackbarMessage?.action ? (
        <Button color="inherit" size="small" onClick={() => {
            snackbarMessage.action?.onClick();
            hideSnackbar();
        }}>
            {actionLabelText}
        </Button>
    );


    return (
        <Snackbar
            open={!!snackbarMessage}
            autoHideDuration={snackbarMessage?.action ? null : 6000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={handleClose}
                severity={snackbarMessage?.severity || 'info'}
                variant="filled"
                sx={{ width: '100%', color: 'white' }}
                action={action}
            >
                {messageText}
            </Alert>
        </Snackbar>
    );
});
