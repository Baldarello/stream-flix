import React, {useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {remoteStore} from '../../store/remoteStore.js';
import {
    Avatar,
    Box,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GoogleIcon from '@mui/icons-material/Google';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LogoutIcon from '@mui/icons-material/Logout';
import ShareIcon from '@mui/icons-material/Share';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import {handleSignIn, handleSignOut} from '../../services/googleAuthService.js';
import {useTranslations} from '../../hooks/useTranslations.js';

const ProfileDrawer = observer(() => {
    const {
        isProfileDrawerOpen, toggleProfileDrawer,
        isLoggedIn, googleUser, isSyncing, backupToDrive, restoreFromDrive, language, setLanguage,
        openShareModal, openImportModal, openRevisionsModal
    } = mediaStore;
    const {
        knownSlaves, reconnectToSlave,
        updateSlaveName, forgetSlave,
        openQRScanner
    } = remoteStore;
    const {t} = useTranslations();
    const [editingSlaveId, setEditingSlaveId] = useState(() => null);
    const [editedName, setEditedName] = useState(() => '');

    const handleScanQRCode = () => {
        openQRScanner();
    };

    const handleLanguageChange = (event, newLang) => {
        if (newLang !== null) {
            setLanguage(newLang);
        }
    };

    const handleStartEdit = (slave) => {
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

    const drawerContent = (
        <Box sx={{width: {xs: '70vw', sm: 300}}} role="presentation">
            <Box sx={{p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography variant="h6">{t('profileDrawer.profile')}</Typography>
                <IconButton onClick={() => toggleProfileDrawer(false)}>
                    <CloseIcon/>
                </IconButton>
            </Box>
            <Divider/>

            {isLoggedIn && googleUser ? (
                <List>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar alt={googleUser.name} src={googleUser.picture}/>
                        </ListItemAvatar>
                        <ListItemText primary={googleUser.name} secondary={googleUser.email}/>
                    </ListItem>
                </List>
            ) : null}

            <Box sx={{p: 2}}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.language')}</Typography>
                <ToggleButtonGroup
                    value={language}
                    exclusive
                    onChange={handleLanguageChange}
                    aria-label="language"
                    fullWidth
                    sx={{mt: 1}}
                >
                    <ToggleButton value="it" aria-label="italiano">IT</ToggleButton>
                    <ToggleButton value="en" aria-label="english">EN</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Divider/>
            <List>
                {isLoggedIn ? (
                    <>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => backupToDrive()} disabled={isSyncing}>
                                <ListItemIcon>{isSyncing ? <CircularProgress size={24}/> :
                                    <CloudUploadIcon/>}</ListItemIcon>
                                <ListItemText primary={t('profileDrawer.backup')}/>
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => restoreFromDrive()} disabled={isSyncing}>
                                <ListItemIcon>{isSyncing ? <CircularProgress size={24}/> :
                                    <CloudDownloadIcon/>}</ListItemIcon>
                                <ListItemText primary={t('profileDrawer.restore')}/>
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleSignOut}>
                                <ListItemIcon><LogoutIcon/></ListItemIcon>
                                <ListItemText primary={t('profileDrawer.logout')}/>
                            </ListItemButton>
                        </ListItem>
                    </>
                ) : (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleSignIn}>
                            <ListItemIcon><GoogleIcon/></ListItemIcon>
                            <ListItemText primary={t('profileDrawer.login')}/>
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
            <Divider/>
            <Box sx={{px: 2, pt: 1}}>
                <Typography variant="overline" color="text.secondary">{t('profileDrawer.savedDevices')}</Typography>
            </Box>
            <List dense>
                {knownSlaves.length === 0 ? (
                    <ListItem>
                        <ListItemText secondary={t('profileDrawer.noSavedDevices')} sx={{pl: 2}}/>
                    </ListItem>
                ) : (
                    knownSlaves.map(slave => {
                        console.log("slave", slave)
                        const isOnline = slave.isOnline ?? false;
                        return (
                            <ListItem
                                key={slave.id}
                                secondaryAction={editingSlaveId !== slave.id ? (
                                    <>
                                        <Tooltip title={t('profileDrawer.editName')}>
                                            <IconButton edge="end" onClick={() => handleStartEdit(slave)}
                                                        disabled={!isOnline}>
                                                <EditIcon/>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('profileDrawer.forgetDevice')}>
                                            <IconButton edge="end" onClick={() => forgetSlave(slave.id)} sx={{ml: 0.5}}>
                                                <DeleteIcon/>
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                ) : null}
                                disablePadding
                            >
                                {editingSlaveId === slave.id ? (
                                    <Stack direction="row" spacing={1} alignItems="center"
                                           sx={{width: '100%', px: 2, py: 1}}>
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
                                            <IconButton onClick={handleSaveEdit} size="small"><CheckIcon/></IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('profileDrawer.cancel')}>
                                            <IconButton onClick={handleCancelEdit}
                                                        size="small"><CloseIcon/></IconButton>
                                        </Tooltip>
                                    </Stack>
                                ) : (
                                    <ListItemButton onClick={() => reconnectToSlave(slave.id)} disabled={!isOnline}>
                                        <ListItemIcon>
                                            <Box sx={{position: 'relative'}}>
                                                <TvIcon/>
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: -2,
                                                    right: -2,
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: isOnline ? 'success.main' : 'text.disabled',
                                                    border: '2px solid',
                                                    borderColor: 'background.paper',
                                                }}/>
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={slave.name}
                                            secondary={isOnline ? t('profileDrawer.online') : t('profileDrawer.offline')}
                                        />
                                    </ListItemButton>
                                )}
                            </ListItem>
                        )
                    })
                )}
            </List>
            <Divider/>
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleScanQRCode}>
                        <ListItemIcon><QrCodeScannerIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.scanQR')}/>
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => remoteStore.enableSmartTVMode()}>
                        <ListItemIcon><TvIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.showQR')}/>
                    </ListItemButton>
                </ListItem>
                <Divider sx={{my: 1}}/>
                <ListItem>
                    <Typography variant="overline" color="text.secondary">{t('profileDrawer.library')}</Typography>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => openShareModal()}>
                        <ListItemIcon><ShareIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.share')}/>
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => openImportModal()}>
                        <ListItemIcon><FileUploadIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.import')}/>
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => openRevisionsModal()}>
                        <ListItemIcon><HistoryIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.history')}/>
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => { mediaStore.setActiveView('Libreria'); toggleProfileDrawer(false); }}>
                        <ListItemIcon><EditIcon/></ListItemIcon>
                        <ListItemText primary={t('profileDrawer.manageLibrary')}/>
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
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: 'background.paper'
                    }
                }
            }}
        >
            {drawerContent}
        </Drawer>
    );
});

export default ProfileDrawer;
