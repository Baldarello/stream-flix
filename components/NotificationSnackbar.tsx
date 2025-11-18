
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Snackbar, Alert, Button } from '@mui/material';
import { mediaStore } from '../store/mediaStore';
import { useTranslations } from '../hooks/useTranslations';

export const NotificationSnackbar: React.FC = observer(() => {
    const { snackbarMessage, hideSnackbar } = mediaStore;
    const { t } = useTranslations();

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
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
    ) : undefined;


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
