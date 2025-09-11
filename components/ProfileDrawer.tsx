import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore, ThemeName } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, IconButton, ToggleButtonGroup, ToggleButton, colors } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GoogleIcon from '@mui/icons-material/Google';
import CloseIcon from '@mui/icons-material/Close';
import TvIcon from '@mui/icons-material/Tv';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import AnimationIcon from '@mui/icons-material/Animation';

const ProfileDrawer: React.FC = () => {
    const { isProfileDrawerOpen, toggleProfileDrawer, openQRScanner, enableSmartTVMode } = mediaStore;

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
    
    const themeColors: Record<ThemeName, string> = {
        SerieTV: '#E50914',
        Film: colors.amber[500],
        Anime: colors.deepPurple[300],
    };

    const drawerContent = (
        <Box sx={{ width: { xs: '70vw', sm: 300 } }} role="presentation">
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Typography variant="h6">Profilo</Typography>
                 <IconButton onClick={() => toggleProfileDrawer(false)}>
                     <CloseIcon />
                 </IconButton>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">Stile Sito</Typography>
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
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>Serie TV</Typography>
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
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>Film</Typography>
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
                            <Typography component="span" sx={{ fontWeight: 'inherit' }}>Anime</Typography>
                        </Box>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: themeColors.Anime }} />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton>
                        <ListItemIcon><GoogleIcon /></ListItemIcon>
                        <ListItemText primary="Accedi con Google" />
                    </ListItemButton>
                </ListItem>
                 <ListItem disablePadding>
                    <ListItemButton onClick={handleScanQRCode}>
                        <ListItemIcon><QrCodeScannerIcon /></ListItemIcon>
                        <ListItemText primary="Scansiona QR Code TV" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={enableSmartTVMode}>
                        <ListItemIcon><TvIcon /></ListItemIcon>
                        <ListItemText primary="Mostra QR Code per Telecomando" />
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
};

export default observer(ProfileDrawer);