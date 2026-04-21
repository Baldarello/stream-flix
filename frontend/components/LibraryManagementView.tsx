import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../store/mediaStore.ts';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import FolderIcon from '@mui/icons-material/Folder';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';
import type {MediaItem, MediaLink} from '../types.ts';
import {useTranslations} from '../hooks/useTranslations.ts';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const {children, value, index, ...other} = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`library-tabpanel-${index}`}
            aria-labelledby={`library-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{pt: 3}}>{children}</Box>}
        </div>
    );
}

const LibraryManagementView: React.FC = observer(() => {
    const {t} = useTranslations();
    const activeTab = mediaStore.activeLibraryTab;
    const setActiveTab = (tab: number) => mediaStore.setActiveLibraryTab(tab);

    const [editingLink, setEditingLink] = useState<{ id: number; data: Partial<MediaLink> } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);

    // My List items with full details
    const myListItems = mediaStore.myListItems;
    const myListIds = mediaStore.myList;

    // Episode progress items
    const episodeProgressEntries = Array.from(mediaStore.episodeProgress.entries());
    const continueWatchingItems = mediaStore.continueWatchingItems;

    // Media links grouped by show
    const mediaLinksEntries = Array.from(mediaStore.mediaLinks.entries());

    // Preferred sources
    const preferredSourcesEntries = Array.from(mediaStore.preferredSources.entries());

    // Show filter preferences
    const filterPreferencesEntries = Array.from(mediaStore.showFilterPreferences.entries());

    // Intro durations
    const introDurationsEntries = Array.from(mediaStore.showIntroDurations.entries());

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        mediaStore.showSnackbar('notifications.copiedToClipboard', 'success', true);
    };

    const handleStartEditLink = (link: MediaLink) => {
        setEditingLink({
            id: link.id!,
            data: {
                url: link.url,
                label: link.label,
                language: link.language,
                type: link.type
            }
        });
    };

    const handleCancelEditLink = () => {
        setEditingLink(null);
    };

    const handleSaveEditLink = async () => {
        if (editingLink) {
            await mediaStore.updateMediaLink(editingLink.id, editingLink.data);
            setEditingLink(null);
        }
    };

    const handleDeleteLink = async (linkId: number) => {
        await mediaStore.deleteMediaLink(linkId);
        setDeleteConfirm(null);
    };

    const handleClearLinksForShow = async (showId: number) => {
        const show = mediaStore.cachedItems.get(showId);
        if (!show || !show.seasons) return;

        // Delete all links for this show's episodes
        for (const season of show.seasons) {
            for (const episode of season.episodes) {
                const links = mediaStore.mediaLinks.get(episode.id) || [];
                for (const link of links) {
                    if (link.id) {
                        await mediaStore.deleteMediaLink(link.id);
                    }
                }
            }
        }
        setDeleteConfirm(null);
    };

    const handleRemoveFromMyList = (itemId: number) => {
        const item = mediaStore.cachedItems.get(itemId);
        const name = item?.name || item?.title || itemId;
        setDeleteConfirm({type: 'myList', id: itemId, name});
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'myList') {
            mediaStore.toggleMyList({id: deleteConfirm.id} as MediaItem);
        } else if (deleteConfirm.type === 'link') {
            await handleDeleteLink(deleteConfirm.id);
        } else if (deleteConfirm.type === 'clearShowLinks') {
            await handleClearLinksForShow(deleteConfirm.id);
        } else if (deleteConfirm.type === 'episodeProgress') {
            await mediaStore.removeFromContinueWatching(deleteConfirm.id);
        } else if (deleteConfirm.type === 'deleteAllInvalid') {
            await mediaStore.deleteAllInvalidLinks();
        }
        setDeleteConfirm(null);
    };

    const handleMarkAsWatched = (episodeId: number) => {
        mediaStore.toggleEpisodeWatchedStatus(episodeId);
    };

    // Get show name for a given episode ID
    const getShowNameForEpisode = (episodeId: number): string => {
        for (const show of mediaStore.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    if (season.episodes.some(e => e.id === episodeId)) {
                        return show.name || show.title || 'Unknown';
                    }
                }
            }
        }
        return 'Unknown';
    };

    // Get episode info for a given episode ID
    const getEpisodeInfo = (episodeId: number): {
        show: string;
        season: number;
        episode: number;
        name: string
    } | null => {
        for (const show of mediaStore.cachedItems.values()) {
            if (show.seasons) {
                for (const season of show.seasons) {
                    const episode = season.episodes.find(e => e.id === episodeId);
                    if (episode) {
                        return {
                            show: show.name || show.title || 'Unknown',
                            season: season.season_number,
                            episode: episode.episode_number,
                            name: episode.name
                        };
                    }
                }
            }
        }
        return null;
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Box sx={{p: 3, maxWidth: 1400, mx: 'auto'}}>
            <Typography variant="h4" sx={{mb: 3, fontWeight: 700}}>
                {t('libraryManagement.title')}
            </Typography>

            <Paper sx={{mb: 3, bgcolor: 'background.paper'}}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {minWidth: 120}
                    }}
                >
                    <Tab icon={<VideoLibraryIcon/>} label={t('libraryManagement.tabs.myList')}/>
                    <Tab icon={<AccessTimeIcon/>} label={t('libraryManagement.tabs.continueWatching')}/>
                    <Tab icon={<LinkIcon/>} label={t('libraryManagement.tabs.links')}/>
                    <Tab icon={<StarIcon/>} label={t('libraryManagement.tabs.preferredSources')}/>
                </Tabs>
            </Paper>

            {/* My List Tab */}
            <TabPanel value={activeTab} index={0}>
                {myListItems.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 8}}>
                        <FolderIcon sx={{fontSize: 64, color: 'text.secondary', mb: 2}}/>
                        <Typography variant="h6" color="text.secondary">
                            {t('libraryManagement.empty.myList')}
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {myListItems.map(item => {
                            const linksCount = item.seasons
                                ? item.seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0)
                                : (item.video_urls?.length || 0);
                            return (
                                <Card key={item.id} sx={{display: 'flex', alignItems: 'center', p: 2, gap: 2}}>
                                    <Box
                                        component="img"
                                        src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '/placeholder.png'}
                                        alt={item.name || item.title}
                                        sx={{width: 80, height: 120, objectFit: 'cover', borderRadius: 1}}
                                    />
                                    <CardContent sx={{flex: 1, py: 1}}>
                                        <Typography variant="h6">{item.name || item.title}</Typography>
                                        <Stack direction="row" spacing={1} sx={{mt: 1}}>
                                            <Chip
                                                icon={item.media_type === 'tv' ? <TvIcon/> : <MovieIcon/>}
                                                label={item.media_type === 'tv' ? t('libraryManagement.type.series') : t('libraryManagement.type.movie')}
                                                size="small"
                                                variant="outlined"
                                            />
                                            <Chip
                                                icon={<LinkIcon/>}
                                                label={`${linksCount} ${t('libraryManagement.links')}`}
                                                size="small"
                                                color={linksCount > 0 ? 'primary' : 'default'}
                                                variant="outlined"
                                            />
                                        </Stack>
                                    </CardContent>
                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title={t('libraryManagement.removeFromMyList')}>
                                            <IconButton color="error" onClick={() => handleRemoveFromMyList(item.id)}>
                                                <DeleteIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </TabPanel>

            {/* Continue Watching Tab */}
            <TabPanel value={activeTab} index={1}>
                {continueWatchingItems.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 8}}>
                        <AccessTimeIcon sx={{fontSize: 64, color: 'text.secondary', mb: 2}}/>
                        <Typography variant="h6" color="text.secondary">
                            {t('libraryManagement.empty.continueWatching')}
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {continueWatchingItems.map(item => {
                            const progress = item.progress;
                            const epInfo = getEpisodeInfo(item.id);
                            const progressPercent = progress && progress.duration > 0
                                ? Math.round((progress.currentTime / progress.duration) * 100)
                                : 0;

                            return (
                                <Card key={`${item.show_id}-${item.id}`}
                                      sx={{display: 'flex', alignItems: 'center', p: 2, gap: 2}}>
                                    <Box
                                        component="img"
                                        src={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '/placeholder.png'}
                                        alt={item.name || item.title}
                                        sx={{width: 120, height: 68, objectFit: 'cover', borderRadius: 1}}
                                    />
                                    <CardContent sx={{flex: 1, py: 1}}>
                                        <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                                            {item.show_title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {epInfo ? `S${epInfo.season} E${epInfo.episode} - ${epInfo.name}` : item.name || item.title}
                                        </Typography>
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    height: 4,
                                                    bgcolor: 'grey.800',
                                                    borderRadius: 2,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: `${progressPercent}%`,
                                                        height: '100%',
                                                        bgcolor: 'primary.main'
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {progress ? formatDuration(progress.currentTime) : '0:00'} / {progress ? formatDuration(progress.duration) : '0:00'}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    <Stack direction="row" spacing={1}>
                                        <Tooltip
                                            title={progress?.watched ? t('detail.markAsUnwatched') : t('detail.markAsWatched')}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => handleMarkAsWatched(item.id)}
                                            >
                                                {progress?.watched ? t('libraryManagement.markUnwatched') : t('libraryManagement.markWatched')}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title={t('libraryManagement.removeFromContinue')}>
                                            <IconButton
                                                color="error"
                                                onClick={() => setDeleteConfirm({
                                                    type: 'episodeProgress',
                                                    id: item.id,
                                                    name: item.name || item.title
                                                })}
                                            >
                                                <DeleteIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </TabPanel>

            {/* Links Tab */}
            <TabPanel value={activeTab} index={2}>
                {mediaLinksEntries.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 8}}>
                        <LinkIcon sx={{fontSize: 64, color: 'text.secondary', mb: 2}}/>
                        <Typography variant="h6" color="text.secondary">
                            {t('libraryManagement.empty.links')}
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {/* Filters */}
                        <Paper sx={{p: 2}}>
                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
                                <FormControl size="small" sx={{minWidth: 200}}>
                                    <InputLabel id="links-filter-show-label">{t('libraryManagement.filters.allShows')}</InputLabel>
                                    <Select
                                        labelId="links-filter-show-label"
                                        value={mediaStore.linksFilterShowId || ''}
                                        label={t('libraryManagement.filters.allShows')}
                                        onChange={(e) => mediaStore.setLinksFilterShowId(e.target.value ? Number(e.target.value) : null)}
                                    >
                                        <MenuItem value="">
                                            <em>{t('libraryManagement.filters.allShows')}</em>
                                        </MenuItem>
                                        {mediaStore.showsWithLinks.map(show => (
                                            <MenuItem key={show.id} value={show.id}>
                                                {show.name || show.title}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                <FormControl size="small" sx={{minWidth: 150}}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <Switch
                                            checked={mediaStore.showOnlyInvalidLinks}
                                            onChange={(e) => mediaStore.setShowOnlyInvalidLinks(e.target.checked)}
                                            size="small"
                                        />
                                        <Typography variant="body2">
                                            {t('libraryManagement.filters.showOnlyInvalid')}
                                        </Typography>
                                    </Box>
                                </FormControl>
                                
                                {mediaStore.invalidLinkIds.size > 0 && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => setDeleteConfirm({
                                            type: 'deleteAllInvalid',
                                            id: 0,
                                            name: `${mediaStore.invalidLinkIds.size}`
                                        })}
                                    >
                                        {t('libraryManagement.filters.deleteAllInvalid')} ({mediaStore.invalidLinkIds.size})
                                    </Button>
                                )}
                                
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => mediaStore.validateAllLinks()}
                                    disabled={mediaStore.invalidLinksLoading}
                                >
                                    {mediaStore.invalidLinksLoading ? '...' : 'Valida Link'}
                                </Button>
                            </Stack>
                        </Paper>
                        
                        {/* Links List */}
                        {mediaLinksEntries
                            .filter(([mediaId, links]) => {
                                // Filter by show
                                if (mediaStore.linksFilterShowId !== null) {
                                    const epInfo = getEpisodeInfo(mediaId);
                                    if (epInfo) {
                                        // Find show for episode
                                        let found = false;
                                        for (const show of mediaStore.cachedItems.values()) {
                                            if (show.seasons) {
                                                for (const season of show.seasons) {
                                                    if (season.episodes.some(e => e.id === mediaId) && show.id === mediaStore.linksFilterShowId) {
                                                        found = true;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (found) break;
                                        }
                                        if (!found) return false;
                                    } else if (mediaId !== mediaStore.linksFilterShowId) {
                                        return false;
                                    }
                                }
                                // Filter by invalid
                                if (mediaStore.showOnlyInvalidLinks) {
                                    const hasInvalid = links.some(l => l.id && mediaStore.invalidLinkIds.has(l.id));
                                    return hasInvalid;
                                }
                                return true;
                            })
                            .map(([mediaId, links]) => {
                            if (links.length === 0) return null;
                            const epInfo = getEpisodeInfo(mediaId);
                            const showName = epInfo ? epInfo.show : getShowNameForEpisode(mediaId);
                            const isEpisode = !!epInfo;

                            return (
                                <Paper key={mediaId} sx={{p: 2}}>
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 2
                                    }}>
                                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                            <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                                                {isEpisode
                                                    ? `${showName} - S${epInfo!.season}E${epInfo!.episode}: ${epInfo!.name}`
                                                    : showName
                                                }
                                            </Typography>
                                            {links.some(l => l.id && mediaStore.invalidLinkIds.has(l.id)) && (
                                                <Tooltip title={t('libraryManagement.filters.invalidLink')}>
                                                    <WarningIcon color="error" fontSize="small" />
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Button
                                            color="error"
                                            size="small"
                                            onClick={() => setDeleteConfirm({
                                                type: 'clearShowLinks',
                                                id: isEpisode ? mediaId : mediaId,
                                                name: showName
                                            })}
                                        >
                                            {t('libraryManagement.clearAllLinks')}
                                        </Button>
                                    </Box>
                                    <Stack spacing={1}>
                                        {links.map(link => {
                                            const isEditing = editingLink?.id === link.id;
                                            const truncatedLabel = link.label.length > 30 ? `${link.label.substring(0, 30)}...` : link.label;

                                            return isEditing ? (
                                                <Paper key={link.id} variant="outlined"
                                                       sx={{p: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        label="URL"
                                                        value={editingLink.data.url || ''}
                                                        onChange={e => setEditingLink({
                                                            ...editingLink,
                                                            data: {...editingLink.data, url: e.target.value}
                                                        })}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        label={t('linkEpisodesModal.add.linkLabel')}
                                                        value={editingLink.data.label || ''}
                                                        onChange={e => setEditingLink({
                                                            ...editingLink,
                                                            data: {...editingLink.data, label: e.target.value}
                                                        })}
                                                    />
                                                    <Stack direction="row" spacing={2}>
                                                        <TextField
                                                            label={t('linkEpisodesModal.add.language')}
                                                            value={editingLink.data.language || ''}
                                                            onChange={e => setEditingLink({
                                                                ...editingLink,
                                                                data: {
                                                                    ...editingLink.data,
                                                                    language: e.target.value.toUpperCase()
                                                                }
                                                            })}
                                                            size="small"
                                                            sx={{width: 100}}
                                                            inputProps={{maxLength: 3}}
                                                        />
                                                        <Select
                                                            size="small"
                                                            value={editingLink.data.type || 'sub'}
                                                            onChange={e => setEditingLink({
                                                                ...editingLink,
                                                                data: {
                                                                    ...editingLink.data,
                                                                    type: e.target.value as 'sub' | 'dub'
                                                                }
                                                            })}
                                                            sx={{width: 120}}
                                                        >
                                                            <MenuItem
                                                                value="sub">{t('linkEpisodesModal.add.sub')}</MenuItem>
                                                            <MenuItem
                                                                value="dub">{t('linkEpisodesModal.add.dub')}</MenuItem>
                                                        </Select>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                                        <IconButton
                                                            onClick={handleCancelEditLink}><CancelIcon/></IconButton>
                                                        <IconButton onClick={handleSaveEditLink}
                                                                    color="primary"><SaveIcon/></IconButton>
                                                    </Stack>
                                                </Paper>
                                            ) : (
                                                <Paper
                                                    key={link.id}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: 1,
                                                        bgcolor: link.id && mediaStore.invalidLinkIds.has(link.id) ? 'error.dark' : 'inherit'
                                                    }}
                                                >
                                                    {link.id && mediaStore.invalidLinkIds.has(link.id) && (
                                                        <Tooltip title={t('libraryManagement.filters.invalidLink')}>
                                                            <WarningIcon color="error" fontSize="small" />
                                                        </Tooltip>
                                                    )}
                                                    <ListItemText
                                                        primary={truncatedLabel}
                                                        secondary={link.url}
                                                        secondaryTypographyProps={{
                                                            noWrap: true,
                                                            textOverflow: 'ellipsis',
                                                            overflow: 'hidden',
                                                            sx: {maxWidth: 300}
                                                        }}
                                                    />
                                                    <Chip label={link.language} size="small" variant="outlined"
                                                          sx={{minWidth: 60}}/>
                                                    <Chip
                                                        label={link.type === 'dub' ? t('libraryManagement.dub') : t('libraryManagement.sub')}
                                                        size="small"
                                                        color={link.type === 'dub' ? 'info' : 'primary'}
                                                        variant="outlined"
                                                        sx={{minWidth: 60}}
                                                    />
                                                    <Tooltip title={t('linkEpisodesModal.manage.copyUrl')}>
                                                        <IconButton size="small"
                                                                    onClick={() => handleCopy(link.url)}><ContentCopyIcon
                                                            fontSize="small"/></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('linkEpisodesModal.manage.editLink')}>
                                                        <IconButton size="small"
                                                                    onClick={() => handleStartEditLink(link)}><EditIcon
                                                            fontSize="small"/></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('linkEpisodesModal.manage.deleteLink')}>
                                                        <IconButton size="small" color="error"
                                                                    onClick={() => setDeleteConfirm({
                                                                        type: 'link',
                                                                        id: link.id!,
                                                                        name: link.label
                                                                    })}><DeleteIcon fontSize="small"/></IconButton>
                                                    </Tooltip>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </TabPanel>

            {/* Preferred Sources Tab */}
            <TabPanel value={activeTab} index={3}>
                {preferredSourcesEntries.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 8}}>
                        <StarIcon sx={{fontSize: 64, color: 'text.secondary', mb: 2}}/>
                        <Typography variant="h6" color="text.secondary">
                            {t('libraryManagement.empty.preferredSources')}
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {preferredSourcesEntries.map(([showId, origin]) => {
                            const show = mediaStore.cachedItems.get(showId);
                            return (
                                <Card key={showId} sx={{display: 'flex', alignItems: 'center', p: 2, gap: 2}}>
                                    <Box
                                        component="img"
                                        src={show?.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : '/placeholder.png'}
                                        alt={show?.name || show?.title}
                                        sx={{width: 60, height: 90, objectFit: 'cover', borderRadius: 1}}
                                    />
                                    <CardContent sx={{flex: 1, py: 1}}>
                                        <Typography
                                            variant="subtitle1">{show?.name || show?.title || `Show #${showId}`}</Typography>
                                        <Typography variant="body2" color="text.secondary"
                                                    sx={{wordBreak: 'break-all'}}>
                                            {origin}
                                        </Typography>
                                    </CardContent>
                                    <Button
                                        color="error"
                                        size="small"
                                        onClick={() => mediaStore.setPreferredSource(showId, origin)}
                                    >
                                        {t('libraryManagement.remove')}
                                    </Button>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </TabPanel>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
                <DialogTitle>
                    {deleteConfirm?.type === 'deleteAllInvalid' 
                        ? t('libraryManagement.confirmDeleteAllInvalid.title')
                        : t('libraryManagement.deleteConfirm.title')}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {deleteConfirm?.type === 'deleteAllInvalid'
                            ? t('libraryManagement.confirmDeleteAllInvalid.message', {count: deleteConfirm?.name || '0'})
                            : t('libraryManagement.deleteConfirm.message', {name: deleteConfirm?.name || ''})}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)}>{t('libraryManagement.cancel')}</Button>
                    <Button onClick={handleConfirmDelete} color="error">{t('libraryManagement.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

export default LibraryManagementView;