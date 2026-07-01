/**
 * @fileoverview SyncConflictProcessingOverlay - blocking overlay shown
 * while a sync-merge / overwrite action is in flight.
 *
 * Renders a `LinearProgress` plus a translated label, and exposes
 * stable `id` / `data-component` attributes so Playwright can assert
 * its presence.
 */
import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useTranslations } from '../../../hooks/useTranslations.js';

/**
 * SyncConflictProcessingOverlay Component
 *
 * @returns {React.ReactElement} Processing overlay
 */
export const SyncConflictProcessingOverlay = () => {
    const { t } = useTranslations();

    return (
        <Box
            id="sync-conflict-processing-overlay"
            data-component="sync-conflict-processing-overlay"
            sx={{
                py: 4,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <LinearProgress
                sx={{
                    width: '100%',
                    maxWidth: 320,
                    height: 6,
                    borderRadius: '999px',
                    background: 'rgba(76, 210, 255, 0.15)',
                    '& .MuiLinearProgress-bar': {
                        background: 'var(--neon-accent)',
                        boxShadow: '0 0 12px rgba(76, 210, 255, 0.5)',
                    },
                }}
            />
            <Typography
                sx={{
                    color: 'var(--text-primary)',
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    letterSpacing: '0.04em',
                }}
            >
                {t('syncConflict.processing')}
            </Typography>
        </Box>
    );
};

SyncConflictProcessingOverlay.displayName = 'SyncConflictProcessingOverlay';

export default SyncConflictProcessingOverlay;
