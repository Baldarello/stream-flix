import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations } from '../../hooks/useTranslations.js';
import { HoloChip } from '../feedback/HoloChip.jsx';

/**
 * HoloDrawerHeader - Drawer header with display typography, neon close
 * button and total-episode HoloChip. Mirrors the remote drawer's header
 * recipe for visual parity.
 */
const HoloDrawerHeader = observer(({ title, subtitle, totalEpisodes, onClose }) => {
    const { t } = useTranslations();
    return (
        <Box
            id="episodes-drawer-header"
            data-component="episodes-drawer-header"
            sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: '1px solid rgba(76, 210, 255, 0.18)',
                position: 'relative',
                zIndex: 2,
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        letterSpacing: '0.01em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 12px rgba(76, 210, 255, 0.25)',
                        lineHeight: 1.2,
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        sx={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            mt: 0.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {totalEpisodes > 0 && (
                <HoloChip id="episodes-drawer-total-chip" label={`${totalEpisodes}`} sx={{ height: 22, fontSize: '0.65rem' }} />
            )}
            <IconButton
                id="episodes-drawer-close"
                data-testid="episodes-drawer-close"
                aria-label={t('common.close') || 'Close'}
                autoFocus
                onClick={onClose}
                sx={{
                    color: 'var(--neon-accent)',
                    transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1), color 200ms',
                    '&:hover': {
                        color: 'var(--neon-accent-hot)',
                        transform: 'rotate(90deg)',
                    },
                }}
            >
                <CloseIcon />
            </IconButton>
        </Box>
    );
});

HoloDrawerHeader.displayName = 'HoloDrawerHeader';

export default HoloDrawerHeader;
