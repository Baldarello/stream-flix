import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../../store/mediaStore.js';
import {remoteStore} from '../../../store/remoteStore.js';
import {
    Box,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import {useTranslations} from '../../../hooks/useTranslations.js';

const EpisodesDrawer = observer(({
    isOpen,
    onClose,
    onSelectEpisode,
}) => {
    const {t} = useTranslations();
    const {remoteFullItem, isRemoteFullItemLoading, playRemoteItem} = remoteStore;
    const {showIntroDurations, setShowIntroDuration} = mediaStore;

    const nowPlayingItem = remoteStore.remoteSlaveState?.nowPlayingItem;
    const isEpisode = nowPlayingItem && 'episode_number' in nowPlayingItem;

    const [selectedSeason, setSelectedSeason] = useState(undefined);
    const isInitialMount = useRef(true);

    // Initialize selectedSeason based on currently playing episode
    useEffect(() => {
        // Only initialize selectedSeason on first mount (when undefined)
        // Use ref to track initial mount to avoid resetting user selection
        if (isInitialMount.current && nowPlayingItem && 'season_number' in nowPlayingItem) {
            setSelectedSeason(nowPlayingItem.season_number);
            isInitialMount.current = false;
        }
    }, [nowPlayingItem]);

    const handleSelectEpisode = (episode) => {
        if (!remoteFullItem) return;
        const itemToPlay = {
            ...episode,
            show_id: remoteFullItem.id,
            show_title: remoteFullItem.title || remoteFullItem.name || '',
            backdrop_path: remoteFullItem.backdrop_path,
        };
        playRemoteItem(itemToPlay);
        onClose(); // Close drawer after selection
    };

    const introDuration = remoteFullItem ? (showIntroDurations.get(remoteFullItem.id) ?? 80) : 80;

    const handleIntroDurationChange = (event) => {
        const value = event.target.value;
        if (!remoteFullItem) return;
        const duration = parseInt(value, 10);
        if (value === '' || isNaN(duration)) {
            setShowIntroDuration(remoteFullItem.id, 80); // Reset to default
        } else if (duration >= 0) {
            setShowIntroDuration(remoteFullItem.id, duration);
        }
    };

    const currentSeason = remoteFullItem?.seasons?.find(s => s.season_number === selectedSeason);
    const episodes = currentSeason?.episodes ?? [];

    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            id="episodes-drawer"
            PaperProps={{
                sx: {
                    width: {xs: '80vw', sm: 350},
                    bgcolor: 'background.paper',
                    pt: 'env(safe-area-inset-top)',
                    pb: 'env(safe-area-inset-bottom)',
                    pr: 'env(safe-area-inset-right)',
                }
            }}
            ModalProps={{
                BackdropProps: {
                    sx: {
                        pt: 'env(safe-area-inset-top)',
                        pb: 'env(safe-area-inset-bottom)',
                        pl: 'env(safe-area-inset-left)',
                        pr: 'env(safe-area-inset-right)',
                    }
                }
            }}
        >
            <Box sx={{p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography variant="h6">{t('remote.player.episodes')}</Typography>
                <IconButton onClick={onClose}><CloseIcon/></IconButton>
            </Box>
            <Divider/>
            <Box sx={{p: 2}}>
                <TextField
                    label={t('remote.player.introDuration')}
                    type="number"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={introDuration}
                    onChange={handleIntroDurationChange}
                    onFocus={(event) => event.target.select()}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                        inputProps: {min: 0}
                    }}
                />

                {remoteFullItem?.seasons && (
                    <FormControl fullWidth margin="normal" size="small">
                        {/* FIX: (line 170) Pass label text as children to InputLabel */}
                        <InputLabel>{t('remote.detail.season')}</InputLabel>
                        <Select
                            value={selectedSeason || ''}
                            label={t('remote.detail.season')}
                            onChange={(e) => setSelectedSeason(Number(e.target.value))}
                        >
                            {remoteFullItem.seasons.map(season => (
                                <MenuItem key={season.id} value={season.season_number}>
                                    {season.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Box>
            <Divider/>
            {isRemoteFullItemLoading ? (
                <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>...</Box>
            ) : (
                <List sx={{flex: 1, overflowY: 'auto'}}>
                    {episodes.map(episode => (
                        <ListItem key={episode.id} disablePadding>
                            <ListItemButton
                                onClick={() => handleSelectEpisode(episode)}
                                selected={isEpisode && episode.id === nowPlayingItem.id}
                                disabled={!episode.video_url}
                            >
                                <ListItemText
                                    primary={`${episode.episode_number}. ${episode.name}`}
                                    primaryTypographyProps={{
                                        fontWeight: isEpisode && episode.id === nowPlayingItem.id ? 'bold' : 'normal',
                                        noWrap: true
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            )}
        </Drawer>
    );
});

export default EpisodesDrawer;
