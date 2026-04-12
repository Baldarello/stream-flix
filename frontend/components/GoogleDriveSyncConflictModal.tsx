import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

interface ShowMergeChoice {
    id: number;
    title: string;
    mediaType: 'movie' | 'tv';
    myListAction: 'local' | 'remote' | 'both' | 'none';
    linksAction: 'local' | 'remote' | 'both';
    progressAction: 'local' | 'remote' | 'both';
    deleteShow: boolean;
    localLinkCount: number;
    remoteLinkCount: number;
    localProgressCount: number;
    remoteProgressCount: number;
}

interface GoogleDriveSyncConflictModalProps {
    open: boolean;
    onClose: () => void;
    conflictData: {
        myList: { local: number[]; remote: number[] };
        shows: Map<number, { local: any; remote: any }>;
        mediaLinks: { local: any[]; remote: any[] };
        episodeProgress: { local: any[]; remote: any[] };
    } | null;
    onMerge: (choices: ShowMergeChoice[], deletedIds: number[]) => void;
    onOverwriteLocal: () => void;
    onOverwriteRemote: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

const GoogleDriveSyncConflictModal: React.FC<GoogleDriveSyncConflictModalProps> = observer(({
    open,
    onClose,
    conflictData,
    onMerge,
    onOverwriteLocal,
    onOverwriteRemote,
    onCancel,
    isProcessing = false,
}) => {
    const [step, setStep] = useState<'overview' | 'choose'>('overview');
    const [choices, setChoices] = useState<ShowMergeChoice[]>([]);

    // Build show choices from conflict data
    const showChoices = useMemo((): ShowMergeChoice[] => {
        if (!conflictData) return [];

        const result: ShowMergeChoice[] = [];
        const allIds = new Set<number>();

        // Collect all show IDs from myList
        conflictData.myList.local.forEach(id => allIds.add(id));
        conflictData.myList.remote.forEach(id => allIds.add(id));

        // Also collect from shows map
        if (conflictData.shows) {
            conflictData.shows.forEach((_, id) => allIds.add(id));
        }

        allIds.forEach(id => {
            const localInList = conflictData.myList.local.includes(id);
            const remoteInList = conflictData.myList.remote.includes(id);
            const localShow = conflictData.shows?.get(id)?.local;
            const remoteShow = conflictData.shows?.get(id)?.remote;

            const localLinks = conflictData.mediaLinks.local.filter(l => {
                if (localShow?.seasons) {
                    return localShow.seasons.some(s => s.episodes.some(e => e.id === l.mediaId));
                }
                return l.mediaId === id;
            });
            const remoteLinks = conflictData.mediaLinks.remote.filter(l => {
                if (remoteShow?.seasons) {
                    return remoteShow.seasons.some(s => s.episodes.some(e => e.id === l.mediaId));
                }
                return l.mediaId === id;
            });

            const localProgress = conflictData.episodeProgress.local.filter(p => {
                if (!localShow?.seasons) return false;
                return localShow.seasons.some(s => s.episodes.some(e => e.id === p.episodeId));
            });
            const remoteProgress = conflictData.episodeProgress.remote.filter(p => {
                if (!remoteShow?.seasons) return false;
                return remoteShow.seasons.some(s => s.episodes.some(e => e.id === p.episodeId));
            });

            // Determine default myList action
            let myListAction: 'local' | 'remote' | 'both' | 'none' = 'none';
            if (localInList && remoteInList) myListAction = 'both';
            else if (localInList) myListAction = 'local';
            else if (remoteInList) myListAction = 'remote';

            // Default links action
            let linksAction: 'local' | 'remote' | 'both' = 'both';
            if (localLinks.length > 0 && remoteLinks.length === 0) linksAction = 'local';
            else if (remoteLinks.length > 0 && localLinks.length === 0) linksAction = 'remote';

            // Default progress action
            let progressAction: 'local' | 'remote' | 'both' = 'both';
            if (localProgress.length > 0 && remoteProgress.length === 0) progressAction = 'local';
            else if (remoteProgress.length > 0 && localProgress.length === 0) progressAction = 'remote';

            result.push({
                id: Number(id),
                title: localShow?.name || localShow?.title || remoteShow?.name || remoteShow?.title || `Show #${id}`,
                mediaType: localShow?.media_type || remoteShow?.media_type || 'tv',
                myListAction,
                linksAction,
                progressAction,
                deleteShow: false,
                localLinkCount: localLinks.length,
                remoteLinkCount: remoteLinks.length,
                localProgressCount: localProgress.length,
                remoteProgressCount: remoteProgress.length,
            });
        });

        return result.sort((a, b) => {
            const aHasConflict = a.myListAction === 'both' || a.linksAction === 'both' || a.progressAction === 'both';
            const bHasConflict = b.myListAction === 'both' || b.linksAction === 'both' || b.progressAction === 'both';
            if (aHasConflict && !bHasConflict) return -1;
            if (!aHasConflict && bHasConflict) return 1;
            return a.title.localeCompare(b.title);
        });
    }, [conflictData]);

    // Stats
    const stats = useMemo(() => {
        if (!showChoices.length) return { total: 0, withConflicts: 0, localOnly: 0, remoteOnly: 0, toDelete: 0 };

        const withConflicts = showChoices.filter(s =>
            s.myListAction === 'both' || s.linksAction === 'both' || s.progressAction === 'both'
        ).length;
        const localOnly = showChoices.filter(s =>
            s.myListAction === 'local' && s.linksAction === 'local' && s.progressAction === 'local'
        ).length;
        const remoteOnly = showChoices.filter(s =>
            s.myListAction === 'remote' && s.linksAction === 'remote' && s.progressAction === 'remote'
        ).length;
        const toDelete = showChoices.filter(s => s.deleteShow).length;

        return { total: showChoices.length, withConflicts, localOnly, remoteOnly, toDelete };
    }, [showChoices]);

    // Initialize choices when opening the choose step
    const initializeChoices = () => {
        setChoices(showChoices.map(s => ({ ...s })));
    };

    const updateChoice = (id: number, field: keyof Omit<ShowMergeChoice, 'id' | 'title' | 'mediaType' | 'localLinkCount' | 'remoteLinkCount' | 'localProgressCount' | 'remoteProgressCount'>, value: any) => {
        setChoices(prev => prev.map(c => {
            if (c.id === id) {
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    const toggleDeleteShow = (id: number) => {
        setChoices(prev => prev.map(c => {
            if (c.id === id) {
                return { ...c, deleteShow: !c.deleteShow };
            }
            return c;
        }));
    };

    const handleTakeAllLocal = () => {
        setChoices(showChoices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'local' || s.myListAction === 'both' ? 'local' : 'none',
            linksAction: 'local',
            progressAction: 'local',
        })));
    };

    const handleTakeAllRemote = () => {
        setChoices(showChoices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'remote' || s.myListAction === 'both' ? 'remote' : 'none',
            linksAction: 'remote',
            progressAction: 'remote',
        })));
    };

    const handleTakeAllBoth = () => {
        setChoices(showChoices.map(s => ({
            ...s,
            myListAction: s.myListAction === 'none' ? 'none' : 'both',
            linksAction: 'both',
            progressAction: 'both',
        })));
    };

    const handleMarkLocalOnlyForDeletion = () => {
        setChoices(showChoices.map(s => {
            const isLocalOnly = s.myListAction === 'local' && s.linksAction === 'local' && s.progressAction === 'local';
            return { ...s, deleteShow: isLocalOnly };
        }));
    };

    const handleMarkRemoteOnlyForDeletion = () => {
        setChoices(showChoices.map(s => {
            const isRemoteOnly = s.myListAction === 'remote' && s.linksAction === 'remote' && s.progressAction === 'remote';
            return { ...s, deleteShow: isRemoteOnly };
        }));
    };

    const getMediaTypeIcon = (type: 'movie' | 'tv') => {
        return type === 'movie' ? <MovieIcon fontSize="small" /> : <TvIcon fontSize="small" />;
    };

    const renderOverviewStep = () => (
        <>
            <Alert severity="info" sx={{ mb: 2 }}>
                Sono state trovate differenze tra i dati locali e quelli nel cloud.
                Clicca "Continua" per scegliere cosa prendere da dove per ogni show,
                oppure usa una delle azioni rapide qui sotto.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Button variant="outlined" size="small" onClick={handleTakeAllLocal}>
                    Prendi tutto da Locale
                </Button>
                <Button variant="outlined" size="small" onClick={handleTakeAllRemote}>
                    Prendi tutto da Remoto
                </Button>
                <Button variant="outlined" size="small" onClick={handleTakeAllBoth}>
                    Prendi da entrambi
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`Totale: ${stats.total}`} />
                <Chip label={`Con conflitti: ${stats.withConflicts}`} color="warning" />
                <Chip label={`Solo locale: ${stats.localOnly}`} color="success" />
                <Chip label={`Solo remoto: ${stats.remoteOnly}`} color="info" />
                {stats.toDelete > 0 && <Chip label={`Da eliminare: ${stats.toDelete}`} color="error" />}
            </Box>

            <List sx={{ maxHeight: 350, overflowY: 'auto' }}>
                {showChoices.map(choice => {
                    const hasMyListConflict = choice.myListAction === 'both';
                    const hasLinksConflict = choice.linksAction === 'both';
                    const hasProgressConflict = choice.progressAction === 'both';
                    const hasAnyConflict = hasMyListConflict || hasLinksConflict || hasProgressConflict;

                    return (
                        <ListItem key={String(choice.id)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                {getMediaTypeIcon(choice.mediaType)}
                                <Typography sx={{ flex: 1 }}>{String(choice.title)}</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {hasMyListConflict && <Chip size="small" label="My List" color="warning" sx={{ height: 20 }} />}
                                    {hasLinksConflict && <Chip size="small" label="Links" color="warning" sx={{ height: 20 }} />}
                                    {hasProgressConflict && <Chip size="small" label="Progress" color="warning" sx={{ height: 20 }} />}
                                    {!hasAnyConflict && (
                                        <Chip size="small" label="Nessun conflitto" color="success" sx={{ height: 20 }} />
                                    )}
                                </Box>
                            </Box>
                        </ListItem>
                    );
                })}
            </List>
        </>
    );

    const renderChoiceRow = (choice: ShowMergeChoice) => (
        <ListItem
            key={String(choice.id)}
            sx={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                flexDirection: 'column',
                alignItems: 'stretch',
                py: 2,
                bgcolor: choice.deleteShow ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                transition: 'background-color 0.2s',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getMediaTypeIcon(choice.mediaType)}
                    <Typography variant="body1" fontWeight="bold">
                        {String(choice.title)}
                    </Typography>
                    {choice.deleteShow && (
                        <Chip size="small" label="ELIMINATO" color="error" sx={{ height: 20 }} />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        ID: {String(choice.id)}
                    </Typography>
                    <Checkbox
                        checked={choice.deleteShow}
                        onChange={() => toggleDeleteShow(choice.id)}
                        size="small"
                        color="error"
                        icon={<DeleteIcon />}
                        checkedIcon={<DeleteSweepIcon />}
                    />
                </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {/* My List */}
                <Card variant="outlined" sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            La mia lista
                        </Typography>
                        <Select
                            size="small"
                            fullWidth
                            value={String(choice.myListAction)}
                            onChange={(e) => updateChoice(choice.id, 'myListAction', e.target.value)}
                            disabled={choice.deleteShow}
                        >
                            <MenuItem value="local">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip size="small" label="Locale" color="success" sx={{ height: 18 }} />
                                </Box>
                            </MenuItem>
                            <MenuItem value="remote">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip size="small" label="Remoto" color="info" sx={{ height: 18 }} />
                                </Box>
                            </MenuItem>
                            {choice.myListAction === 'both' && (
                                <MenuItem value="both">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip size="small" label="Entrambi" color="primary" sx={{ height: 18 }} />
                                    </Box>
                                </MenuItem>
                            )}
                        </Select>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                            {choice.myListAction === 'none' ? 'Non incluso' :
                                choice.myListAction === 'both' ? 'In entrambi' :
                                    choice.myListAction === 'local' ? 'Solo locale' : 'Solo remoto'}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Links */}
                <Card variant="outlined" sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Link ({String(choice.localLinkCount)} local / {String(choice.remoteLinkCount)} remote)
                        </Typography>
                        <Select
                            size="small"
                            fullWidth
                            value={String(choice.linksAction)}
                            onChange={(e) => updateChoice(choice.id, 'linksAction', e.target.value)}
                            disabled={choice.deleteShow}
                        >
                            <MenuItem value="local">Locale ({String(choice.localLinkCount)})</MenuItem>
                            <MenuItem value="remote">Remoto ({String(choice.remoteLinkCount)})</MenuItem>
                            <MenuItem value="both">Entrambi ({String(choice.localLinkCount + choice.remoteLinkCount)})</MenuItem>
                        </Select>
                    </CardContent>
                </Card>

                {/* Progress */}
                <Card variant="outlined" sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Progresso ({String(choice.localProgressCount)} local / {String(choice.remoteProgressCount)} remote)
                        </Typography>
                        <Select
                            size="small"
                            fullWidth
                            value={String(choice.progressAction)}
                            onChange={(e) => updateChoice(choice.id, 'progressAction', e.target.value)}
                            disabled={choice.deleteShow}
                        >
                            <MenuItem value="local">Locale ({String(choice.localProgressCount)})</MenuItem>
                            <MenuItem value="remote">Remoto ({String(choice.remoteProgressCount)})</MenuItem>
                            <MenuItem value="both">Entrambi ({String(choice.localProgressCount + choice.remoteProgressCount)})</MenuItem>
                        </Select>
                    </CardContent>
                </Card>
            </Box>
        </ListItem>
    );

    const renderChooseStep = () => (
        <>
            <Alert severity="info" sx={{ mb: 2 }}>
                Seleziona per ogni show cosa prendere da dove. Puoi anche eliminare show che non vuoi mantenere.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" size="small" onClick={handleTakeAllLocal}>
                    Prendi tutto da Locale
                </Button>
                <Button variant="outlined" size="small" onClick={handleTakeAllRemote}>
                    Prendi tutto da Remoto
                </Button>
                <Button variant="outlined" size="small" onClick={handleTakeAllBoth}>
                    Prendi da entrambi
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Button 
                    variant="outlined" 
                    size="small" 
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleMarkLocalOnlyForDeletion}
                >
                    Elimina show solo locali ({String(stats.localOnly)})
                </Button>
                <Button 
                    variant="outlined" 
                    size="small" 
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleMarkRemoteOnlyForDeletion}
                >
                    Elimina show solo remoti ({String(stats.remoteOnly)})
                </Button>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Seleziona per ogni show cosa prendere da dove
                </Typography>
                <Typography variant="caption" color="text.disabled">
                    {String(showChoices.length)} show
                    {stats.toDelete > 0 && <span style={{ color: '#f44336' }}> ({String(stats.toDelete)} da eliminare)</span>}
                </Typography>
            </Box>

            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {(choices.length > 0 ? choices : showChoices).map(renderChoiceRow)}
            </List>
        </>
    );

    const handleContinue = () => {
        initializeChoices();
        setStep('choose');
    };

    const handleMerge = () => {
        // Use current choices (either user-modified or initialized from showChoices)
        const choicesToSend = choices.length > 0 ? choices : showChoices;
        // Filter out deleted shows (they will be handled separately in mediaStore)
        const filteredChoices = choicesToSend.filter(c => !c.deleteShow);
        const deletedIds = choicesToSend.filter(c => c.deleteShow).map(c => c.id);
        onMerge(filteredChoices, deletedIds);
    };

    return (
        <Dialog
            open={open}
            onClose={isProcessing ? undefined : onClose}
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
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="h6" fontWeight="bold">
                        Conflitto Sincronizzazione
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isProcessing}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {isProcessing ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <LinearProgress sx={{ mb: 2 }} />
                        <Typography>Elaborazione in corso...</Typography>
                    </Box>
                ) : (
                    <>
                        {step === 'overview' && renderOverviewStep()}
                        {step === 'choose' && renderChooseStep()}
                    </>
                )}
            </DialogContent>

            {!isProcessing && (
                <DialogActions sx={{ p: 2, gap: 1, flexDirection: 'column' }}>
                    {step === 'overview' && (
                        <>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                                Scegli come procedere con la sincronizzazione:
                            </Typography>

                            <Button
                                onClick={handleContinue}
                                variant="contained"
                                color="primary"
                                fullWidth
                                endIcon={<ArrowForwardIcon />}
                            >
                                Continua e scegli per ogni show
                            </Button>

                            <Button
                                onClick={handleMerge}
                                variant="outlined"
                                color="primary"
                                fullWidth
                                startIcon={<CloudSyncIcon />}
                            >
                                Unisci automaticamente (mantiene tutto)
                            </Button>

                            <Button
                                onClick={onOverwriteLocal}
                                variant="outlined"
                                color="warning"
                                fullWidth
                            >
                                Sovrascrivi dati locali con quelli remoti
                            </Button>

                            <Button
                                onClick={onOverwriteRemote}
                                variant="outlined"
                                color="info"
                                fullWidth
                            >
                                Sovrascrivi dati remoti con quelli locali
                            </Button>

                            <Button
                                onClick={onCancel}
                                variant="text"
                                color="error"
                                fullWidth
                            >
                                Annulla sync (logout)
                            </Button>
                        </>
                    )}

                    {step === 'choose' && (
                        <>
                            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                                <Button
                                    onClick={() => setStep('overview')}
                                    variant="text"
                                    sx={{ flex: 1 }}
                                >
                                    Indietro
                                </Button>
                                <Button
                                    onClick={handleMerge}
                                    variant="contained"
                                    color="primary"
                                    sx={{ flex: 2 }}
                                    startIcon={<CheckCircleIcon />}
                                >
                                    Conferma Merge ({String(choices.length > 0 ? choices.length : showChoices.length)} show)
                                </Button>
                            </Box>

                            <Button
                                onClick={onCancel}
                                variant="text"
                                color="error"
                                fullWidth
                            >
                                Annulla sync (logout)
                            </Button>
                        </>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
});

export default GoogleDriveSyncConflictModal;