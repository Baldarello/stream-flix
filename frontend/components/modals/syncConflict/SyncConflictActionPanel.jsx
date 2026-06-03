/**
 * @fileoverview SyncConflictActionPanel - footer CTAs for the
 * Google Drive sync conflict modal.
 *
 * Switches between two stacks:
 *  - Overview step: "Continua" (advances to choose) and a stack of
 *    overwrite / cancel CTAs.
 *  - Choose step: "Indietro" (back to overview) and the "Conferma
 *    Merge" CTA.
 *
 * The component receives its callback props (e.g. `onMerge`,
 * `onOverwriteLocal`, ...) so the orchestrator (`GoogleDriveSync
 * ConflictModal`) can keep the existing prop contract. Internal state
 * (the current step) is read from the mobx store.
 */
import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Button, Stack} from '@mui/material';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';

const primaryButtonSx = {
    background: 'var(--neon-accent)',
    color: 'var(--bg-deep)',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.04em',
    '&:hover': {
        background: 'var(--neon-accent-hot)',
        boxShadow: '0 0 14px rgba(255, 138, 76, 0.45)'
    },
    '&.Mui-disabled': {
        background: 'rgba(76, 210, 255, 0.25)',
        color: 'var(--text-secondary)'
    }
};

const outlinedButtonSx = {
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

const errorButtonSx = {
    borderColor: 'rgba(255, 76, 76, 0.55)',
    color: '#ff6e6e',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    letterSpacing: '0.04em',
    '&:hover': {
        borderColor: '#ff6e6e',
        backgroundColor: 'rgba(255, 76, 76, 0.08)',
        boxShadow: '0 0 12px rgba(255, 76, 76, 0.35)'
    }
};

/**
 * SyncConflictActionPanel Component
 *
 * @param {Object} props
 * @param {Function} props.onMerge - Merge handler (called with
 *   `(filteredChoices, deletedIds)`).
 * @param {Function} props.onOverwriteLocal - Overwrite-local handler.
 * @param {Function} props.onOverwriteRemote - Overwrite-remote handler.
 * @param {Function} props.onCancel - Cancel handler.
 * @returns {React.ReactElement} Action panel
 */
export const SyncConflictActionPanel = observer(({
                                                     onMerge,
                                                     onOverwriteLocal,
                                                     onOverwriteRemote,
                                                     onCancel
                                                 }) => {
    const {t} = useTranslations();
    const {syncConflictStep: step, setSyncConflictStep, syncConflictStats: stats} = mediaStore;

    const isOverview = step === 'overview';

    return (
        <Box
            id="sync-conflict-action-panel"
            data-component="sync-conflict-action-panel"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                mt: 2,
                pt: 2,
                borderTop: '1px solid rgba(76, 210, 255, 0.15)'
            }}
        >
            {isOverview ? (
                <>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                        <Button
                            id="sync-conflict-action-continue"
                            data-component="sync-conflict-action-continue"
                            variant="contained"
                            onClick={() => setSyncConflictStep('choose')}
                            sx={{...primaryButtonSx, flex: 1}}
                        >
                            {t('syncConflict.actions.continue')}
                        </Button>
                        <Button
                            id="sync-conflict-action-merge-auto"
                            data-component="sync-conflict-action-merge-auto"
                            variant="outlined"
                            onClick={() => onMerge && onMerge([], [])}
                            sx={{...outlinedButtonSx, flex: 1}}
                        >
                            {t('syncConflict.actions.mergeAuto')}
                        </Button>
                    </Stack>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                        <Button
                            id="sync-conflict-action-overwrite-local"
                            data-component="sync-conflict-action-overwrite-local"
                            variant="outlined"
                            onClick={() => onOverwriteLocal && onOverwriteLocal()}
                            sx={{...outlinedButtonSx, flex: 1}}
                        >
                            {t('syncConflict.actions.overwriteLocal')}
                        </Button>
                        <Button
                            id="sync-conflict-action-overwrite-remote"
                            data-component="sync-conflict-action-overwrite-remote"
                            variant="outlined"
                            onClick={() => onOverwriteRemote && onOverwriteRemote()}
                            sx={{...outlinedButtonSx, flex: 1}}
                        >
                            {t('syncConflict.actions.overwriteRemote')}
                        </Button>
                    </Stack>
                    <Button
                        id="sync-conflict-action-cancel"
                        data-component="sync-conflict-action-cancel"
                        variant="outlined"
                        onClick={() => onCancel && onCancel()}
                        sx={errorButtonSx}
                    >
                        {t('syncConflict.actions.cancel')}
                    </Button>
                </>
            ) : (
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                    <Button
                        id="sync-conflict-action-back"
                        data-component="sync-conflict-action-back"
                        variant="outlined"
                        onClick={() => setSyncConflictStep('overview')}
                        sx={{...outlinedButtonSx, flex: 1}}
                    >
                        {t('syncConflict.actions.back')}
                    </Button>
                    <Button
                        id="sync-conflict-action-confirm-merge"
                        data-component="sync-conflict-action-confirm-merge"
                        variant="contained"
                        onClick={() => onMerge && onMerge(undefined, undefined, stats)}
                        sx={{...primaryButtonSx, flex: 2}}
                    >
                        {t('syncConflict.actions.confirmMerge', {count: stats.total - stats.toDelete})}
                    </Button>
                </Stack>
            )}
        </Box>
    );
});

SyncConflictActionPanel.displayName = 'SyncConflictActionPanel';

export default SyncConflictActionPanel;
