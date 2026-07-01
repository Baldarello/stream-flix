/**
 * @fileoverview VideoLinksBulkBar - sticky bulk-action bar shown at
 * the bottom of `VideoLinksTab` whenever at least one link is
 * selected. Exposes "Cambia lingua", "Cambia tipo", "Elimina N" and
 * "Pulisci selezione" actions; each delegates to the matching
 * `mediaStore` method so the bulk operation is atomic at the
 * snackbar level.
 */

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import LanguageIcon from '@mui/icons-material/Language';
import SubtitlesIcon from '@mui/icons-material/Subtitles';

import { mediaStore } from '../../../store/mediaStore.js';
import { useTranslations } from '../../../hooks/useTranslations.js';

const VideoLinksBulkBar = observer(() => {
    const { t } = useTranslations();
    const [bulkLanguage, setBulkLanguage] = useState(() => 'ITA');
    const [bulkType, setBulkType] = useState(() => 'sub');

    const ids = Array.from(mediaStore.librarySelectedLinkIds);
    const count = ids.length;
    if (count === 0) return null;

    const handleChangeLanguage = async () => {
        await mediaStore.setBulkLinkLanguage(ids, bulkLanguage);
    };

    const handleChangeType = async () => {
        await mediaStore.setBulkLinkType(ids, bulkType);
    };

    const handleDelete = async () => {
        await mediaStore.bulkDeleteLinks(ids);
    };

    return (
        <Paper
            id="video-links-bulk-bar"
            data-component="video-links-bulk-bar"
            role="toolbar"
            aria-label={t('libraryManagement.videoLinks.bulkBar.selected', { count })}
            elevation={0}
            className="holo-surface neon-edge"
            sx={{
                position: 'sticky',
                bottom: { xs: 12, md: 24 },
                mt: 2,
                p: 1.5,
                borderRadius: '14px',
                zIndex: 4,
                background: 'var(--bg-deep)',
                backgroundImage: 'var(--holo-grad)',
                border: '1px solid rgba(76, 210, 255, 0.45)',
            }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
            >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" rowGap={1}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            color: 'var(--neon-accent)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                        }}
                    >
                        {t('libraryManagement.videoLinks.bulkBar.selected', { count })}
                    </Typography>
                    <TextField
                        id="video-links-bulk-language"
                        value={bulkLanguage}
                        onChange={(e) => setBulkLanguage(e.target.value.toUpperCase())}
                        size="small"
                        label={t('libraryManagement.videoLinks.bulkBar.languagePrompt')}
                        inputProps={{
                            maxLength: 3,
                            'aria-label': t('libraryManagement.videoLinks.bulkBar.changeLanguage'),
                        }}
                        sx={{
                            width: 120,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(76, 210, 255, 0.35)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--neon-accent)' },
                            '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                            '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: 'var(--neon-accent)' },
                        }}
                    />
                    <Tooltip title={t('libraryManagement.videoLinks.bulkBar.changeLanguage')}>
                        <Button
                            id="video-links-bulk-apply-language"
                            onClick={handleChangeLanguage}
                            variant="outlined"
                            startIcon={<LanguageIcon />}
                            sx={{
                                color: 'var(--neon-accent)',
                                borderColor: 'rgba(76, 210, 255, 0.45)',
                                '&:hover': { borderColor: 'var(--neon-accent)' },
                            }}
                        >
                            {t('libraryManagement.videoLinks.bulkBar.changeLanguage')}
                        </Button>
                    </Tooltip>
                    <FormControl
                        size="small"
                        sx={{
                            minWidth: 120,
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(76, 210, 255, 0.35)' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--neon-accent)' },
                            '& .MuiInputBase-input': { color: 'var(--text-primary)' },
                            '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: 'var(--neon-accent)' },
                        }}
                    >
                        <InputLabel id="video-links-bulk-type-label">{t('libraryManagement.videoLinks.bulkBar.type')}</InputLabel>
                        <Select
                            labelId="video-links-bulk-type-label"
                            value={bulkType}
                            label={t('libraryManagement.videoLinks.bulkBar.type')}
                            onChange={(e) => setBulkType(e.target.value)}
                            inputProps={{ 'aria-label': t('libraryManagement.videoLinks.bulkBar.changeType') }}
                        >
                            <MenuItem value="sub">{t('libraryManagement.sub')}</MenuItem>
                            <MenuItem value="dub">{t('libraryManagement.dub')}</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title={t('libraryManagement.videoLinks.bulkBar.changeType')}>
                        <Button
                            id="video-links-bulk-apply-type"
                            onClick={handleChangeType}
                            variant="outlined"
                            startIcon={<SubtitlesIcon />}
                            sx={{
                                color: 'var(--neon-accent)',
                                borderColor: 'rgba(76, 210, 255, 0.45)',
                                '&:hover': { borderColor: 'var(--neon-accent)' },
                            }}
                        >
                            {t('libraryManagement.videoLinks.bulkBar.changeType')}
                        </Button>
                    </Tooltip>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={t('libraryManagement.videoLinks.bulkBar.deleteN', { count })}>
                        <Button
                            id="video-links-bulk-delete"
                            onClick={handleDelete}
                            variant="contained"
                            startIcon={<DeleteIcon />}
                            sx={{
                                background: 'var(--neon-accent-hot)',
                                color: 'var(--bg-deep)',
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                '&:hover': { background: '#ff7a7a' },
                            }}
                        >
                            {t('libraryManagement.videoLinks.bulkBar.deleteN', { count })}
                        </Button>
                    </Tooltip>
                    <Tooltip title={t('libraryManagement.videoLinks.bulkBar.clearSelection')}>
                        <IconButton
                            id="video-links-bulk-clear"
                            onClick={() => mediaStore.clearLinkSelection()}
                            sx={{ color: 'var(--neon-accent)' }}
                            aria-label={t('libraryManagement.videoLinks.bulkBar.clearSelection')}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
            <Box sx={{ display: 'none' }} aria-hidden>
                {t('libraryManagement.videoLinks.bulkBar.apply')}
            </Box>
        </Paper>
    );
});

VideoLinksBulkBar.displayName = 'VideoLinksBulkBar';

export default VideoLinksBulkBar;
export { VideoLinksBulkBar };
