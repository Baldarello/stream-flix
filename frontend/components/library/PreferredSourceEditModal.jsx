/**
 * @fileoverview PreferredSourceEditModal - dedicated modal for editing
 * the preferred source of a single show. Built on `ModalShell` so it
 * inherits the cinematic surface, scanline overlay and reduced-motion
 * entry.
 *
 * The user enters a full URL; the modal extracts its origin (scheme +
 * host + port) and calls `mediaStore.setPreferredSource(showId, origin)`
 * which both persists the change to Dexie and shows a success
 * snackbar.
 *
 * The modal holds its own local `useState` for the URL field (this is
 * a modal, not a screen, so `useState` is allowed here).
 */

import React, {useEffect, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Alert,
    Button,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from '../modals/ModalShell.jsx';

const holoFieldSx = {
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(76, 210, 255, 0.35)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent-hot)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent)',
        boxShadow: 'var(--edge-glow)',
    },
    '& .MuiInputLabel-root': {
        color: 'var(--text-secondary)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--neon-accent)',
    },
    '& .MuiInputBase-input': {
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
    },
    '& .MuiFormHelperText-root': {
        color: 'var(--text-secondary)',
    },
};

const buildPreview = (rawUrl) => {
    if (!rawUrl) return '';
    try {
        const u = new URL(rawUrl);
        return u.origin;
    } catch (e) {
        return '';
    }
};

const PreferredSourceEditModal = observer(() => {
    const {t} = useTranslations();
    const showId = mediaStore.libraryEditingPreferredSourceShowId;
    const open = showId != null;
    const show = showId != null ? mediaStore.cachedItems.get(showId) : null;
    const currentOrigin = showId != null ? mediaStore.preferredSources.get(showId) : null;

    const [url, setUrl] = useState(() => '');
    const [debouncedUrl, setDebouncedUrl] = useState(() => '');

    useEffect(() => {
        if (open && currentOrigin) {
            // Prefill the input with the current origin so the user
            // can see/edit it directly.
            setUrl(currentOrigin);
            setDebouncedUrl(currentOrigin);
        } else if (open) {
            setUrl('');
            setDebouncedUrl('');
        }
    }, [open, currentOrigin]);

    // Debounce URL preview by 200ms.
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedUrl(url);
        }, 200);
        return () => clearTimeout(handle);
    }, [url]);

    if (!open) return null;

    const handleClose = () => {
        mediaStore.closePreferredSourceEditModal();
    };

    const handleSave = async () => {
        if (!showId) return;
        const origin = buildPreview(url);
        if (!origin) {
            mediaStore.showSnackbar(
                'libraryManagement.preferredSources.editInvalidUrl',
                'warning',
                true
            );
            return;
        }
        await mediaStore.setPreferredSource(showId, origin);
        handleClose();
    };

    const preview = buildPreview(debouncedUrl);
    const showName = show?.name || show?.title || `Show #${showId}`;

    return (
        <ModalShell
            id="preferred-source-edit-modal"
            data-component="preferred-source-edit-modal"
            open={open}
            onClose={handleClose}
            title={t('libraryManagement.preferredSources.editTitle', {name: showName})}
            maxWidth="sm"
        >
            <Stack spacing={2} sx={{pt: 1}}>
                <Alert
                    severity="info"
                    sx={{
                        background: 'var(--holo-grad)',
                        color: 'var(--text-primary)',
                        border: '1px solid rgba(76, 210, 255, 0.35)',
                        '& .MuiAlert-icon': {color: 'var(--neon-accent)'},
                    }}
                >
                    {t('libraryManagement.preferredSources.editInfo')}
                </Alert>

                <TextField
                    id="preferred-source-edit-url"
                    label={t('libraryManagement.preferredSources.editUrl')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    fullWidth
                    autoFocus
                    sx={holoFieldSx}
                />

                {preview && (
                    <Typography
                        variant="caption"
                        sx={{color: 'var(--text-secondary)', mt: -1}}
                    >
                        {t('libraryManagement.preferredSources.editPreview', {preview})}
                    </Typography>
                )}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                        id="preferred-source-edit-cancel"
                        onClick={handleClose}
                        sx={{color: 'var(--text-secondary)'}}
                    >
                        {t('libraryManagement.preferredSources.editCancel')}
                    </Button>
                    <Button
                        id="preferred-source-edit-save"
                        onClick={handleSave}
                        variant="contained"
                        sx={{
                            background: 'var(--neon-accent)',
                            color: 'var(--bg-deep)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            '&:hover': {background: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow-hot)'},
                        }}
                    >
                        {t('libraryManagement.preferredSources.editSave')}
                    </Button>
                </Stack>
            </Stack>
        </ModalShell>
    );
});

PreferredSourceEditModal.displayName = 'PreferredSourceEditModal';

export default PreferredSourceEditModal;
export {PreferredSourceEditModal};
