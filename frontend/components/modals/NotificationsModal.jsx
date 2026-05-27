import React from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';


const NotificationsModal = observer(() => {
    const {isNotificationsModalOpen, notifications, closeNotificationsModal, markAllNotificationsRead, clearNotifications, markNotificationRead} = mediaStore;
    const {t} = useTranslations();

    const handleManageLinks = (notification) => {
        const invalidLinks = notification.data;
        if (invalidLinks.length > 0) {
            const firstLink = invalidLinks[0];
            // Find the show from cache
            const show = mediaStore.cachedItems.get(firstLink.showId);
            if (show) {
                markNotificationRead(notification.id);
                closeNotificationsModal();
                // Navigate to Library Management View - Links tab with filters set
                mediaStore.setActiveView('Libreria');
                mediaStore.navigateToLibraryLinksTab(show.id);
            }
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog
            open={isNotificationsModalOpen}
            onClose={closeNotificationsModal}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                }
            }}
        >
            <DialogTitle sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <Typography variant="h6" component="span">
                    {t('notifications.title')}
                </Typography>
                <Box sx={{display: 'flex', gap: 1}}>
                    {notifications.length > 0 && (
                        <>
                            <Button
                                size="small"
                                startIcon={<MarkEmailReadIcon />}
                                onClick={markAllNotificationsRead}
                                color="primary"
                            >
                                {t('notifications.markAllRead')}
                            </Button>
                            <Button
                                size="small"
                                startIcon={<DeleteOutlineIcon />}
                                onClick={clearNotifications}
                                color="error"
                            >
                                {t('notifications.clearAll')}
                            </Button>
                        </>
                    )}
                    <IconButton onClick={closeNotificationsModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {notifications.length === 0 ? (
                    <Box sx={{textAlign: 'center', py: 4}}>
                        <Typography variant="body1" color="text.secondary">
                            {t('notifications.noNotifications')}
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {notifications.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                {index > 0 && <Divider />}
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                                        borderRadius: 1,
                                        mb: 1,
                                    }}
                                    secondaryAction={
                                        !notification.read && (
                                            <Chip
                                                size="small"
                                                label={t('notifications.new')}
                                                color="primary"
                                                sx={{mr: 1}}
                                            />
                                        )
                                    }
                                >
                                    <ListItemIcon sx={{minWidth: 40}}>
                                        <WarningIcon color="warning" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" fontWeight={notification.read ? 'normal' : 'bold'}>
                                                {t(notification.title)}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box sx={{mt: 1}}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t(notification.message, {count: notification.data.length})}
                                                </Typography>
                                                
                                                {/* Group invalid links by show and season */}
                                                {(() => {
                                                    // Group by showId
                                                    const groupedByShow = notification.data.reduce((acc, link) => {
                                                        const key = `${link.showId}-${link.seasonNumber || 'movie'}`;
                                                        if (!acc[key]) {
                                                            acc[key] = {
                                                                showName: link.showName,
                                                                showId: link.showId,
                                                                seasonNumber: link.seasonNumber,
                                                                links: [],
                                                            };
                                                        }
                                                        acc[key].links.push(link);
                                                        return acc;
                                                    }, {});

                                                    return (
                                                        <Box sx={{mt: 2, mb: 1}}>
                                                            {Object.values(groupedByShow).map((group, idx) => (
                                                                <Box key={idx} sx={{mb: 1}}>
                                                                    <Typography variant="body2" sx={{fontWeight: 600}}>
                                                                        {group.showName}
                                                                        {group.seasonNumber && ` - ${t('notifications.season')} ${group.seasonNumber}`}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{mt: 0.5}}>
                                                                        <Chip
                                                                            size="small"
                                                                            label={`${group.links.length} ${t('libraryManagement.filters.invalidLink')}`}
                                                                            color="error"
                                                                            variant="outlined"
                                                                            icon={<WarningIcon />}
                                                                        />
                                                                    </Stack>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    );
                                                })()}

                                                {/* Actions */}
                                                <Box sx={{mt: 2, display: 'flex', gap: 1}}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<OpenInNewIcon />}
                                                        onClick={() => handleManageLinks(notification)}
                                                    >
                                                        {t('notifications.manageLinks')}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => mediaStore.dismissNotification(notification.id)}
                                                    >
                                                        {t('notifications.dismiss')}
                                                    </Button>
                                                </Box>

                                                <Typography variant="caption" sx={{display: 'block', mt: 2, color: 'text.disabled'}}>
                                                    {formatDate(notification.createdAt)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={closeNotificationsModal}>
                    {t('common.close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default NotificationsModal;
