/**
 * @fileoverview MyListTab - "La mia lista" tab content.
 *
 * Renders the user's saved movies / series as a vertical list of
 * futuristic `holo-surface` cards. Each card shows the poster, the
 * cinematic title, a HoloChip for the media type, a HoloChip with the
 * link count and the last-edited timestamp sourced from
 * `mediaStore.libraryLastEdited`.
 *
 * Cards are filtered by `mediaStore.librarySearchQuery` and the
 * "remove from list" action surfaces a tiny confirmation dialog
 * before calling `mediaStore.toggleMyList`.
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
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import LinkIcon from '@mui/icons-material/Link';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';

import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {HoloChip} from '../../feedback/HoloChip.jsx';
import {EmptyState} from '../shared/EmptyState.jsx';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleDateString(
            mediaStore.language === 'en' ? 'en-US' : 'it-IT',
            {day: '2-digit', month: '2-digit', year: 'numeric'}
        );
    } catch (e) {
        return '';
    }
};

const matchesQuery = (item, query) => {
    if (!query) return true;
    const name = (item.name || item.title || '').toLowerCase();
    return name.includes(query.toLowerCase());
};

const MyListTab = observer(() => {
    const {t} = useTranslations();
    const items = mediaStore.myListItems.filter((item) =>
        matchesQuery(item, mediaStore.librarySearchQuery)
    );
    const [pendingRemove, setPendingRemove] = useState(() => null);

    const handleConfirmRemove = () => {
        if (!pendingRemove) return;
        mediaStore.toggleMyList({id: pendingRemove.id});
        setPendingRemove(null);
    };

    if (items.length === 0) {
        const hasQuery = !!mediaStore.librarySearchQuery;
        return (
            <EmptyState
                id="my-list-empty"
                icon={<FolderIcon sx={{fontSize: 44}}/>}
                title={
                    hasQuery
                        ? t('libraryManagement.dashboard.noResults', {query: mediaStore.librarySearchQuery})
                        : t('libraryManagement.empty.myList')
                }
                ctaLabel={hasQuery ? undefined : t('libraryManagement.myList.exploreCta')}
                onCta={
                    hasQuery
                        ? undefined
                        : () => {
                            // Switch to the home view; the layout reads
                            // `activeView` from the store.
                            mediaStore.activeView = 'Home';
                        }
                }
            />
        );
    }

    return (
        <>
            <Stack spacing={2} id="my-list-stack" data-component="my-list-tab">
                {items.map((item) => {
                    const linksCount = item.seasons
                        ? item.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0)
                        : (item.video_urls?.length || 0);
                    const lastEdited = mediaStore.libraryLastEdited.get(item.id);
                    return (
                        <Box
                            key={item.id}
                            className="holo-surface neon-edge"
                            data-component="my-list-card"
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
                                    width: 80,
                                    height: 120,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                }}
                            />
                            <Box sx={{flex: 1, minWidth: 200}}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {item.name || item.title}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{mt: 1, flexWrap: 'wrap', rowGap: 1}}>
                                    <HoloChip
                                        id={`my-list-${item.id}-type`}
                                        icon={item.media_type === 'tv' ? <TvIcon/> : <MovieIcon/>}
                                        label={
                                            item.media_type === 'tv'
                                                ? t('libraryManagement.type.series')
                                                : t('libraryManagement.type.movie')
                                        }
                                    />
                                    <HoloChip
                                        id={`my-list-${item.id}-links`}
                                        icon={<LinkIcon/>}
                                        label={`${linksCount} ${t('libraryManagement.links')}`}
                                    />
                                    {lastEdited && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'var(--text-secondary)',
                                                alignSelf: 'center',
                                            }}
                                        >
                                            {t('libraryManagement.myList.lastEdited', {date: formatDate(lastEdited)})}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Tooltip title={t('libraryManagement.removeFromMyList')}>
                                    <IconButton
                                        id={`my-list-${item.id}-remove`}
                                        color="error"
                                        onClick={() =>
                                            setPendingRemove({
                                                id: item.id,
                                                name: item.name || item.title || item.id,
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
                id="my-list-confirm-dialog"
            >
                <DialogTitle>{t('libraryManagement.deleteConfirm.title')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('libraryManagement.myList.removeConfirm', {name: pendingRemove?.name || ''})}
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

MyListTab.displayName = 'MyListTab';

export default MyListTab;
export {MyListTab};
