import React, { useEffect, useRef, useId } from 'react';
import { observer } from 'mobx-react-lite';
import { Alert, Button, Snackbar } from '@mui/material';
import { gsap } from 'gsap';
import { mediaStore } from '../../store/mediaStore.js';
import { useTranslations } from '../../hooks/useTranslations.js';
import { durations, easings, reducedMotion } from '../../motion/grammar.js';

/**
 * @fileoverview NotificationSnackbar - re-skinned futuristic snackbar.
 *
 * Uses the unified neon palette, holographic surface, and a slide-in
 * GSAP timeline. Reduced motion collapses to a 120ms fade.
 */
export const NotificationSnackbar = observer(() => {
    const { snackbarMessage, hideSnackbar } = mediaStore;
    const { t } = useTranslations();
    const alertRef = useRef(null);
    const lastMessageRef = useRef(null);
    const uniqueId = useId();
    const snackbarId = 'notification-snackbar';
    const alertId = snackbarMessage?.message ? `notification-snackbar-alert-${snackbarMessage.message}` : `notification-snackbar-alert-${uniqueId}`;

    const isAssertive = snackbarMessage?.severity === 'error' || snackbarMessage?.severity === 'warning';
    const role = isAssertive ? 'alert' : 'status';
    const ariaLive = isAssertive ? 'assertive' : 'polite';

    useEffect(() => {
        const alert = alertRef.current;
        if (!alert) return undefined;
        // Only animate on a new message.
        if (lastMessageRef.current === snackbarMessage) return undefined;
        lastMessageRef.current = snackbarMessage;
        if (!snackbarMessage) return undefined;

        if (reducedMotion()) {
            gsap.fromTo(alert,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.12, ease: 'none', overwrite: 'auto' });
            return undefined;
        }

        gsap.fromTo(alert,
            { y: 24, autoAlpha: 0, scale: 0.96 },
            { y: 0, autoAlpha: 1, scale: 1, duration: durations.med, ease: easings.emphasized, overwrite: 'auto' });
    }, [snackbarMessage]);

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
    ) : null;

    return (
        <Snackbar
            id={snackbarId}
            data-component="notification-snackbar"
            open={!!snackbarMessage}
            autoHideDuration={snackbarMessage?.action ? null : 6000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                ref={alertRef}
                id={alertId}
                data-component="notification-snackbar-alert"
                onClose={handleClose}
                severity={snackbarMessage?.severity || 'info'}
                variant="filled"
                role={role}
                aria-live={ariaLive}
                aria-atomic="true"
                sx={{
                    width: '100%',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-deep)',
                    backgroundImage: 'var(--holo-grad)',
                    border: '1px solid rgba(76, 210, 255, 0.35)',
                    boxShadow: '0 0 24px rgba(76, 210, 255, 0.35), 0 18px 40px rgba(0, 0, 0, 0.55)',
                    borderRadius: '12px',
                    fontFamily: "'Inter', sans-serif",
                    '& .MuiAlert-icon': {
                        color: 'var(--neon-accent)'
                    }
                }}
                action={action}
            >
                {messageText}
            </Alert>
        </Snackbar>
    );
});
