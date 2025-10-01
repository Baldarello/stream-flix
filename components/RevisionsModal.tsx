import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, IconButton, List, Accordion, AccordionSummary, AccordionDetails, Button, CircularProgress, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UndoIcon from '@mui/icons-material/Undo';
import { useTranslations } from '../hooks/useTranslations';
import type { Revision } from '../types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 700 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const iconMap: Record<NonNullable<Revision['icon']>, React.ReactElement> = {
    add: <AddCircleOutlineIcon color="success" />,
    delete: <RemoveCircleOutlineIcon color="error" />,
    update: <EditIcon color="info" />,
    unknown: <HelpOutlineIcon color="disabled" />,
};

const RevisionsModal: React.FC = observer(() => {
    const { isRevisionsModalOpen, closeRevisionsModal, revisions, isRevisionsLoading, revertRevision } = mediaStore;
    const { t } = useTranslations();
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleRevert = (rev: Revision) => {
        if (window.confirm(t('revisions.revertConfirm'))) {
            revertRevision(rev);
        }
    };

    const handleToggle = (panelId: number) => {
        setExpandedId(prevId => (prevId === panelId ? null : panelId));
    };

    const renderContent = () => {
        if (isRevisionsLoading) {
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>{t('revisions.loading')}</Typography>
                </Box>
            );
        }

        if (revisions.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                    <Typography color="text.secondary">{t('revisions.noHistory')}</Typography>
                </Box>
            );
        }

        return (
            <List sx={{ flex: 1, overflowY: 'auto', mt: 2, pr: 1 }}>
                {revisions.map(rev => {
                    const isExpanded = expandedId === rev.id;
                    return (
                        <Accordion 
                            key={rev.id} 
                            sx={{ bgcolor: 'rgba(255,255,255,0.05)', backgroundImage: 'none', boxShadow: 'none' }}
                            expanded={isExpanded}
                            onChange={() => handleToggle(rev.id!)}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel${rev.id}-content`}
                                id={`panel${rev.id}-header`}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                                    {iconMap[rev.icon || 'unknown']}
                                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                        <Typography variant="body2" noWrap>{rev.description}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(rev.timestamp).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Tooltip title={t('revisions.revert')}>
                                        <IconButton onClick={(e) => { e.stopPropagation(); handleRevert(rev); }} size="small">
                                            <UndoIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Button 
                                        size="small" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggle(rev.id!);
                                        }}
                                    >
                                        {isExpanded ? t('revisions.hideRawData') : t('revisions.showRawData')}
                                    </Button>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                                {isExpanded && (
                                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                        {JSON.stringify({ table: rev.table, key: rev.key, type: rev.type, obj: rev.obj, oldObj: rev.oldObj }, null, 2)}
                                    </Typography>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </List>
        );
    };

    return (
        <Modal open={isRevisionsModalOpen} onClose={closeRevisionsModal}>
            <Box sx={style}>
                <IconButton onClick={closeRevisionsModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                <Typography variant="h6" component="h2">{t('revisions.title')}</Typography>
                {renderContent()}
            </Box>
        </Modal>
    );
});

export default RevisionsModal;