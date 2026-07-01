/**
 * @fileoverview SyncConflictStats - aggregate counter chips for the
 * Google Drive sync conflict modal.
 *
 * Renders the "Totale / Con conflitti / Solo locale / Solo remoto /
 * Da eliminare" chip group using `HoloChip` so it matches the rest of
 * the cinematic UI. The component is observer-wrapped and reads the
 * counters from `mediaStore.syncConflictStats` (delegated from
 * `googleDriveSyncConflictStore.stats`).
 */
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@mui/material';
import { mediaStore } from '../../../store/mediaStore.js';
import { HoloChip } from '../../feedback/HoloChip.jsx';
import { useTranslations } from '../../../hooks/useTranslations.js';

/**
 * SyncConflictStats Component
 *
 * @returns {React.ReactElement} Stats chip group
 */
export const SyncConflictStats = observer(() => {
    const { syncConflictStats: stats } = mediaStore;
    const { t } = useTranslations();

    return (
        <Box
            id="sync-conflict-stats"
            data-component="sync-conflict-stats"
            sx={{
                display: 'flex',
                gap: 1.5,
                mb: 2,
                flexWrap: 'wrap',
            }}
        >
            <HoloChip id="sync-conflict-stat-total" label={t('syncConflict.stats.total', { count: stats.total })} />
            <HoloChip
                id="sync-conflict-stat-conflicts"
                label={t('syncConflict.stats.conflicts', { count: stats.withConflicts })}
                sx={{
                    borderColor: 'var(--neon-accent-hot)',
                    color: 'var(--neon-accent-hot)',
                    boxShadow: '0 0 10px rgba(255, 138, 76, 0.35)',
                }}
            />
            <HoloChip
                id="sync-conflict-stat-local-only"
                label={t('syncConflict.stats.localOnly', { count: stats.localOnly })}
                sx={{
                    borderColor: 'rgba(102, 255, 153, 0.5)',
                    color: 'rgba(102, 255, 153, 0.9)',
                    boxShadow: '0 0 10px rgba(102, 255, 153, 0.3)',
                }}
            />
            <HoloChip
                id="sync-conflict-stat-remote-only"
                label={t('syncConflict.stats.remoteOnly', { count: stats.remoteOnly })}
                sx={{
                    borderColor: 'rgba(76, 210, 255, 0.6)',
                    color: 'var(--neon-accent)',
                    boxShadow: '0 0 10px rgba(76, 210, 255, 0.35)',
                }}
            />
            {stats.toDelete > 0 && (
                <HoloChip
                    id="sync-conflict-stat-to-delete"
                    label={t('syncConflict.stats.toDelete', { count: stats.toDelete })}
                    sx={{
                        borderColor: 'rgba(255, 76, 76, 0.65)',
                        color: '#ff6e6e',
                        boxShadow: '0 0 10px rgba(255, 76, 76, 0.4)',
                    }}
                />
            )}
        </Box>
    );
});

SyncConflictStats.displayName = 'SyncConflictStats';

export default SyncConflictStats;
