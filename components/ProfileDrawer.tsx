import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore, ThemeName, Language } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, IconButton, ToggleButtonGroup, ToggleButton, colors, Avatar, ListItemAvatar, CircularProgress } from '@mui/material';
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
import { handleSignIn, handleSignOut } from '../services/googleAuthService';
import { useTranslations } from '../hooks/useTranslations';

const ProfileDrawer: React.FC = observer(() => {
    const { 
        isProfileDrawerOpen, toggleProfileDrawer, openQRScanner, enableSmartTVMode,
        isLoggedIn, googleUser, isBackingUp, isRestoring, backupToDrive, restoreFromDrive, language, setLanguage
    } = mediaStore;
    const { t } = useTranslations();

    const handleScanQRCode = () => {
        openQRScanner();
    };

    const handleThemeChange = (
        event: React.MouseEvent<HTMLElement>,
        newTheme: ThemeName | null,
    ) => {
        if (newTheme !== null) {
            mediaStore.setActiveTheme(newTheme);
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
                            <ListItemButton onClick={backupToDrive} disabled={isBackingUp || isRestoring}>
                                <ListItemIcon>{isBackingUp ? <CircularProgress size={24} /> : <CloudUploadIcon />}</ListItemIcon>
                                <ListItemText primary={t('profileDrawer.backup')} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={restoreFromDrive} disabled={isRestoring || isBackingUp}>
                                <ListItemIcon>{isRestoring ? <CircularProgress size={24} /> : <CloudDownloadIcon />}</ListItemIcon>
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
                <Divider sx={{ my: 1 }} />
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