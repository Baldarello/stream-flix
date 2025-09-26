import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Box, Typography, Button, IconButton, Tooltip, Paper, List, Accordion, AccordionSummary, AccordionDetails, Stack, ListItemText, TextField, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
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
    const { deleteMediaLink, updateMediaLink, clearLinksForSeason, showSnackbar, updateLinksDomain, preferredSources, setPreferredSource, clearLinksForDomain } = mediaStore;
    const [domainInputs, setDomainInputs] = useState<Record<string, string>>({});
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<MediaLink>>({});


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
    
    const handleDeleteDomain = (origin: string, count: number) => {
        if (window.confirm(t('linkEpisodesModal.manage.deleteAllFromDomainConfirm', { count, domain: origin }))) {
            clearLinksForDomain(item.id, currentSeason.season_number, origin);
        }
    };

    const handleStartEdit = (link: MediaLink) => {
        setEditingLinkId(link.id!);
        setEditFormData({
            url: link.url,
            label: link.label,
            language: link.language,
            type: link.type
        });
    };

    const handleCancelEdit = () => {
        setEditingLinkId(null);
        setEditFormData({});
    };

    const handleSaveEdit = () => {
        if (editingLinkId && editFormData) {
            updateMediaLink(editingLinkId, editFormData);
            handleCancelEdit();
        }
    };

    const handleEditFormChange = (field: keyof MediaLink, value: string) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    
    const preferredOriginForShow = preferredSources.get(item.id);

    return (
        <Box sx={{mt: 2, flex: 1, overflowY: 'auto',padding:"10px" }}>
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
                                        {/* FIX: Added Array.isArray guard for robustness, preventing errors if 'links' is not an array. */}
                                        {t('linkEpisodesModal.manage.linksFrom', { count: Array.isArray(links) ? links.length : 0 })} <strong>{origin}</strong>
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
                                        <Tooltip title={t('linkEpisodesModal.manage.deleteAllFromDomainTooltip')}>
                                            {/* FIX: Added Array.isArray guard for robustness, preventing errors if 'links' is not an array. */}
                                            <IconButton color="error" onClick={() => handleDeleteDomain(origin, Array.isArray(links) ? links.length : 0)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
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
                            <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                                <Typography noWrap>{episode.episode_number}. {episode.name}</Typography>
                            </Box>
                            <Typography sx={{ color: 'text.secondary', flexShrink: 0 }}>
                                {t('linkEpisodesModal.manage.linksCount', { count: Array.isArray(episode.video_urls) ? episode.video_urls.length : 0 })}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {/* FIX: Add Array.isArray guard to ensure `episode.video_urls` is an array before calling .map() or accessing .length. */}
                            {(Array.isArray(episode.video_urls) && episode.video_urls.length > 0) ? (
                                <Stack spacing={1}>
                                    {episode.video_urls.map((link: MediaLink) => {
                                        const isEditing = editingLinkId === link.id;
                                        const truncatedLabel = link.label.length > 16 ? `${link.label.substring(0, 16)}...` : link.label;

                                        return isEditing ? (
                                            <Paper key={link.id} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <TextField size="small" fullWidth label="URL" value={editFormData.url} onChange={e => handleEditFormChange('url', e.target.value)} />
                                                <TextField size="small" fullWidth label={t('linkEpisodesModal.add.linkLabel')} value={editFormData.label} onChange={e => handleEditFormChange('label', e.target.value)} />
                                                <Stack direction="row" spacing={2}>
                                                    <TextField
                                                        label={t('linkEpisodesModal.add.language')}
                                                        value={editFormData.language}
                                                        onChange={e => handleEditFormChange('language', e.target.value.toUpperCase())}
                                                        size="small"
                                                        sx={{width: '100px'}}
                                                        inputProps={{ maxLength: 3 }}
                                                    />
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>{t('linkEpisodesModal.add.type')}</InputLabel>
                                                        <Select value={editFormData.type} label={t('linkEpisodesModal.add.type')} onChange={(e) => handleEditFormChange('type', e.target.value as 'sub' | 'dub')}>
                                                            <MenuItem value="sub">{t('linkEpisodesModal.add.sub')}</MenuItem>
                                                            <MenuItem value="dub">{t('linkEpisodesModal.add.dub')}</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Stack>
                                                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                                    <Tooltip title={t('linkEpisodesModal.manage.cancel')}>
                                                        <IconButton onClick={handleCancelEdit}><CancelIcon /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title={t('linkEpisodesModal.manage.save')}>
                                                         <IconButton onClick={handleSaveEdit} color="primary"><SaveIcon /></IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Paper>
                                        ) : (
                                            <Paper key={link.id} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ListItemText primary={truncatedLabel} secondary={link.url} secondaryTypographyProps={{noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden'}}/>
                                                <Chip label={link.language} size="small" variant="outlined" sx={{ mr: 1 }} />
                                                <Chip label={t(`linkEpisodesModal.add.${link.type}`)} size="small" color={link.type === 'dub' ? 'info' : 'primary'} variant="outlined" sx={{ mr: 1 }} />
                                                <Tooltip title={t('linkEpisodesModal.manage.copyUrl')}>
                                                    <IconButton size="small" onClick={() => handleCopy(link.url)}><ContentCopyIcon fontSize='small' /></IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('linkEpisodesModal.manage.editLink')}>
                                                    <IconButton size="small" onClick={() => handleStartEdit(link)}><EditIcon fontSize='small' /></IconButton>
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