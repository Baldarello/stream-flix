/**
 * @fileoverview PreferredSourcesTab - "Fonti Preferite" tab content.
 *
 * Renders one futuristic card per preferred source. The card shows
 * the show poster, the origin URL, a HoloChip with the number of
 * available links for that show, and a "Rimuovi" action that calls
 * `mediaStore.setPreferredSource(showId, null)`.
 *
 * Cards are filtered by `mediaStore.librarySearchQuery`.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Button, Stack, Tooltip, Typography} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import StarIcon from '@mui/icons-material/Star';
import LanguageIcon from '@mui/icons-material/Language';
import EditIcon from '@mui/icons-material/Edit';

import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {HoloChip} from '../../feedback/HoloChip.jsx';
import {EmptyState} from '../shared/EmptyState.jsx';

const countLinksForShow = (showId) => {
    if (!showId) return 0;
    let count = 0;
    for (const [mediaId, links] of mediaStore.mediaLinks.entries()) {
        // Direct movie link entry
        if (mediaId === showId) {
            count += links.length;
            continue;
        }
        // Episode link entry
        for (const show of mediaStore.cachedItems.values()) {
            if (show.id === showId && show.seasons) {
                for (const season of show.seasons) {
                    if (season.episodes.some((e) => e.id === mediaId)) {
                        count += links.length;
                    }
                }
            }
        }
    }
    return count;
};

const PreferredSourcesTab = observer(() => {
    const {t} = useTranslations();
    const entries = Array.from(mediaStore.preferredSources.entries());
    const query = mediaStore.librarySearchQuery;

    const filtered = entries
        .map(([showId, origin]) => {
            const show = mediaStore.cachedItems.get(showId);
            const name = (show?.name || show?.title || `Show #${showId}`).toString();
            return {showId, origin, show, name};
        })
        .filter((entry) => {
            if (!query) return true;
            return entry.name.toLowerCase().includes(query.toLowerCase())
                || entry.origin.toLowerCase().includes(query.toLowerCase());
        });

    if (filtered.length === 0) {
        return (
            <EmptyState
                id="preferred-sources-empty"
                icon={<StarIcon sx={{fontSize: 44}}/>}
                title={
                    query
                        ? t('libraryManagement.preferredSources.emptySearch', {query})
                        : t('libraryManagement.empty.preferredSources')
                }
            />
        );
    }

    return (
        <Stack
            spacing={2}
            id="preferred-sources-stack"
            data-component="preferred-sources-tab"
        >
            {filtered.map(({showId, origin, show, name}) => {
                const linksAvailable = countLinksForShow(showId);
                return (
                    <Box
                        key={showId}
                        className="holo-surface neon-edge"
                        data-component="preferred-source-card"
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
                                show?.poster_path
                                    ? `https://image.tmdb.org/t/p/w200${show.poster_path}`
                                    : '/placeholder.png'
                            }
                            alt={name}
                            sx={{width: 60, height: 90, objectFit: 'cover', borderRadius: 1}}
                        />
                        <Box sx={{flex: 1, minWidth: 200}}>
                            <Stack direction="row" spacing={1} alignItems="center"
                                   sx={{mb: 0.5, flexWrap: 'wrap', rowGap: 0.5}}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {name}
                                </Typography>
                                <HoloChip
                                    id={`preferred-${showId}-chip`}
                                    icon={<StarIcon/>}
                                    label={t('libraryManagement.tabs.preferredSources')}
                                />
                                <HoloChip
                                    id={`preferred-${showId}-links`}
                                    icon={<LinkIcon/>}
                                    label={t('libraryManagement.preferredSources.linksAvailable', {count: linksAvailable})}
                                />
                            </Stack>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                                <LanguageIcon sx={{fontSize: 16, color: 'var(--neon-accent)'}}/>
                                <Typography
                                    variant="body2"
                                    sx={{color: 'var(--text-secondary)', wordBreak: 'break-all'}}
                                >
                                    {origin}
                                </Typography>
                            </Box>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Tooltip title={t('libraryManagement.preferredSources.edit')}>
                                <Button
                                    id={`preferred-${showId}-edit`}
                                    aria-label={t('libraryManagement.preferredSources.editAria', {name})}
                                    onClick={() => mediaStore.openPreferredSourceEditModal(showId)}
                                    startIcon={<EditIcon/>}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        color: 'var(--neon-accent)',
                                        borderColor: 'rgba(76, 210, 255, 0.45)',
                                        '&:hover': {borderColor: 'var(--neon-accent)'},
                                    }}
                                >
                                    {t('libraryManagement.preferredSources.edit')}
                                </Button>
                            </Tooltip>
                            <Tooltip title={t('libraryManagement.remove')}>
                                <Button
                                    id={`preferred-${showId}-remove`}
                                    onClick={() => mediaStore.setPreferredSource(showId, null)}
                                    color="error"
                                    variant="outlined"
                                    size="small"
                                >
                                    {t('libraryManagement.remove')}
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Box>
                );
            })}
        </Stack>
    );
});

PreferredSourcesTab.displayName = 'PreferredSourcesTab';

export default PreferredSourcesTab;
export {PreferredSourcesTab};
