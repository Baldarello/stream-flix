/**
 * @fileoverview SyncConflictChooseStep - per-show chooser body.
 *
 * Renders the choose-step header (alert + bulk actions + delete rows +
 * counter chip), and a scrollable list of `SyncConflictChoiceRow` items.
 *
 * All state lives in the mobx store, so the component itself has no
 * `useState` hooks.
 */
import React from 'react';
import {observer} from 'mobx-react-lite';
import {Alert, Box, Divider, Typography} from '@mui/material';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {SyncConflictBulkActions} from './SyncConflictBulkActions.jsx';
import {SyncConflictChoiceRow} from './SyncConflictChoiceRow.jsx';

const alertSx = {
    mb: 2,
    background: 'var(--holo-grad)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(76, 210, 255, 0.35)',
    '& .MuiAlert-icon': {color: 'var(--neon-accent)'}
};

/**
 * SyncConflictChooseStep Component
 *
 * @returns {React.ReactElement} Choose body
 */
export const SyncConflictChooseStep = observer(() => {
    const {t} = useTranslations();
    const {syncConflictChoices: choices, syncConflictStats: stats} = mediaStore;

    return (
        <Box
            id="sync-conflict-choose-step"
            data-component="sync-conflict-choose-step"
            sx={{display: 'flex', flexDirection: 'column'}}
        >
            <Alert severity="info" sx={alertSx}>
                {t('syncConflict.chooseInfo')}
            </Alert>

            <SyncConflictBulkActions showDeletionRow/>

            <Divider sx={{my: 1, borderColor: 'rgba(76, 210, 255, 0.15)'}}/>

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                    flexWrap: 'wrap',
                    gap: 1
                }}
            >
                <Typography
                    variant="subtitle2"
                    sx={{
                        color: 'var(--text-secondary)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem'
                    }}
                >
                    {t('syncConflict.chooseInfo')}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: stats.toDelete > 0 ? '#ff6e6e' : 'var(--text-secondary)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif"
                    }}
                >
                    {stats.toDelete > 0
                        ? t('syncConflict.rowsCountWithDelete', {count: choices.length, toDelete: stats.toDelete})
                        : t('syncConflict.rowsCount', {count: choices.length})}
                </Typography>
            </Box>

            <Box
                sx={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    pr: 0.5
                }}
            >
                {choices.map(choice => (
                    <SyncConflictChoiceRow key={`sync-conflict-choice-row-key-${choice.id}`} choice={choice}/>
                ))}
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

SyncConflictChooseStep.displayName = 'SyncConflictChooseStep';

export default SyncConflictChooseStep;
