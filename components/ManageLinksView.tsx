import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Tooltip, Paper, List, Accordion, AccordionSummary, AccordionDetails, Stack, ListItemText, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import type { MediaLink, MediaItem, Season } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface ManageLinksViewProps {
    currentSeason: Season;
    item: MediaItem;
    expandedAccordion: number | false;
    onAccordionChange: (panelId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

const ManageLinksView: React.FC<ManageLinksViewProps> = observer(({ currentSeason, item, expandedAccordion, onAccordionChange }) => {
    const { t } = useTranslations();
    const { deleteMediaLink, clearLinksForSeason, showSnackbar, updateLinksDomain, preferredSources, setPreferredSource } = mediaStore;
    const [domainInputs, setDomainInputs] = useState<Record<string, string>>({});

    const linksByDomain = currentSeason.episodes
        .flatMap(ep => ep.video_urls || [])
        .reduce((acc, link) => {
            try {
                const origin = new URL(link.url).origin;
                if (!acc[origin]) {
                    acc[origin] = [];
                }
                acc[origin].push(link);
            } catch (e) {
                // Ignore invalid URLs
            }
            return acc;
        }, {} as Record<string, MediaLink[]>);

    useEffect(() => {
        const initialInputs: Record<string, string> = {};
        Object.keys(linksByDomain).forEach(origin => {
            initialInputs[origin] = origin;
        });
        setDomainInputs(initialInputs);
    }, [currentSeason.id]);


    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        showSnackbar("notifications.copiedToClipboard", "success", true);
    }

    const handleDomainInputChange = (origin: string, value: string) => {
        setDomainInputs(prev => ({ ...prev, [origin]: value }));
    };

    const handleUpdateDomain = (origin: string) => {
        const linksToUpdate = linksByDomain[origin];
        const newDomain = domainInputs[origin];
        if (linksToUpdate && newDomain) {
            updateLinksDomain({ links: linksToUpdate, newDomain });
        }
    };
    
    const preferredOriginForShow = preferredSources.get(item.id);

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

            {Object.keys(linksByDomain).length > 0 && (
                <Accordion sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)', backgroundImage: 'none' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{t('linkEpisodesModal.manage.groupOps')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('linkEpisodesModal.manage.groupOpsInfo')}
                        </Typography>
                        <Stack spacing={2}>
                            {Object.entries(linksByDomain).map(([origin, links]) => {
                                const isPreferred = preferredOriginForShow === origin;
                                const tooltipTitle = isPreferred ? t('linkEpisodesModal.manage.removePreferred') : t('linkEpisodesModal.manage.setAsPreferred');
                                return (
                                <Paper key={origin} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                                    <Tooltip title={tooltipTitle}>
                                         <IconButton 
                                            onClick={() => setPreferredSource(item.id, origin)}
                                            sx={{ position: 'absolute', top: 4, right: 4 }}
                                         >
                                            {isPreferred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                                        </IconButton>
                                    </Tooltip>
                                    <Typography gutterBottom>
                                        {t('linkEpisodesModal.manage.linksFrom', { count: links.length })} <strong>{origin}</strong>
                                    </Typography>
                                    {/* FIX: The `alignItems` prop is a system prop and should be passed inside the `sx` object. */}
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <TextField
                                            label={t('linkEpisodesModal.manage.newDomain')}
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            value={domainInputs[origin] || ''}
                                            onChange={(e) => handleDomainInputChange(origin, e.target.value)}
                                        />
                                        <Button variant="contained" onClick={() => handleUpdateDomain(origin)}>
                                            {t('linkEpisodesModal.manage.update')}
                                        </Button>
                                    </Stack>
                                </Paper>
                            )})}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            )}

            <List>
                {currentSeason.episodes.map(episode => (
                    <Accordion 
                        key={episode.id}
                        expanded={expandedAccordion === episode.id}
                        onChange={onAccordionChange(episode.id)}
                        sx={{ bgcolor: 'background.paper', backgroundImage: 'none', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.12)', '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography noWrap>{episode.episode_number}. {episode.name}</Typography>
                            <Typography sx={{ color: 'text.secondary', ml: 'auto', pl: 2 }}>
                                {/* FIX: Use Array.isArray for robustness against unexpected data shapes. */}
                                {t('linkEpisodesModal.manage.linksCount', { count: Array.isArray(episode.video_urls) ? episode.video_urls.length : 0 })}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {/* FIX: Add Array.isArray guard to ensure `episode.video_urls` is an array before calling .map() or accessing .length. */}
                            {(Array.isArray(episode.video_urls) && episode.video_urls.length > 0) ? (
                                <Stack spacing={1}>
                                    {episode.video_urls.map((link: MediaLink) => {
                                        const truncatedLabel = link.label.length > 16 ? `${link.label.substring(0, 16)}...` : link.label;
                                        return (
                                            <Paper key={link.id} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ListItemText primary={truncatedLabel} secondary={link.url} secondaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden'}}/>
                                                <Tooltip title={t('linkEpisodesModal.manage.copyUrl')}>
                                                    <IconButton size="small" onClick={() => handleCopy(link.url)}><ContentCopyIcon fontSize='small' /></IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('linkEpisodesModal.manage.deleteLink')}>
                                                    <IconButton size="small" onClick={() => deleteMediaLink(link.id!)} color="error"><DeleteIcon fontSize='small'/></IconButton>
                                                </Tooltip>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                <Typography color="text.secondary">{t('linkEpisodesModal.manage.noLinks')}</Typography>
                            )}
                        </AccordionDetails>
                    </Accordion>
                ))}
            </List>
        </Box>
    );
});

export default ManageLinksView;