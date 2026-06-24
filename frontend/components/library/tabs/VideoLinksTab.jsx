/**
 * @fileoverview VideoLinksTab - "Link Video" tab content.
 *
 * The biggest tab in the library. Hosts:
 *  - the legacy filter bar (show dropdown, only-invalid switch,
 *    delete-all-invalid, validate-all)
 *  - the per-show link groups, each with a checkbox column, an
 *    "Info per show" expander, a list of link rows and the
 *    per-row Edit / Copy / Delete actions
 *  - a sticky `VideoLinksBulkBar` whenever at least one link is
 *    selected
 *  - the shared `EmptyState` when no link matches
 *
 * Cards are filtered by `mediaStore.librarySearchQuery`, the
 * show dropdown and the "only invalid" switch.
 */

import React, {useMemo, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import WarningIcon from '@mui/icons-material/Warning';

import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {EmptyState} from '../shared/EmptyState.jsx';
import {ShowInfoPanel} from './ShowInfoPanel.jsx';
import {VideoLinksBulkBar} from './VideoLinksBulkBar.jsx';

const matchesQuery = (link, query, epInfo) => {
    if (!query) return true;
    const haystack = `${epInfo?.show || ''} ${epInfo?.name || ''} ${link.label || ''} ${link.url || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
};

const VideoLinksTab = observer(() => {
    const {t} = useTranslations();
    const [expandedShowId, setExpandedShowId] = useState(null);

    const query = mediaStore.librarySearchQuery;
    const showFilterId = mediaStore.linksFilterShowId;
    const onlyInvalid = mediaStore.showOnlyInvalidLinks;

    // Build a map<mediaId, {showId, showName, season, episode, name}> for
    // fast lookups during filtering and rendering.
    const episodeContext = useMemo(() => {
        const map = new Map();
        for (const show of mediaStore.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    for (const ep of season.episodes) {
                        map.set(ep.id, {
                            showId: show.id,
                            showName: show.name || show.title || 'Unknown',
                            season: season.season_number,
                            episode: ep.episode_number,
                            name: ep.name,
                        });
                    }
                }
            }
        }
        return map;
    }, [mediaStore.cachedItems.size, mediaStore.mediaLinks.size]);

    const filtered = Array.from(mediaStore.mediaLinks.entries())
        .filter(([mediaId, links]) => {
            if (!links || links.length === 0) return false;
            const epInfo = episodeContext.get(mediaId);
            // Show dropdown
            if (showFilterId != null) {
                if (epInfo) {
                    if (epInfo.showId !== showFilterId) return false;
                } else if (mediaId !== showFilterId) {
                    return false;
                }
            }
            // Only invalid
            if (onlyInvalid) {
                const hasInvalid = links.some((l) => l.id && mediaStore.invalidLinkIds.has(l.id));
                if (!hasInvalid) return false;
            }
            // Search
            if (query) {
                const matches = links.some((l) => matchesQuery(l, query, epInfo));
                if (!matches) return false;
            }
            return true;
        })
        .map(([mediaId, links]) => {
            const epInfo = episodeContext.get(mediaId) || null;
            const showId = epInfo?.showId ?? mediaId;
            const totalLinks = links.length;
            const invalidCount = links.filter((l) => l.id && mediaStore.invalidLinkIds.has(l.id)).length;
            const episodeCount = epInfo
                ? 1
                : 0;
            return {mediaId, showId, epInfo, links, totalLinks, invalidCount, episodeCount};
        });

    // Group by show for the per-show expander section.
    const groupedByShow = useMemo(() => {
        const groups = new Map();
        for (const item of filtered) {
            if (!groups.has(item.showId)) {
                groups.set(item.showId, {
                    showId: item.showId,
                    showName: item.epInfo?.showName || mediaStore.cachedItems.get(item.showId)?.name ||
                        mediaStore.cachedItems.get(item.showId)?.title || `Show #${item.showId}`,
                    items: [],
                });
            }
            groups.get(item.showId).items.push(item);
        }
        return Array.from(groups.values());
    }, [filtered, episodeContext, mediaStore.cachedItems.size]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        mediaStore.showSnackbar('notifications.copiedToClipboard', 'success', true);
    };

    const handleDeleteAllInvalid = () => {
        if (mediaStore.invalidLinkIds.size === 0) return;
        mediaStore.deleteAllInvalidLinks();
    };

    const showFilterEntries = groupedByShow;

    if (filtered.length === 0) {
        const hasQuery = !!query;
        return (
            <EmptyState
                id="video-links-empty"
                icon={<LinkIcon sx={{fontSize: 44}}/>}
                title={
                    hasQuery
                        ? t('libraryManagement.videoLinks.emptySearch', {query})
                        : t('libraryManagement.empty.links')
                }
            />
        );
    }

    return (
        <>
            <Stack spacing={2} id="video-links-stack" data-component="video-links-tab">
                {/* Filter bar */}
                <Paper
                    id="video-links-filter-bar"
                    className="holo-surface"
                    sx={{
                        p: 2,
                        borderRadius: '12px',
                        border: '1px solid rgba(76, 210, 255, 0.18)',
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        flexWrap="wrap"
                        rowGap={1.5}
                    >
                        <FormControl size="small" sx={{minWidth: 200}}>
                            <InputLabel id="video-links-filter-show-label">
                                {t('libraryManagement.filters.allShows')}
                            </InputLabel>
                            <Select
                                labelId="video-links-filter-show-label"
                                value={mediaStore.linksFilterShowId || ''}
                                label={t('libraryManagement.filters.allShows')}
                                onChange={(e) =>
                                    mediaStore.setLinksFilterShowId(
                                        e.target.value ? Number(e.target.value) : null
                                    )
                                }
                            >
                                <MenuItem value="">
                                    <em>{t('libraryManagement.filters.allShows')}</em>
                                </MenuItem>
                                {mediaStore.showsWithLinks.map((show) => (
                                    <MenuItem key={show.id} value={show.id}>
                                        {show.name || show.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                            <Switch
                                id="video-links-only-invalid"
                                checked={mediaStore.showOnlyInvalidLinks}
                                onChange={(e) => mediaStore.setShowOnlyInvalidLinks(e.target.checked)}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {color: 'var(--neon-accent)'},
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {backgroundColor: 'var(--neon-accent)'},
                                }}
                            />
                            <Typography variant="body2" sx={{color: 'var(--text-secondary)'}}>
                                {t('libraryManagement.filters.showOnlyInvalid')}
                            </Typography>
                        </Box>

                        {mediaStore.invalidLinkIds.size > 0 && (
                            <Button
                                id="video-links-delete-all-invalid"
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<DeleteIcon/>}
                                onClick={handleDeleteAllInvalid}
                            >
                                {t('libraryManagement.filters.deleteAllInvalid')} ({mediaStore.invalidLinkIds.size})
                            </Button>
                        )}

                        <Button
                            id="video-links-validate-all"
                            variant="outlined"
                            size="small"
                            onClick={() => mediaStore.validateAllLinks()}
                            disabled={mediaStore.invalidLinksLoading}
                            sx={{
                                color: 'var(--neon-accent)',
                                borderColor: 'rgba(76, 210, 255, 0.45)',
                                '&:hover': {borderColor: 'var(--neon-accent)'},
                            }}
                        >
                            {mediaStore.invalidLinksLoading
                                ? '...'
                                : t('libraryManagement.filters.invalidLink').includes('scadut')
                                    ? 'Valida link'
                                    : 'Validate links'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Per-show groups */}
                {showFilterEntries.map((group) => {
                    const showTotalEpisodes = (() => {
                        const show = mediaStore.cachedItems.get(group.showId);
                        if (!show?.seasons) return 0;
                        return show.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);
                    })();
                    const showTotalLinks = group.items.reduce((acc, i) => acc + i.totalLinks, 0);
                    const showInvalid = group.items.reduce((acc, i) => acc + i.invalidCount, 0);
                    const isExpanded = expandedShowId === group.showId;

                    return (
                        <Paper
                            key={group.showId}
                            className="holo-surface neon-edge"
                            data-component="video-links-show-card"
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                <IconButton
                                    id={`video-links-expand-${group.showId}`}
                                    onClick={() => setExpandedShowId(isExpanded ? null : group.showId)}
                                    aria-expanded={isExpanded}
                                    sx={{
                                        color: 'var(--neon-accent)',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 200ms ease',
                                    }}
                                    size="small"
                                >
                                    <ExpandMoreIcon/>
                                </IconButton>
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        flex: 1,
                                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {group.showName}
                                </Typography>
                                {showInvalid > 0 && (
                                    <Tooltip title={t('libraryManagement.filters.invalidLink')}>
                                        <WarningIcon color="error" fontSize="small"/>
                                    </Tooltip>
                                )}
                            </Box>

                            <ShowInfoPanel
                                showId={group.showId}
                                episodeCount={showTotalEpisodes}
                                totalLinks={showTotalLinks}
                                invalidLinks={showInvalid}
                                expanded={isExpanded}
                            />

                            <Stack spacing={1}>
                                {group.items.map((item) => {
                                    const epLabel = item.epInfo
                                        ? `S${item.epInfo.season}E${item.epInfo.episode} - ${item.epInfo.name}`
                                        : '';
                                    return (
                                        <Box key={item.mediaId}>
                                            {epLabel && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'var(--text-secondary)',
                                                        pl: 1,
                                                        display: 'block',
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    {epLabel}
                                                </Typography>
                                            )}
                                            {item.links
                                                .filter((link) => !onlyInvalid || (link.id && mediaStore.invalidLinkIds.has(link.id)))
                                                .map((link) => {
                                                    const isSelected = link.id != null && mediaStore.librarySelectedLinkIds.has(link.id);
                                                    const isInvalid = link.id && mediaStore.invalidLinkIds.has(link.id);
                                                    return (
                                                        <Box
                                                            key={link.id}
                                                            className="holo-surface"
                                                            data-component="video-links-link-row"
                                                            sx={{
                                                                p: 1,
                                                                mb: 0.5,
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                border: isSelected
                                                                    ? '1px solid var(--neon-accent)'
                                                                    : isInvalid
                                                                        ? '1px solid var(--neon-accent-hot)'
                                                                        : '1px solid rgba(76, 210, 255, 0.18)',
                                                                background: isInvalid ? 'rgba(255, 90, 90, 0.08)' : undefined,
                                                            }}
                                                        >
                                                            <Checkbox
                                                                id={`video-links-checkbox-${link.id}`}
                                                                size="small"
                                                                checked={isSelected}
                                                                onChange={() => mediaStore.toggleLinkSelection(link.id)}
                                                            />
                                                            {isInvalid && (
                                                                <Tooltip
                                                                    title={t('libraryManagement.filters.invalidLink')}>
                                                                    <WarningIcon color="error" fontSize="small"/>
                                                                </Tooltip>
                                                            )}
                                                            <Box sx={{flex: 1, minWidth: 0}}>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: 'var(--text-primary)',
                                                                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                                                    }}
                                                                    noWrap
                                                                >
                                                                    {link.label}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: 'var(--text-secondary)',
                                                                        display: 'block',
                                                                        maxWidth: '100%',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                >
                                                                    {link.url}
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                label={link.language}
                                                                size="small"
                                                                sx={{
                                                                    color: 'var(--neon-accent)',
                                                                    borderColor: 'rgba(76, 210, 255, 0.45)',
                                                                }}
                                                                variant="outlined"
                                                            />
                                                            <Chip
                                                                label={link.type === 'dub' ? t('libraryManagement.dub') : t('libraryManagement.sub')}
                                                                size="small"
                                                                sx={{
                                                                    color: link.type === 'dub' ? 'var(--neon-accent-hot)' : 'var(--neon-accent)',
                                                                    borderColor: 'rgba(76, 210, 255, 0.45)',
                                                                }}
                                                                variant="outlined"
                                                            />
                                                            <Tooltip title={t('libraryManagement.common.copyUrl')}>
                                                                <IconButton
                                                                    id={`video-links-copy-${link.id}`}
                                                                    size="small"
                                                                    onClick={() => handleCopy(link.url)}
                                                                    sx={{color: 'var(--neon-accent)'}}
                                                                >
                                                                    <ContentCopyIcon fontSize="small"/>
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title={t('libraryManagement.common.editLink')}>
                                                                <IconButton
                                                                    id={`video-links-edit-${link.id}`}
                                                                    size="small"
                                                                    onClick={() => mediaStore.openLinkEditModal(link.id)}
                                                                    sx={{color: 'var(--neon-accent)'}}
                                                                >
                                                                    <EditIcon fontSize="small"/>
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title={t('libraryManagement.common.delete')}>
                                                                <IconButton
                                                                    id={`video-links-delete-${link.id}`}
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => mediaStore.deleteMediaLink(link.id)}
                                                                >
                                                                    <DeleteIcon fontSize="small"/>
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    );
                                                })}
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>
            <VideoLinksBulkBar/>
        </>
    );
});

VideoLinksTab.displayName = 'VideoLinksTab';

export default VideoLinksTab;
export {VideoLinksTab};

// Internal helpers exposed for tests.
export const __test__ = {matchesQuery};
