/**
 * @fileoverview ShowInfoPanel - collapsible "Info per show" expander
 * embedded inside `VideoLinksTab`. Renders the totals for a show
 * (episodes, total links, expired links, last-edited timestamp) and a
 * HoloChip for the preferred source when one is set.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Collapse, Stack, Typography} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {HoloChip} from '../../feedback/HoloChip.jsx';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleDateString(
            mediaStore.language === 'en' ? 'en-US' : 'it-IT',
            {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}
        );
    } catch (e) {
        return '';
    }
};

/**
 * ShowInfoPanel Component
 *
 * @param {Object} props
 * @param {number} props.showId - Show id this panel summarises.
 * @param {number} props.episodeCount - Total episodes for the show.
 * @param {number} props.totalLinks - Total links across all episodes.
 * @param {number} props.invalidLinks - Count of invalid links.
 * @param {boolean} props.expanded - Whether the panel is expanded.
 * @returns {React.ReactElement}
 */
export const ShowInfoPanel = observer(({
                                           showId,
                                           episodeCount,
                                           totalLinks,
                                           invalidLinks,
                                           expanded,
                                       }) => {
    const {t} = useTranslations();
    const lastEdited = mediaStore.libraryLastEdited.get(showId);
    const preferred = mediaStore.preferredSources.get(showId);

    return (
        <Collapse in={expanded} unmountOnExit>
            <Box
                className="holo-surface"
                data-component="show-info-panel"
                sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: '10px',
                    background: 'var(--holo-grad)',
                }}
            >
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={1}
                    sx={{flexWrap: 'wrap', rowGap: 1}}
                >
                    <HoloChip
                        id={`show-info-${showId}-episodes`}
                        label={t('libraryManagement.videoLinks.showInfo.episodes', {count: episodeCount})}
                    />
                    <HoloChip
                        id={`show-info-${showId}-links`}
                        label={t('libraryManagement.videoLinks.showInfo.links', {count: totalLinks})}
                    />
                    <HoloChip
                        id={`show-info-${showId}-invalid`}
                        label={t('libraryManagement.videoLinks.showInfo.invalid', {count: invalidLinks})}
                        sx={{
                            borderColor: 'var(--neon-accent-hot)',
                            color: 'var(--neon-accent-hot)',
                        }}
                    />
                    {preferred && (
                        <HoloChip
                            id={`show-info-${showId}-preferred`}
                            icon={<StarIcon/>}
                            label={`${t('libraryManagement.videoLinks.showInfo.preferredSource')}: ${preferred}`}
                        />
                    )}
                </Stack>
                {lastEdited && (
                    <Typography
                        variant="caption"
                        sx={{display: 'block', mt: 1, color: 'var(--text-secondary)'}}
                    >
                        {t('libraryManagement.videoLinks.showInfo.lastEdited', {date: formatDate(lastEdited)})}
                    </Typography>
                )}
            </Box>
        </Collapse>
    );
});

ShowInfoPanel.displayName = 'ShowInfoPanel';

export default ShowInfoPanel;
