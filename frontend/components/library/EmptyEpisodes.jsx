import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Button, Typography} from '@mui/material';
import TheatersIcon from '@mui/icons-material/Theaters';
import LinkIcon from '@mui/icons-material/Link';
import {useTranslations} from '../../hooks/useTranslations.js';
import {mediaStore} from '../../store/mediaStore.js';

/**
 * EmptyEpisodes - Centered icon + copy shown when a season is known
 * to have no episodes. Includes a CTA to link the first episode.
 */
const EmptyEpisodes = observer(() => {
    const {t} = useTranslations();

    const handleLinkFirstEpisode = () => {
        // Open the link episodes modal for the current show/season
        if (mediaStore.currentShow) {
            mediaStore.openLinkEpisodesModal(mediaStore.currentShow);
        }
    };

    return (
        <Box
            data-component="episodes-drawer-empty"
            sx={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 6,
                px: 3,
                textAlign: 'center',
            }}
        >
            <Box
                sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--holo-grad)',
                    border: '1px solid rgba(76, 210, 255, 0.35)',
                    boxShadow: '0 0 18px rgba(76, 210, 255, 0.3)',
                }}
            >
                <TheatersIcon
                    sx={{fontSize: '2rem', color: 'var(--neon-accent)'}}
                />
            </Box>
            <Typography
                sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    maxWidth: 260,
                }}
            >
                {t('episodesDrawer.empty')}
            </Typography>
            <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={handleLinkFirstEpisode}
                sx={{
                    mt: 1,
                    color: 'var(--neon-accent)',
                    borderColor: 'rgba(76, 210, 255, 0.35)',
                    background: 'rgba(76, 210, 255, 0.06)',
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    '&:hover': {
                        background: 'rgba(76, 210, 255, 0.12)',
                        borderColor: 'var(--neon-accent)',
                    },
                }}
            >
                {t('episodesDrawer.linkFirst') || 'Link First Episode'}
            </Button>
        </Box>
    );
});

EmptyEpisodes.displayName = 'EmptyEpisodes';

export default EmptyEpisodes;
