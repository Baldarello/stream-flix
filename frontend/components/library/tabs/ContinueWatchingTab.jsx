/**
 * @fileoverview ContinueWatchingTab - "Continua a guardare" tab content.
 *
 * Renders one futuristic card per show with a slim `LinearProgress`
 * bar driven by `episodeProgress`. Each row exposes two actions:
 * "Segna visto / non visto" (calling
 * `mediaStore.toggleEpisodeWatchedStatus`) and "Rimuovi" (via a
 * confirmation dialog that calls `mediaStore.removeFromContinueWatching`).
 *
 * Cards are filtered by `mediaStore.librarySearchQuery`.
 */

import React, {useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';

import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {EmptyState} from '../shared/EmptyState.jsx';

const formatDuration = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const matchesQuery = (item, query) => {
    if (!query) return true;
    const name = (item.show_title || item.name || item.title || '').toLowerCase();
    return name.includes(query.toLowerCase());
};

const ContinueWatchingTab = observer(() => {
    const {t} = useTranslations();
    const items = mediaStore.continueWatchingItems.filter((item) =>
        matchesQuery(item, mediaStore.librarySearchQuery)
    );
    const [pendingRemove, setPendingRemove] = useState(null);

    const handleConfirmRemove = async () => {
        if (!pendingRemove) return;
        await mediaStore.removeFromContinueWatching(pendingRemove.id);
        setPendingRemove(null);
    };

    if (items.length === 0) {
        const hasQuery = !!mediaStore.librarySearchQuery;
        return (
            <EmptyState
                id="continue-watching-empty"
                icon={<AccessTimeIcon sx={{fontSize: 44}}/>}
                title={
                    hasQuery
                        ? t('libraryManagement.dashboard.noResults', {query: mediaStore.librarySearchQuery})
                        : t('libraryManagement.empty.continueWatching')
                }
                ctaLabel={hasQuery ? undefined : t('libraryManagement.continueWatching.emptyCta')}
                onCta={
                    hasQuery
                        ? undefined
                        : () => {
                            mediaStore.activeView = 'Home';
                        }
                }
            />
        );
    }

    return (
        <>
            <Stack spacing={2} id="continue-watching-stack" data-component="continue-watching-tab">
                {items.map((item) => {
                    const progress = item.progress;
                    const progressPercent =
                        progress && progress.duration > 0
                            ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
                            : 0;
                    return (
                        <Box
                            key={`${item.show_id}-${item.id}`}
                            className="holo-surface neon-edge"
                            data-component="continue-watching-card"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                p: 2,
                                gap: 2,
                                borderRadius: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Box
                                component="img"
                                src={
                                    item.poster_path
                                        ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
                                        : '/placeholder.png'
                                }
                                alt={item.name || item.title}
                                sx={{
                                    width: 120,
                                    height: 68,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                }}
                            />
                            <Box sx={{flex: 1, minWidth: 200}}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {item.show_title || item.name || item.title}
                                </Typography>
                                <Typography variant="body2" sx={{color: 'var(--text-secondary)'}}>
                                    {`S${item.season_number ?? '?'}E${item.episode_number ?? '?'}${item.name ? ` - ${item.name}` : ''}`}
                                </Typography>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progressPercent}
                                        sx={{
                                            flex: 1,
                                            height: 4,
                                            borderRadius: 2,
                                            backgroundColor: 'rgba(76, 210, 255, 0.15)',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'var(--neon-accent)',
                                            },
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{color: 'var(--text-secondary)'}}
                                    >
                                        {progress ? formatDuration(progress.currentTime) : '0:00'} / {progress ? formatDuration(progress.duration) : '0:00'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Tooltip
                                    title={
                                        progress?.watched
                                            ? t('libraryManagement.markUnwatched')
                                            : t('libraryManagement.markWatched')
                                    }
                                >
                                    <Button
                                        id={`continue-watching-${item.id}-mark`}
                                        variant="outlined"
                                        size="small"
                                        onClick={() => mediaStore.toggleEpisodeWatchedStatus(item.id)}
                                        sx={{
                                            color: 'var(--neon-accent)',
                                            borderColor: 'rgba(76, 210, 255, 0.45)',
                                            '&:hover': {borderColor: 'var(--neon-accent)'},
                                        }}
                                    >
                                        {progress?.watched
                                            ? t('libraryManagement.markUnwatched')
                                            : t('libraryManagement.markWatched')}
                                    </Button>
                                </Tooltip>
                                <Tooltip title={t('libraryManagement.removeFromContinue')}>
                                    <IconButton
                                        id={`continue-watching-${item.id}-remove`}
                                        color="error"
                                        onClick={() =>
                                            setPendingRemove({
                                                id: item.id,
                                                name: item.name || item.title,
                                            })
                                        }
                                    >
                                        <DeleteIcon/>
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>

            <Dialog
                open={!!pendingRemove}
                onClose={() => setPendingRemove(null)}
                id="continue-watching-confirm-dialog"
            >
                <DialogTitle>{t('libraryManagement.deleteConfirm.title')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('libraryManagement.continueWatching.removeConfirm', {name: pendingRemove?.name || ''})}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingRemove(null)}>
                        {t('libraryManagement.cancel')}
                    </Button>
                    <Button onClick={handleConfirmRemove} color="error">
                        {t('libraryManagement.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
});

ContinueWatchingTab.displayName = 'ContinueWatchingTab';

export default ContinueWatchingTab;
export {ContinueWatchingTab};
