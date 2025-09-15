import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Tooltip, Paper, List, Accordion, AccordionSummary, AccordionDetails, Stack, ListItemText } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { EpisodeLink, MediaItem, Season } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface ManageLinksViewProps {
    currentSeason: Season;
    item: MediaItem;
}

const ManageLinksView: React.FC<ManageLinksViewProps> = observer(({ currentSeason, item }) => {
    const { t } = useTranslations();
    const { deleteEpisodeLink, clearLinksForSeason, showSnackbar } = mediaStore;
    const [expandedAccordion, setExpandedAccordion] = useState<number | false>(false);

    const handleAccordionChange = (panelId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedAccordion(isExpanded ? panelId : false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar("notifications.copiedToClipboard", "success", true);
    }

    return (
        <Box sx={{mt: 2, flex: 1, overflowY: 'auto' }}>
            <Button
                color="error"
                variant="outlined"
                onClick={() => clearLinksForSeason(currentSeason.season_number, item.id)}
                sx={{ mb: 2 }}
            >
                {t('linkEpisodesModal.manage.deleteAllSeasonLinks')}
            </Button>
            <List>
                {currentSeason.episodes.map(episode => (
                    <Accordion 
                        key={episode.id}
                        expanded={expandedAccordion === episode.id}
                        onChange={handleAccordionChange(episode.id)}
                        sx={{ bgcolor: 'background.paper', backgroundImage: 'none', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.12)', '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography noWrap>{episode.episode_number}. {episode.name}</Typography>
                            <Typography sx={{ color: 'text.secondary', ml: 'auto', pl: 2 }}>
                                {t('linkEpisodesModal.manage.linksCount', { count: episode.video_urls?.length || 0 })}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {(!episode.video_urls || episode.video_urls.length === 0) ? (
                                <Typography color="text.secondary">{t('linkEpisodesModal.manage.noLinks')}</Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {episode.video_urls.map((link: EpisodeLink) => (
                                        <Paper key={link.id} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ListItemText primary={link.label} secondary={link.url} secondaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden'}}/>
                                            <Tooltip title={t('linkEpisodesModal.manage.copyUrl')}>
                                                <IconButton size="small" onClick={() => handleCopy(link.url)}><ContentCopyIcon fontSize='small' /></IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('linkEpisodesModal.manage.deleteLink')}>
                                                <IconButton size="small" onClick={() => deleteEpisodeLink(link.id!)} color="error"><DeleteIcon fontSize='small'/></IconButton>
                                            </Tooltip>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </AccordionDetails>
                    </Accordion>
                ))}
            </List>
        </Box>
    );
});

export default ManageLinksView;
