/**
 * @fileoverview SyncConflictChoiceRow - a single per-show chooser row.
 *
 * Renders one row in the choose-step list:
 *  - media-type icon (movie / tv) + show title
 *  - "ELIMINATO" badge when the row is flagged for deletion
 *  - delete checkbox (toggles `choice.deleteShow`)
 *  - three holo `Select` controls: La mia lista / Link / Progresso
 *
 * All mutators are delegated to the mobx store; the row never holds
 * local state. Uses design tokens (`--neon-accent`, `--text-primary`,
 * `--text-secondary`) instead of literal `rgba(...)` colours.
 */
import React from 'react';
import {observer} from 'mobx-react-lite';
import {
    Box,
    Card,
    CardContent,
    Checkbox,
    FormControl,
    MenuItem,
    Select,
    Typography
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import {HoloChip} from '../../feedback/HoloChip.jsx';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';

const cardSx = (deleteShow) => ({
    background: 'var(--holo-grad)',
    border: '1px solid rgba(76, 210, 255, 0.3)',
    boxShadow: deleteShow
        ? '0 0 14px rgba(255, 76, 76, 0.35)'
        : '0 0 8px rgba(76, 210, 255, 0.18)',
    transition: 'box-shadow 200ms ease'
});

const labelSx = {
    color: 'var(--text-secondary)',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    display: 'block',
    mb: 1
};

const selectSx = {
    color: 'var(--text-primary)',
    fontFamily: "'Inter', sans-serif",
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(76,210,255,0.35)'
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent-hot)'
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent)',
        boxShadow: '0 0 12px rgba(76, 210, 255, 0.35)'
    }
};

/**
 * SyncConflictChoiceRow Component
 *
 * @param {Object} props
 * @param {Object} props.choice - The row payload from
 *   `googleDriveSyncConflictStore.choices`.
 * @returns {React.ReactElement} Per-row chooser card
 */
export const SyncConflictChoiceRow = observer(({choice}) => {
    const {t} = useTranslations();
    const {updateSyncConflictChoice, toggleSyncConflictDeleteShow} = mediaStore;
    const isMovie = choice.mediaType === 'movie';

    return (
        <Box
            id={`sync-conflict-choice-row-${choice.id}`}
            data-component="sync-conflict-choice-row"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                py: 2,
                px: 1.5,
                mb: 1.5,
                borderRadius: '12px',
                border: '1px solid rgba(76, 210, 255, 0.2)',
                backgroundColor: choice.deleteShow
                    ? 'rgba(255, 76, 76, 0.08)'
                    : 'rgba(76, 210, 255, 0.04)',
                transition: 'background-color 200ms ease'
            }}
        >
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                    {isMovie
                        ? <MovieIcon fontSize="small" sx={{color: 'var(--neon-accent)'}}/>
                        : <TvIcon fontSize="small" sx={{color: 'var(--neon-accent)'}}/>}
                    <Typography
                        sx={{
                            flex: 1,
                            color: 'var(--text-primary)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {choice.title}
                    </Typography>
                    {choice.deleteShow && (
                        <HoloChip
                            id={`sync-conflict-choice-row-${choice.id}-deleted`}
                            label={t('syncConflict.deleted')}
                            sx={{
                                borderColor: 'rgba(255, 76, 76, 0.65)',
                                color: '#ff6e6e',
                                height: 20
                            }}
                        />
                    )}
                </Box>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <Typography
                        variant="caption"
                        sx={{color: 'var(--text-secondary)', fontFamily: "'Space Grotesk', 'Inter', sans-serif"}}
                    >
                        {t('syncConflict.showId', {id: choice.id})}
                    </Typography>
                    <Checkbox
                        id={`sync-conflict-choice-row-${choice.id}-delete`}
                        checked={choice.deleteShow}
                        onChange={() => toggleSyncConflictDeleteShow(choice.id)}
                        size="small"
                        icon={<DeleteIcon sx={{color: 'var(--text-secondary)'}}/>}
                        checkedIcon={<DeleteSweepIcon sx={{color: '#ff6e6e'}}/>}
                        sx={{p: 0.5}}
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', sm: 'repeat(3, 1fr)'},
                    gap: 1.5
                }}
            >
                <Card variant="outlined" sx={cardSx(choice.deleteShow)}>
                    <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                        <Typography sx={labelSx}>{t('syncConflict.myList')}</Typography>
                        <FormControl fullWidth size="small" sx={selectSx}>
                            <Select
                                value={String(choice.myListAction)}
                                onChange={(e) => updateSyncConflictChoice(choice.id, 'myListAction', e.target.value)}
                                disabled={choice.deleteShow}
                            >
                                <MenuItem value="local">{t('syncConflict.options.locale')}</MenuItem>
                                <MenuItem value="remote">{t('syncConflict.options.remote')}</MenuItem>
                                {choice.myListAction === 'both' && (
                                    <MenuItem value="both">{t('syncConflict.options.both')}</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'var(--text-secondary)',
                                mt: 0.5,
                                display: 'block'
                            }}
                        >
                            {choice.myListAction === 'none' && t('syncConflict.options.notIncluded')}
                            {choice.myListAction === 'both' && t('syncConflict.options.inBoth')}
                            {choice.myListAction === 'local' && t('syncConflict.options.onlyLocal')}
                            {choice.myListAction === 'remote' && t('syncConflict.options.onlyRemote')}
                        </Typography>
                    </CardContent>
                </Card>

                <Card variant="outlined" sx={cardSx(choice.deleteShow)}>
                    <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                        <Typography sx={labelSx}>
                            {t('syncConflict.links', {local: choice.localLinkCount, remote: choice.remoteLinkCount})}
                        </Typography>
                        <FormControl fullWidth size="small" sx={selectSx}>
                            <Select
                                value={String(choice.linksAction)}
                                onChange={(e) => updateSyncConflictChoice(choice.id, 'linksAction', e.target.value)}
                                disabled={choice.deleteShow}
                            >
                                <MenuItem value="local">
                                    {t('syncConflict.options.locale')} ({choice.localLinkCount})
                                </MenuItem>
                                <MenuItem value="remote">
                                    {t('syncConflict.options.remote')} ({choice.remoteLinkCount})
                                </MenuItem>
                                <MenuItem value="both">
                                    {t('syncConflict.options.both')} ({choice.localLinkCount + choice.remoteLinkCount})
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </CardContent>
                </Card>

                <Card variant="outlined" sx={cardSx(choice.deleteShow)}>
                    <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                        <Typography sx={labelSx}>
                            {t('syncConflict.progress', {
                                local: choice.localProgressCount,
                                remote: choice.remoteProgressCount
                            })}
                        </Typography>
                        <FormControl fullWidth size="small" sx={selectSx}>
                            <Select
                                value={String(choice.progressAction)}
                                onChange={(e) => updateSyncConflictChoice(choice.id, 'progressAction', e.target.value)}
                                disabled={choice.deleteShow}
                            >
                                <MenuItem value="local">
                                    {t('syncConflict.options.locale')} ({choice.localProgressCount})
                                </MenuItem>
                                <MenuItem value="remote">
                                    {t('syncConflict.options.remote')} ({choice.remoteProgressCount})
                                </MenuItem>
                                <MenuItem value="both">
                                    {t('syncConflict.options.both')} ({choice.localProgressCount + choice.remoteProgressCount})
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
});

SyncConflictChoiceRow.displayName = 'SyncConflictChoiceRow';

export default SyncConflictChoiceRow;
