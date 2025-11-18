
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore, ThemeName, Language } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, IconButton, ToggleButtonGroup, ToggleButton, colors, Avatar, ListItemAvatar, CircularProgress, Stack, TextField, Tooltip } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GoogleIcon from '@mui/icons-material/Google';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import AnimationIcon from '@mui/icons-material/Animation';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LogoutIcon from '@mui/icons-material/Logout';
import ShareIcon from '@mui/icons-material/Share';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import { handleSignIn, handleSignOut } from '../services/googleAuthService';
import { useTranslations } from '../hooks/useTranslations';

const ProfileDrawer: React.FC = observer(() => {
    const { 
        isProfileDrawerOpen, toggleProfileDrawer, openQRScanner, enableSmartTVMode,
        isLoggedIn, googleUser, isSyncing, backupToDrive, restoreFromDrive, language, setLanguage,
        openShareModal, openImportModal, openRevisionsModal, knownSlaves, reconnectToSlave,
        updateSlaveName, forgetSlave
    } = mediaStore;
    const { t } = useTranslations();
    const [editingSlaveId, setEditingSlaveId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');

    const handleScanQRCode = () => {
        openQRScanner();
    };

    const handleThemeChange = (
        event: React.MouseEvent<HTMLElement>,
        newTheme: ThemeName | null,
    ) => {
        if (newTheme !== null) {
            mediaStore.setActiveTheme(newTheme);
            mediaStore.setActiveView('Home'); // Navigate to home to see the changes
            toggleProfileDrawer(false); // Close the drawer
        }
    };
    
    const handleLanguageChange = (
        event: React.MouseEvent<HTMLElement>,
        newLang: Language | null,
    ) => {
        if (newLang !== null) {
            setLanguage(newLang);
        }
    };

    const handleStartEdit = (slave: { id: string, name: string }) => {
        setEditingSlaveId(slave.id);
        setEditedName(slave.name);
    };

    const handleCancelEdit = () => {
        setEditingSlaveId(null);
        setEditedName('');
    };

    const handleSaveEdit = () => {
        if (editingSlaveId && editedName.trim()) {
            updateSlaveName(editingSlaveId, editedName.trim());
            handleCancelEdit();
        }
    };

    const themeColors: Record<ThemeName, string> = {
        SerieTV: '#E50914',
        Film: colors.amber[500],
        Anime: colors.deepPurple[300],
    };

    const drawerContent = (
        <Box sx={{ width: { xs: '70vw', sm: 300 } }} role="presentation">
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Typography variant="h6">{t('profileDrawer.profile')}</Typography>
                 <IconButton onClick={() => toggleProfileDrawer(false)}>
                     <CloseIcon />
                 </IconButton>
            </Box>
            <Divider />

            {isLoggedIn && googleUser ? (
                <List>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar alt={googleUser.name} src={googleUser.picture} />
                        </ListItemAvatar>
                        <ListItemText primary={googleUser.name} secondary={googleUser.email} />
                    </ListItem>
                </List>
            ) : null}

            <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.language')}</Typography>
                 <ToggleButtonGroup
                    value={language}
                    exclusive
                    onChange={handleLanguageChange}
                    aria-label="language"
                    fullWidth
                    sx={{ mt: 1 }}
                >
                    <ToggleButton value="it" aria-label="italiano">IT</ToggleButton>
                    <ToggleButton value="en" aria-label="english">EN</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Divider />


            <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.siteStyle')}</Typography>
                <ToggleButtonGroup
                    value={mediaStore.activeTheme}
                    exclusive
                    onChange={handleThemeChange}
                    aria-label="site theme"
                    fullWidth
                    orientation="vertical"
                    sx={{ mt: 1, '& .MuiToggleButtonGroup-grouped': { border: 0, '&:not(:first-of-type)': { borderRadius: '4px' }, '&:first-of-type': { borderRadius: '4px' } } }}
                >
                    <ToggleButton
                        value="SerieTV"
                        aria-label="serie tv theme"
                        sx={{
                            justifyContent: 'space-between',
                            p: 1.5,
                            '&.Mui-selected, &.Mui-selected:hover': {
                                backgroundColor: 'rgba(229, 9, 20, 0.15)',
                                borderLeft: `4px solid ${themeColors.SerieTV}`,
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LiveTvIcon />
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>{t('profileDrawer.theme.series')}</Typography>
                        </Box>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: themeColors.SerieTV }} />
                    </ToggleButton>
                    <ToggleButton
                        value="Film"
                        aria-label="film theme"
                        sx={{
                            justifyContent: 'space-between',
                            p: 1.5,
                            '&.Mui-selected, &.Mui-selected:hover': {
                                backgroundColor: `${colors.amber[500]}26`,
                                borderLeft: `4px solid ${themeColors.Film}`,
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LocalMoviesIcon />
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>{t('profileDrawer.theme.movies')}</Typography>
                        </Box>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: themeColors.Film }} />
                    </ToggleButton>
                    <ToggleButton
                        value="Anime"
                        aria-label="anime theme"
                        sx={{
                            justifyContent: 'space-between',
                            p: 1.5,
                            '&.Mui-selected, &.Mui-selected:hover': {
                                backgroundColor: `${colors.deepPurple[300]}26`,
                                borderLeft: `4px solid ${themeColors.Anime}`,
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AnimationIcon />
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>{t('profileDrawer.theme.anime')}</Typography>
                        </Box>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: themeColors.Anime }} />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Divider />
            <List>
                 {isLoggedIn ? (
                    <>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => backupToDrive()} disabled={isSyncing}>
                                <ListItemIcon>{isSyncing ? <CircularProgress size={24} /> : <CloudUploadIcon />}</ListItemIcon>
                                <ListItemText primary={t('profileDrawer.backup')} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => restoreFromDrive()} disabled={isSyncing}>
                                <ListItemIcon>{isSyncing ? <CircularProgress size={24} /> : <CloudDownloadIcon />}</ListItemIcon>
                                <ListItemText primary={t('profileDrawer.restore')} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleSignOut}>
                                <ListItemIcon><LogoutIcon /></ListItemIcon>
                                <ListItemText primary={t('profileDrawer.logout')} />
                            </ListItemButton>
                        </ListItem>
                    </>
                ) : (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleSignIn}>
                            <ListItemIcon><GoogleIcon /></ListItemIcon>
                            <ListItemText primary={t('profileDrawer.login')} />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
            <Divider />
             <Box sx={{ p: 2, pb: 0 }}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.playbackPreferences')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t('profileDrawer.preferredLabelsDesc')}</Typography>
                <Box sx={{ maxHeight: '20vh', overflowY: 'auto', mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <List dense disablePadding>
                        {mediaStore.allUniqueLabels.length > 0 ? mediaStore.allUniqueLabels.map(label => (
                            <ListItem
                                key={label}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => mediaStore.togglePreferredLabel(label)} aria-label={`Toggle preference for ${label}`}>
                                        {mediaStore.preferredLabels.includes(label) ? <StarIcon color="warning" /> : <StarBorderIcon />}
                                    </IconButton>
                                }
                                disablePadding
                            >
                                <ListItemButton dense onClick={() => mediaStore.togglePreferredLabel(label)}>
                                    <ListItemText primary={label} />
                                </ListItemButton>
                            </ListItem>
                        )) : (
                            <ListItem>
                                <ListItemText primary={t('profileDrawer.noLabelsFound')} secondary={t('profileDrawer.noLabelsFoundDesc')} />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Box>
            <Divider sx={{ my: 1 }}/>
            <Box sx={{ px: 2, pt: 1 }}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.savedDevices')}</Typography>
            </Box>
            <List dense>
                {knownSlaves.length === 0 ? (
                    <ListItem>
                        <ListItemText secondary={t('profileDrawer.noSavedDevices')} sx={{ pl: 2 }} />
                    </ListItem>
                ) : (
                    knownSlaves.map(slave => (
                        <ListItem 
                            key={slave.id}
                            secondaryAction={ editingSlaveId !== slave.id ? (
                                <>
                                    <Tooltip title={t('profileDrawer.editName')}>
                                        <IconButton edge="end" onClick={() => handleStartEdit(slave)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('profileDrawer.forgetDevice')}>
                                        <IconButton edge="end" onClick={() => forgetSlave(slave.id)} sx={{ ml: 0.5 }}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            ) : null}
                            disablePadding
                        >
                            {editingSlaveId === slave.id ? (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', px: 2, py: 1 }}>
                                    <TextField
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        size="small"
                                        variant="standard"
                                        autoFocus
                                        fullWidth
                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                                    />
                                    <Tooltip title={t('profileDrawer.save')}>
                                        <IconButton onClick={handleSaveEdit} size="small"><CheckIcon /></IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('profileDrawer.cancel')}>
                                        <IconButton onClick={handleCancelEdit} size="small"><CloseIcon /></IconButton>
                                    </Tooltip>
                                </Stack>
                            ) : (
                                <ListItemButton onClick={() => reconnectToSlave(slave.id)}>
                                    <ListItemIcon><TvIcon /></ListItemIcon>
                                    <ListItemText primary={slave.name} secondary={`ID: ${slave.id.substring(7, 13)}`} />
                                </ListItemButton>
                            )}
                        </ListItem>
                    ))
                )}
            </List>
            <Divider />
            <List>
                 <ListItem disablePadding>
                    <ListItemButton onClick={handleScanQRCode}>
                        <ListItemIcon><QrCodeScannerIcon /></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.scanQR')} />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={enableSmartTVMode}>
                        <ListItemIcon><TvIcon /></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.showQR')} />
                    </ListItemButton>
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem>
                    <Typography variant="overline" color="text.secondary">{t('profileDrawer.library')}</Typography>
                </ListItem>
                 <ListItem disablePadding>
                    <ListItemButton onClick={() => openShareModal()}>
                        <ListItemIcon><ShareIcon /></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.share')} />
                    </ListItemButton>
                </ListItem>
                 <ListItem disablePadding>
                    <ListItemButton onClick={() => openImportModal()}>
                        <ListItemIcon><FileUploadIcon /></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.import')} />
                    </ListItemButton>
                </ListItem>
                 <ListItem disablePadding>
                    <ListItemButton onClick={() => openRevisionsModal()}>
                        <ListItemIcon><HistoryIcon /></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.history')} />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Drawer
            anchor="right"
            open={isProfileDrawerOpen}
            onClose={() => toggleProfileDrawer(false)}
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper'
                }
            }}
        >
            {drawerContent}
        </Drawer>
    );
});

export default ProfileDrawer;
