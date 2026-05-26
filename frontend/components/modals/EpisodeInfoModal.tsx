import React from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.ts';
import {Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography} from '@mui/material';
import PlaylistAddCheckCircleIcon from '@mui/icons-material/PlaylistAddCheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {useTranslations} from '../../hooks/useTranslations.ts';

const EpisodeInfoModal: React.FC = observer(() => {
    const {t} = useTranslations();
    const {
        isEpisodeInfoModalOpen,
        episodeInfoModalData,
        closeEpisodeInfoModal,
        toggleEpisodeWatchedStatus
    } = mediaStore;

    if (!episodeInfoModalData) return null;

    const {episode, seasonNumber, uniqueLanguages} = episodeInfoModalData;
    const episodeProgress = mediaStore.episodeProgress.get(episode.id);
    const isWatched = episodeProgress?.watched;

    return (
        <Dialog
            open={isEpisodeInfoModalOpen}
            onClose={closeEpisodeInfoModal}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    zIndex: 2200 // Above drawer zIndex 2100
                }
            }}
        >
            <DialogTitle>
                {episode.name}
                <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                    {t('episodesDrawer.season', {number: seasonNumber})} - {t('episodesDrawer.episode', {number: episode.episode_number})}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                {episode.overview && (
                    <Typography variant="body2" sx={{mb: 2}}>
                        {episode.overview}
                    </Typography>
                )}
                <Typography variant="subtitle2" sx={{mt: 2, mb: 1}}>
                    {t('episodesDrawer.availableLanguages')}:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {uniqueLanguages.map(({lang, type}) => (
                        <Chip
                            key={`${lang}-${type}`}
                            label={`${lang.toUpperCase()} ${type === 'dub' ? 'Dubbed' : 'Subtitled'}`}
                            color={type === 'dub' ? 'primary' : 'secondary'}
                            variant="outlined"
                        />
                    ))}
                </Stack>
                <Box sx={{mt: 2}}>
                    <Typography variant="subtitle2">
                        {t('episodesDrawer.airDate')}: {episode.air_date || 'N/A'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{mt: 1}}>
                        {t('episodesDrawer.runtime')}: {episode.runtime || episode.runtime || 'N/A'} min
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeEpisodeInfoModal}>{t('common.close')}</Button>
                <Button
                    variant="contained"
                    startIcon={isWatched ? <RemoveCircleOutlineIcon/> : <PlaylistAddCheckCircleIcon/>}
                    onClick={() => {
                        if (episode) {
                            toggleEpisodeWatchedStatus(episode.id);
                        }
                        closeEpisodeInfoModal();
                    }}
                    color={isWatched ? 'warning' : 'success'}
                >
                    {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default EpisodeInfoModal;