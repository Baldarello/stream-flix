/**
 * @fileoverview SyncConflictBulkActions - bulk action button rows for
 * the Google Drive sync conflict modal.
 *
 * Hosts the two action rows:
 *  - Primary row: "Prendi tutto da Locale / Remoto / Entrambi"
 *  - Secondary row: "Elimina show solo locali / solo remoti" (visible
 *    only on the choose step so the user can flag pure-side rows for
 *    deletion)
 *
 * All actions delegate to the mobx store; no local state. The component
 * is atomic and uses design tokens instead of literal rgba values.
 */
import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Button} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';

const neonButtonSx = {
    borderColor: 'rgba(76, 210, 255, 0.45)',
    color: 'var(--neon-accent)',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    letterSpacing: '0.04em',
    '&:hover': {
        borderColor: 'var(--neon-accent)',
        backgroundColor: 'rgba(76, 210, 255, 0.08)',
        boxShadow: '0 0 12px rgba(76, 210, 255, 0.35)'
    }
};

/**
 * SyncConflictBulkActions Component
 *
 * @param {Object} props
 * @param {boolean} [props.showDeletionRow] - Whether to render the
 *   secondary "elimina show solo ..." row. Defaults to `true` (the row
 *   is also useful in the overview step).
 * @returns {React.ReactElement} Bulk action rows
 */
export const SyncConflictBulkActions = observer(({showDeletionRow = true}) => {
    const {t} = useTranslations();
    const {
        syncConflictStats: stats,
        takeAllLocalSyncConflict,
        takeAllRemoteSyncConflict,
        takeAllBothSyncConflict,
        markLocalOnlySyncConflictForDeletion,
        markRemoteOnlySyncConflictForDeletion
    } = mediaStore;

    return (
        <Box
            id="sync-conflict-bulk-actions"
            data-component="sync-conflict-bulk-actions"
            sx={{display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2}}
        >
            <Box sx={{display: 'flex', gap: 1.5, flexWrap: 'wrap'}}>
                <Button
                    id="sync-conflict-bulk-local"
                    data-component="sync-conflict-bulk-local"
                    variant="outlined"
                    size="small"
                    onClick={takeAllLocalSyncConflict}
                    sx={neonButtonSx}
                >
                    {t('syncConflict.bulkLocal')}
                </Button>
                <Button
                    id="sync-conflict-bulk-remote"
                    data-component="sync-conflict-bulk-remote"
                    variant="outlined"
                    size="small"
                    onClick={takeAllRemoteSyncConflict}
                    sx={neonButtonSx}
                >
                    {t('syncConflict.bulkRemote')}
                </Button>
                <Button
                    id="sync-conflict-bulk-both"
                    data-component="sync-conflict-bulk-both"
                    variant="outlined"
                    size="small"
                    onClick={takeAllBothSyncConflict}
                    sx={neonButtonSx}
                >
                    {t('syncConflict.bulkBoth')}
                </Button>
            </Box>

            {showDeletionRow && (
                <Box sx={{display: 'flex', gap: 1.5, flexWrap: 'wrap'}}>
                    <Button
                        id="sync-conflict-delete-local-only"
                        data-component="sync-conflict-delete-local-only"
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteIcon/>}
                        onClick={markLocalOnlySyncConflictForDeletion}
                        sx={{
                            borderColor: 'rgba(255, 76, 76, 0.5)',
                            color: '#ff6e6e',
                            '&:hover': {
                                borderColor: '#ff6e6e',
                                backgroundColor: 'rgba(255, 76, 76, 0.08)',
                                boxShadow: '0 0 12px rgba(255, 76, 76, 0.35)'
                            }
                        }}
                    >
                        {t('syncConflict.deleteLocalOnly', {count: stats.localOnly})}
                    </Button>
                    <Button
                        id="sync-conflict-delete-remote-only"
                        data-component="sync-conflict-delete-remote-only"
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteIcon/>}
                        onClick={markRemoteOnlySyncConflictForDeletion}
                        sx={{
                            borderColor: 'rgba(255, 76, 76, 0.5)',
                            color: '#ff6e6e',
                            '&:hover': {
                                borderColor: '#ff6e6e',
                                backgroundColor: 'rgba(255, 76, 76, 0.08)',
                                boxShadow: '0 0 12px rgba(255, 76, 76, 0.35)'
                            }
                        }}
                    >
                        {t('syncConflict.deleteRemoteOnly', {count: stats.remoteOnly})}
                    </Button>
                </Box>
            )}
        </Box>
    );
});

SyncConflictBulkActions.displayName = 'SyncConflictBulkActions';

export default SyncConflictBulkActions;
