import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslations } from '../../hooks/useTranslations.js';

/**
 * EpisodeActions - Action buttons for an episode row.
 * Includes mark watched/unwatched toggle and details button.
 * Designed for desktop inline display with hover reveal.
 */
const EpisodeActions = observer(({ isWatched, onToggleWatched, onShowDetails, sx = {} }) => {
    const { t } = useTranslations();

    return (
        <Box
            data-component="episodes-drawer-inline-actions"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                ...sx,
            }}
        >
            <IconButton
                size="small"
                aria-label={isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                onClick={onToggleWatched}
                sx={{
                    color: 'var(--neon-accent)',
                    background: 'rgba(76, 210, 255, 0.08)',
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.18)',
                        color: 'var(--neon-accent-hot)',
                    },
                }}
            >
                {isWatched ? <RemoveCircleOutlineIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
            </IconButton>
            <IconButton
                size="small"
                aria-label={t('episodesDrawer.details')}
                onClick={onShowDetails}
                sx={{
                    color: 'var(--neon-accent)',
                    background: 'rgba(76, 210, 255, 0.08)',
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.18)',
                        color: 'var(--neon-accent-hot)',
                    },
                }}
            >
                <InfoIcon fontSize="small" />
            </IconButton>
        </Box>
    );
});

EpisodeActions.displayName = 'EpisodeActions';

/**
 * EpisodeSwipeActions - Swipe-reveal action panel for mobile.
 * Same actions as EpisodeActions but styled for the swipe panel.
 */
const EpisodeSwipeActions = observer(({ isWatched, onToggleWatched, onShowDetails, sx = {} }) => {
    const { t } = useTranslations();

    return (
        <Box
            data-component="episodes-drawer-swipe-actions"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                ...sx,
            }}
        >
            <Box
                role="button"
                tabIndex={0}
                aria-label={isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
                onClick={onToggleWatched}
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                    cursor: 'pointer',
                    color: 'var(--neon-accent)',
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.10)',
                        color: 'var(--neon-accent-hot)',
                    },
                }}
            >
                {isWatched ? <RemoveCircleOutlineIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                {isWatched ? t('episodesDrawer.markUnwatched') : t('episodesDrawer.markWatched')}
            </Box>
            <Box
                role="button"
                tabIndex={0}
                aria-label={t('episodesDrawer.details')}
                onClick={onShowDetails}
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                    cursor: 'pointer',
                    color: 'var(--neon-accent)',
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderTop: '1px solid rgba(76, 210, 255, 0.18)',
                    transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.10)',
                        color: 'var(--neon-accent-hot)',
                    },
                }}
            >
                <InfoIcon fontSize="small" />
                {t('episodesDrawer.details')}
            </Box>
        </Box>
    );
});

EpisodeSwipeActions.displayName = 'EpisodeSwipeActions';

export { EpisodeActions, EpisodeSwipeActions };
export default EpisodeActions;
