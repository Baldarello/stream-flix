import React, {useEffect, useMemo, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import SyncIcon from '@mui/icons-material/Sync';
import {mediaStore} from '../store/mediaStore.ts';
import {websocketService} from '../services/websocketService';
import type {MediaItem} from '../types.ts';

interface MediaSyncItem {
    id: number;
    title: string;
    name?: string;
    media_type: 'movie' | 'tv';
    poster_path: string;
    selected: boolean;
}

interface MediaSyncModalProps {
    open: boolean;
    onClose: () => void;
    slaveId: string;
}

const MediaSyncModal: React.FC<MediaSyncModalProps> = observer(({open, onClose, slaveId}) => {
    const [mediaItems, setMediaItems] = useState<MediaSyncItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
    const [syncComplete, setSyncComplete] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Load available media from the library
    useEffect(() => {
        if (open) {
            loadAvailableMedia();
        }
    }, [open]);

    // Listen for sync progress updates
    useEffect(() => {
        const handleSyncProgress = (message: any) => {
            if (message.type === 'quix-sync-progress-update') {
                setSyncProgress({
                    current: message.payload.completed,
                    total: message.payload.total,
                });
            } else if (message.type === 'quix-sync-completed') {
                setSyncProgress(null);
                setSyncComplete(true);
            } else if (message.type === 'quix-sync-error') {
                setSyncProgress(null);
                setSyncError(message.payload.error || 'Sync failed');
            }
        };

        websocketService.events.on('message', handleSyncProgress);
        return () => {
            websocketService.events.off('message', handleSyncProgress);
        };
    }, []);

    const loadAvailableMedia = async () => {
        setIsLoading(true);
        setSyncComplete(false);
        setSyncError(null);

        try {
            const {db} = await import('../services/db.ts');

            // 1. Load IDs from db.myList
            const listItems = await db.myList.toArray();
            const ids = listItems.map((item: { id: number }) => item.id);

            // 2. Fetch full MediaItem objects from db.cachedItems
            const cachedItems: MediaItem[] = await db.cachedItems.where('id').anyOf(ids).toArray();

            // 3. Filter to only items that have at least one configured link
            const itemsWithLinks: MediaSyncItem[] = [];

            for (const item of cachedItems) {
                let hasLink = false;

                if (item.media_type === 'movie') {
                    // Check in-memory store first
                    if (mediaStore.mediaLinks.size > 0) {
                        hasLink = mediaStore.mediaLinks.has(item.id);
                    } else {
                        // Fall back to DB check
                        const count = await db.mediaLinks.where('mediaId').equals(item.id).count();
                        hasLink = count > 0;
                    }
                } else if (item.media_type === 'tv') {
                    // Check if any episode in any season has a link
                    if (item.seasons && item.seasons.length > 0) {
                        outer: for (const season of item.seasons) {
                            for (const episode of season.episodes) {
                                if (mediaStore.mediaLinks.size > 0) {
                                    if (mediaStore.mediaLinks.has(episode.id)) {
                                        hasLink = true;
                                        break outer;
                                    }
                                } else {
                                    // Fall back to DB check
                                    const count = await db.mediaLinks.where('mediaId').equals(episode.id).count();
                                    if (count > 0) {
                                        hasLink = true;
                                        break outer;
                                    }
                                }
                            }
                        }
                    }
                }

                if (hasLink) {
                    itemsWithLinks.push({
                        id: item.id,
                        title: item.title || item.name || 'Unknown',
                        name: item.name,
                        media_type: item.media_type,
                        poster_path: item.poster_path || '',
                        selected: false,
                    });
                }
            }

            setMediaItems(itemsWithLinks);
        } catch (error) {
            console.error('Error loading media:', error);
            setSyncError('Failed to load media library');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMediaItems(prev => prev.map(item => ({...item, selected: event.target.checked})));
    };

    const handleItemToggle = (id: number) => {
        setMediaItems(prev => prev.map(item =>
            item.id === id ? {...item, selected: !item.selected} : item
        ));
    };

    const selectedItems = useMemo(() => mediaItems.filter(item => item.selected), [mediaItems]);

    const handleStartSync = async () => {
        if (selectedItems.length === 0) return;

        setSyncProgress({current: 0, total: selectedItems.length});
        setSyncComplete(false);
        setSyncError(null);

        const {db} = await import('../services/db.ts');

        // Build the full payload: for each selected item, include the MediaItem + all its links
        const itemsWithLinks = await Promise.all(
            selectedItems.map(async (item) => {
                // Get the full cached MediaItem
                const fullItem = await db.cachedItems.get(item.id);

                // Get all links for this item
                let links: any[] = [];
                if (item.media_type === 'movie') {
                    links = await db.mediaLinks.where('mediaId').equals(item.id).toArray();
                } else {
                    // For TV shows, get links for all episodes
                    if (fullItem?.seasons) {
                        for (const season of fullItem.seasons) {
                            for (const episode of season.episodes) {
                                const epLinks = await db.mediaLinks.where('mediaId').equals(episode.id).toArray();
                                links.push(...epLinks);
                            }
                        }
                    }
                }

                return {
                    mediaItem: fullItem || item,
                    links,
                };
            })
        );

        // Send sync request to the slave via WebSocket
        websocketService.sendMessage({
            type: 'quix-sync-media-request',
            payload: {
                slaveId: slaveId,
                mediaItems: itemsWithLinks,
            },
        });
    };

    const handleClose = () => {
        if (!syncProgress) {
            onClose();
        }
    };

    const getMediaTypeIcon = (type: 'movie' | 'tv') => {
        return type === 'movie' ? <MovieIcon/> : <TvIcon/>;
    };

    const getMediaTypeLabel = (type: 'movie' | 'tv'): string => {
        return type === 'movie' ? 'Film' : 'Serie TV';
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <CloudSyncIcon color="primary"/>
                    <Typography variant="h6" fontWeight="bold">
                        Sincronizza Contenuti con TV
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} disabled={!!syncProgress}>
                    <CloseIcon/>
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {syncComplete ? (
                    <Fade in>
                        <Box sx={{textAlign: 'center', py: 4}}>
                            <CheckCircleIcon sx={{fontSize: 80, color: 'success.main', mb: 2}}/>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                Sincronizzazione Completata!
                            </Typography>
                            <Typography color="text.secondary">
                                {selectedItems.length} contenuti sono ora disponibili sulla TV
                            </Typography>
                            <Typography color="text.secondary" sx={{mt: 1}}>
                                Puoi riprodurli anche senza connessione
                            </Typography>
                        </Box>
                    </Fade>
                ) : syncProgress ? (
                    <Box sx={{py: 4}}>
                        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3}}>
                            <SyncIcon sx={{fontSize: 40, color: 'primary.main', animation: 'spin 1s linear infinite'}}
                                      onAnimationStart={() => {
                                          const style = document.createElement('style');
                                          style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
                                          document.head.appendChild(style);
                                      }}
                            />
                            <Typography variant="h6">
                                Sincronizzazione in corso...
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={(syncProgress.current / syncProgress.total) * 100}
                            sx={{height: 10, borderRadius: 5, mb: 2}}
                        />
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            {syncProgress.current} di {syncProgress.total} contenuti trasferiti
                        </Typography>
                    </Box>
                ) : isLoading ? (
                    <Box sx={{textAlign: 'center', py: 4}}>
                        <Typography color="text.secondary">Caricamento contenuti...</Typography>
                    </Box>
                ) : syncError ? (
                    <Alert severity="error" sx={{mb: 2}}>
                        {syncError}
                    </Alert>
                ) : (
                    <>
                        <Box sx={{mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={selectedItems.length === mediaItems.length && mediaItems.length > 0}
                                        indeterminate={selectedItems.length > 0 && selectedItems.length < mediaItems.length}
                                        onChange={handleSelectAll}
                                    />
                                }
                                label="Seleziona tutti"
                            />
                            <Box sx={{textAlign: 'right'}}>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedItems.length} selezionati
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{
                            maxHeight: 400,
                            overflowY: 'auto',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: 2,
                            p: 1,
                        }}>
                            {mediaItems.map(item => (
                                <Card
                                    key={item.id}
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        border: item.selected ? '2px solid' : '2px solid transparent',
                                        borderColor: item.selected ? 'primary.main' : 'transparent',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4,
                                        },
                                    }}
                                    onClick={() => handleItemToggle(item.id)}
                                >
                                    <CardMedia
                                        component="img"
                                        height="140"
                                        image={item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '/placeholder.png'}
                                        alt={item.title}
                                        sx={{objectFit: 'cover'}}
                                    />
                                    <CardContent sx={{p: 1, '&:last-child': {pb: 1}}}>
                                        <Typography variant="body2" noWrap fontWeight="bold">
                                            {item.title}
                                        </Typography>
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mt: 0.5
                                        }}>
                                            <Chip
                                                icon={getMediaTypeIcon(item.media_type)}
                                                label={getMediaTypeLabel(item.media_type)}
                                                size="small"
                                                sx={{height: 20, fontSize: '0.7rem'}}
                                            />
                                        </Box>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={item.selected}
                                                    onChange={() => handleItemToggle(item.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    size="small"
                                                />
                                            }
                                            label=""
                                            sx={{m: 0, p: 0}}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>

                        {mediaItems.length === 0 && (
                            <Box sx={{textAlign: 'center', py: 4}}>
                                <Typography color="text.secondary">
                                    Nessun contenuto disponibile nella libreria
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>

            {!syncComplete && !syncProgress && (
                <DialogActions sx={{p: 2, gap: 1}}>
                    <Button onClick={handleClose} variant="outlined">
                        Annulla
                    </Button>
                    <Button
                        onClick={handleStartSync}
                        variant="contained"
                        disabled={selectedItems.length === 0}
                        startIcon={<CloudSyncIcon/>}
                    >
                        Sync ({selectedItems.length})
                    </Button>
                </DialogActions>
            )}

            {syncComplete && (
                <DialogActions sx={{p: 2, gap: 1}}>
                    <Button onClick={handleClose} variant="contained" fullWidth>
                        Chiudi
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
});

export default MediaSyncModal;
