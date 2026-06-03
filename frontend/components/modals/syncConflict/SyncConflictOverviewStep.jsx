/**
 * @fileoverview SyncConflictOverviewStep - high-level summary of the
 * Google Drive sync conflict.
 *
 * Renders the intro alert, the bulk-action row, the stats chips and the
 * scrollable read-only list of conflicting shows. Each list row exposes
 * a small badge group ("My List / Links / Progress" or "Nessun
 * conflitto") so the user can see at a glance what is in conflict.
 */
import React from 'react';
import {observer} from 'mobx-react-lite';
import {Alert, Box, Typography} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';
import {HoloChip} from '../../feedback/HoloChip.jsx';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {SyncConflictStats} from './SyncConflictStats.jsx';
import {SyncConflictBulkActions} from './SyncConflictBulkActions.jsx';

const alertSx = {
    mb: 2,
    background: 'var(--holo-grad)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(76, 210, 255, 0.35)',
    '& .MuiAlert-icon': {color: 'var(--neon-accent)'}
};

/**
 * SyncConflictOverviewStep Component
 *
 * @returns {React.ReactElement} Overview body
 */
export const SyncConflictOverviewStep = observer(() => {
    const {t} = useTranslations();
    const {syncConflictChoices: choices} = mediaStore;

    return (
        <Box
            id="sync-conflict-overview-step"
            data-component="sync-conflict-overview-step"
            sx={{display: 'flex', flexDirection: 'column'}}
        >
            <Alert severity="info" sx={alertSx}>
                {t('syncConflict.overviewInfo')}
            </Alert>

            <SyncConflictBulkActions showDeletionRow={false}/>
            <SyncConflictStats/>

            <Box
                sx={{
                    maxHeight: 350,
                    overflowY: 'auto',
                    pr: 0.5,
                    border: '1px solid rgba(76, 210, 255, 0.15)',
                    borderRadius: '10px',
                    background: 'rgba(76, 210, 255, 0.03)'
                }}
            >
                {choices.map(choice => {
                    const hasMyListConflict = choice.myListAction === 'both';
                    const hasLinksConflict = choice.linksAction === 'both';
                    const hasProgressConflict = choice.progressAction === 'both';
                    const hasAnyConflict = hasMyListConflict || hasLinksConflict || hasProgressConflict;
                    const isMovie = choice.mediaType === 'movie';

                    return (
                        <Box
                            key={`sync-conflict-overview-row-${choice.id}`}
                            id={`sync-conflict-overview-row-${choice.id}`}
                            data-component="sync-conflict-overview-row"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                width: '100%',
                                py: 1.25,
                                px: 1.5,
                                borderBottom: '1px solid rgba(76, 210, 255, 0.12)'
                            }}
                        >
                            {isMovie
                                ? <MovieIcon fontSize="small" sx={{color: 'var(--neon-accent)'}}/>
                                : <TvIcon fontSize="small" sx={{color: 'var(--neon-accent)'}}/>}
                            <Typography
                                sx={{
                                    flex: 1,
                                    color: 'var(--text-primary)',
                                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {choice.title}
                            </Typography>
                            <Box sx={{display: 'flex', gap: 0.5}}>
                                {hasMyListConflict && (
                                    <HoloChip
                                        id={`sync-conflict-overview-row-${choice.id}-my-list`}
                                        label={t('syncConflict.labels.myListBadge')}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.6rem',
                                            borderColor: 'var(--neon-accent-hot)',
                                            color: 'var(--neon-accent-hot)'
                                        }}
                                    />
                                )}
                                {hasLinksConflict && (
                                    <HoloChip
                                        id={`sync-conflict-overview-row-${choice.id}-links`}
                                        label={t('syncConflict.labels.linksBadge')}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.6rem',
                                            borderColor: 'var(--neon-accent-hot)',
                                            color: 'var(--neon-accent-hot)'
                                        }}
                                    />
                                )}
                                {hasProgressConflict && (
                                    <HoloChip
                                        id={`sync-conflict-overview-row-${choice.id}-progress`}
                                        label={t('syncConflict.labels.progressBadge')}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.6rem',
                                            borderColor: 'var(--neon-accent-hot)',
                                            color: 'var(--neon-accent-hot)'
                                        }}
                                    />
                                )}
                                {!hasAnyConflict && (
                                    <HoloChip
                                        id={`sync-conflict-overview-row-${choice.id}-no-conflict`}
                                        label={t('syncConflict.noConflict')}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.6rem',
                                            borderColor: 'rgba(102, 255, 153, 0.5)',
                                            color: 'rgba(102, 255, 153, 0.9)'
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    );
                })}
                {choices.length === 0 && (
                    <Box sx={{p: 3, textAlign: 'center'}}>
                        <Typography sx={{color: 'var(--text-secondary)'}}>
                            {t('syncConflict.noConflict')}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
});

SyncConflictOverviewStep.displayName = 'SyncConflictOverviewStep';

export default SyncConflictOverviewStep;
