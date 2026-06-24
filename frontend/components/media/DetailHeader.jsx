/**
 * @fileoverview DetailHeader - Header section for detail view.
 *
 * Contains title, rating, genres, release info, and action buttons.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Stack, Typography, Tooltip, IconButton, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import { mediaStore } from '../../store/mediaStore.js';
import { useTranslations } from '../../hooks/useTranslations.js';

export const DetailHeader = observer(({
    item, title, releaseDate, isInMyList, listActionLabel, onPlay, onToggleList
}) => {
    const { t } = useTranslations();
    return (
        <Stack spacing={2} sx={{
            p: { xs: 2, md: 4 },
            position: 'relative', borderRadius: '14px',
            backgroundColor: 'var(--bg-deep)', backgroundImage: 'var(--holo-grad)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(76, 210, 255, 0.25)',
            boxShadow: '0 0 24px rgba(76, 210, 255, 0.18), 0 18px 48px rgba(0, 0, 0, 0.55)',
            color: 'var(--text-primary)'
        }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h2" component="h1" fontWeight="bold" sx={{
                    fontSize: { xs: '2rem', sm: '3.75rem' },
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    color: 'var(--text-primary)',
                    textShadow: '0 0 14px rgba(76, 210, 255, 0.35)'
                }}>{title}</Typography>
                {item.media_type === 'movie' && (
                    <Tooltip title={t('detail.linkEpisodesTooltip')}>
                        <IconButton
                            id="link-episode"
                            className="neon-edge"
                            data-component="link-episode-movie"
                            onClick={() => mediaStore.openLinkMovieModal(item)}
                            sx={{
                                color: 'var(--neon-accent)',
                                transition: 'color 200ms ease, box-shadow 200ms ease',
                                '&:hover': { color: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow)' }
                            }}
                        >
                            <LinkIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center', fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                <Typography sx={{ color: 'var(--neon-accent)' }} fontWeight="bold">
                    {t('detail.vote')}: {item.vote_average?.toFixed(1)}
                </Typography>
                <Typography sx={{ color: 'var(--text-secondary)' }}>{releaseDate?.substring(0, 4)}</Typography>
                {item.media_type === 'tv' && item.seasons && (
                    <Typography sx={{ color: 'var(--text-secondary)' }}>
                        {item.seasons.length} {t('detail.seasons')}
                    </Typography>
                )}
            </Stack>
            <Typography variant="body1" sx={{
                maxHeight: '200px', overflowY: 'auto',
                fontSize: { xs: '0.85rem', sm: '1rem' }, color: 'var(--text-primary)'
            }}>{item.overview}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
                <Button className="neon-edge" variant="contained" startIcon={<PlayArrowIcon />} size="large"
                    sx={{ bgcolor: 'white', color: 'black', fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700, '&:hover': { bgcolor: 'white', boxShadow: 'var(--edge-glow-hot)' } }}
                    onClick={onPlay}>
                    {t('detail.play')}
                </Button>
                <Tooltip title={listActionLabel}>
                    <IconButton onClick={onToggleList} aria-label={listActionLabel} sx={{
                        border: '2px solid rgba(76, 210, 255, 0.5)', color: 'var(--neon-accent)',
                        alignSelf: { xs: 'flex-start' }, width: 48, height: 48,
                        '&:hover': { borderColor: 'var(--neon-accent)', boxShadow: `0 0 10px var(--neon-accent)` }
                    }}>
                        {isInMyList ? <CheckIcon /> : <AddIcon />}
                    </IconButton>
                </Tooltip>
                <Button variant="outlined" startIcon={<GroupIcon />} size="large"
                    onClick={() => mediaStore.openWatchTogetherModal(item)} sx={{
                        borderColor: 'rgba(76, 210, 255, 0.5)', color: 'var(--text-primary)',
                        '&:hover': { borderColor: 'var(--neon-accent)', bgcolor: 'rgba(76, 210, 255, 0.12)',
                            boxShadow: `0 0 10px var(--neon-accent)` }
                    }}>
                    {t('detail.watchTogether')}
                </Button>
            </Stack>
        </Stack>
    );
});

DetailHeader.displayName = 'DetailHeader';

export default DetailHeader;
