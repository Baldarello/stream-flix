/**
 * @fileoverview LinkEditModal - dedicated modal for editing a single
 * video link. Built on `ModalShell` so it inherits the cinematic
 * surface, scanline overlay and reduced-motion entry. The form holds
 * its own local state (this is a modal, not a screen, so `useState` is
 * allowed here) and persists via `mediaStore.updateMediaLink` when the
 * user hits Save.
 *
 * The "Validate now" button wraps `mediaStore.validateLink` so the
 * caller does not need to import `linkValidator` directly.
 *
 * The "preferred for this show" switch is a UX shortcut: when
 * toggled on, it calls `mediaStore.setPreferredSource` with the
 * link's hostname and shows a success snackbar. The change is not
 * persisted on Save; it happens immediately so the user can see the
 * effect right away.
 */

import React, {useEffect, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from '../modals/ModalShell.jsx';
import {holoFieldSx} from "../../styles/style.js"


const buildPreview = (rawUrl) => {
    if (!rawUrl) return '';
    try {
        const u = new URL(rawUrl);
        const path = u.pathname === '/' ? '' : u.pathname;
        return `${u.hostname}${path}`;
    } catch (e) {
        return '';
    }
};

const getContextForLink = (link) => {
    if (!link) return null;
    const mediaId = link.mediaId;
    if (!mediaId) return null;
    for (const show of mediaStore.cachedItems.values()) {
        if (show.seasons) {
            for (const season of show.seasons) {
                const episode = season.episodes.find((e) => e.id === mediaId);
                if (episode) {
                    return {
                        showName: show.name || show.title || 'Unknown',
                        season: season.season_number,
                        episode: episode.episode_number,
                    };
                }
            }
        }
        if (show.id === mediaId) {
            return {showName: show.name || show.title || 'Unknown', season: null, episode: null};
        }
    }
    return null;
};

const LinkEditModal = observer(() => {
    const {t} = useTranslations();
    const linkId = mediaStore.libraryEditingLinkId;
    const open = linkId != null;
    // Flat lookup: mediaLinks is a Map<mediaId, Link[]>, so we
    // resolve a single link by primary id via a one-shot scan. The
    // result is memoised per-render and re-derived only when the
    // editing id changes.
    const allLinks = [];
    for (const arr of mediaStore.mediaLinks.values()) {
        for (const l of arr) allLinks.push(l);
    }
    const resolved = linkId != null ? allLinks.find((l) => l.id === linkId) || null : null;

    const [draft, setDraft] = useState(() => null);
    const [debouncedUrl, setDebouncedUrl] = useState(() => '');
    const [validating, setValidating] = useState(() => false);
    const [validateResult, setValidateResult] = useState(() => null);

    useEffect(() => {
        if (!resolved) {
            setDraft(null);
            setValidateResult(null);
            return undefined;
        }
        setDraft({
            url: resolved.url || '',
            label: resolved.label || '',
            language: (resolved.language || 'ITA').toUpperCase().slice(0, 3),
            type: resolved.type || 'sub',
        });
        setDebouncedUrl(resolved.url || '');
        setValidateResult(null);
    }, [resolved?.id, resolved?.url, resolved?.label, resolved?.language, resolved?.type]);

    // Debounce URL preview by 200ms to avoid recomputing on every
    // keystroke.
    useEffect(() => {
        if (!draft) return undefined;
        const handle = setTimeout(() => {
            setDebouncedUrl(draft.url);
        }, 200);
        return () => clearTimeout(handle);
    }, [draft?.url]);

    if (!open) return null;

    const handleClose = () => {
        mediaStore.closeLinkEditModal();
    };

    const handleSave = async () => {
        if (!resolved || !draft) return;
        if (!draft.url || !String(draft.url).trim()) {
            mediaStore.showSnackbar('libraryManagement.linkEdit.missingUrl', 'warning', true);
            return;
        }
        try {
            const updates = {
                url: draft.url.trim(),
                label: (draft.label || '').trim() || new URL(draft.url).hostname,
                language: (draft.language || 'ITA').toUpperCase().slice(0, 3),
                type: draft.type || 'sub',
            };
            await mediaStore.updateMediaLink(resolved.id, updates);
            mediaStore.showSnackbar('libraryManagement.linkEdit.savedSuccess', 'success', true);
            handleClose();
        } catch (e) {
            mediaStore.showSnackbar('notifications.processingError', 'error', true, {error: e.message});
        }
    };

    const handleValidateNow = async () => {
        if (!resolved) return;
        setValidating(true);
        setValidateResult(null);
        try {
            const ok = await mediaStore.validateLink(resolved.id);
            setValidateResult(ok);
            if (ok) {
                mediaStore.showSnackbar('libraryManagement.linkEdit.validatedSuccess', 'success', true);
            } else {
                mediaStore.showSnackbar('libraryManagement.linkEdit.validatedInvalid', 'warning', true);
            }
        } finally {
            setValidating(false);
        }
    };

    const handleTogglePreferred = (e) => {
        if (!resolved) return;
        if (!e.target.checked) return;
        try {
            const host = new URL(resolved.url).origin;
            mediaStore.setPreferredSource(resolved.mediaId, host);
        } catch (err) {
            // ignore: invalid URL
        }
    };

    const context = resolved ? getContextForLink(resolved) : null;
    const preview = buildPreview(debouncedUrl);
    const isPreferred = !!(resolved && context && mediaStore.preferredSources.get(context.showId) &&
        (() => {
            try {
                return new URL(resolved.url).origin === mediaStore.preferredSources.get(context.showId);
            } catch (e) {
                return false;
            }
        })()
    );

    if (!draft) return null;

    return (
        <ModalShell
            id="link-edit-modal"
            data-component="link-edit-modal"
            open={open}
            onClose={handleClose}
            title={t('libraryManagement.linkEdit.title')}
            maxWidth="sm"
        >
            <Stack spacing={2} sx={{pt: 1}}>
                {context && (
                    <Alert
                        severity="info"
                        sx={{
                            background: 'var(--holo-grad)',
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(76, 210, 255, 0.35)',
                            '& .MuiAlert-icon': {color: 'var(--neon-accent)'},
                        }}
                    >
                        {context.season != null
                            ? t('libraryManagement.linkEdit.showContext', {
                                show: context.showName,
                                season: context.season,
                                episode: context.episode,
                            })
                            : context.showName}
                    </Alert>
                )}

                <TextField
                    id="link-edit-url"
                    label={t('libraryManagement.linkEdit.urlLabel')}
                    value={draft.url}
                    onChange={(e) => setDraft({...draft, url: e.target.value})}
                    fullWidth
                    sx={holoFieldSx}
                />
                {preview && (
                    <Typography
                        variant="caption"
                        sx={{color: 'var(--text-secondary)', mt: -1}}
                    >
                        {t('libraryManagement.linkEdit.urlPreview', {preview})}
                    </Typography>
                )}

                <TextField
                    id="link-edit-label"
                    label={t('libraryManagement.linkEdit.labelLabel')}
                    value={draft.label}
                    onChange={(e) => setDraft({...draft, label: e.target.value})}
                    fullWidth
                    sx={holoFieldSx}
                />

                <Stack direction="row" spacing={2}>
                    <TextField
                        id="link-edit-language"
                        label={t('libraryManagement.linkEdit.languageLabel')}
                        value={draft.language}
                        onChange={(e) =>
                            setDraft({...draft, language: e.target.value.toUpperCase().slice(0, 3)})
                        }
                        sx={{...holoFieldSx, width: 140}}
                        inputProps={{maxLength: 3}}
                    />
                    <FormControl fullWidth sx={holoFieldSx}>
                        <InputLabel id="link-edit-type-label">
                            {t('libraryManagement.linkEdit.typeLabel')}
                        </InputLabel>
                        <Select
                            labelId="link-edit-type-label"
                            value={draft.type}
                            label={t('libraryManagement.linkEdit.typeLabel')}
                            onChange={(e) => setDraft({...draft, type: e.target.value})}
                        >
                            <MenuItem value="sub">{t('libraryManagement.sub')}</MenuItem>
                            <MenuItem value="dub">{t('libraryManagement.dub')}</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                <FormControlLabel
                    control={
                        <Checkbox
                            id="link-edit-preferred"
                            checked={isPreferred}
                            onChange={handleTogglePreferred}
                            sx={{
                                color: 'var(--neon-accent)',
                                '&.Mui-checked': {color: 'var(--neon-accent)'},
                            }}
                        />
                    }
                    label={t('libraryManagement.linkEdit.preferredSwitch')}
                    sx={{color: 'var(--text-secondary)'}}
                />

                {validateResult !== null && (
                    <Alert
                        severity={validateResult ? 'success' : 'warning'}
                        icon={validateResult ? <VerifiedIcon/> : <ReportProblemIcon/>}
                        sx={{
                            background: 'var(--holo-grad)',
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(76, 210, 255, 0.35)',
                        }}
                    >
                        {validateResult
                            ? t('libraryManagement.linkEdit.valid')
                            : t('libraryManagement.linkEdit.invalid')}
                    </Alert>
                )}

                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Button
                        id="link-edit-validate"
                        onClick={handleValidateNow}
                        variant="outlined"
                        disabled={validating}
                        sx={{
                            color: 'var(--neon-accent)',
                            borderColor: 'rgba(76, 210, 255, 0.45)',
                            '&:hover': {borderColor: 'var(--neon-accent)'},
                        }}
                    >
                        {validating ? <CircularProgress size={18}/> : t('libraryManagement.linkEdit.validateNow')}
                    </Button>
                    <Box sx={{flex: 1}}/>
                    <Button
                        id="link-edit-cancel"
                        onClick={handleClose}
                        sx={{color: 'var(--text-secondary)'}}
                    >
                        {t('libraryManagement.linkEdit.cancel')}
                    </Button>
                    <Button
                        id="link-edit-save"
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
                        {t('libraryManagement.linkEdit.save')}
                    </Button>
                </Stack>
            </Stack>
        </ModalShell>
    );
});

LinkEditModal.displayName = 'LinkEditModal';

export default LinkEditModal;
export {LinkEditModal};
