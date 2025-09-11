import React from 'react';
import { observer } from 'mobx-react-lite';
import { Snackbar, Alert } from '@mui/material';
import { mediaStore } from '../store/mediaStore';

const NotificationSnackbar: React.FC = () => {
    const { snackbarMessage, hideSnackbar } = mediaStore;

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        hideSnackbar();
    };

    return (
        <Snackbar
            open={!!snackbarMessage}
            autoHideDuration={6000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={handleClose}
                severity={snackbarMessage?.severity || 'info'}
                variant="filled"
                sx={{ width: '100%' }}
            >
                {snackbarMessage?.message}
            </Alert>
        </Snackbar>
    );
};

export default observer(NotificationSnackbar);