import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Drawer, Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, IconButton } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import GoogleIcon from '@mui/icons-material/Google';
import CloseIcon from '@mui/icons-material/Close';

const ProfileDrawer: React.FC = () => {
    const { isProfileDrawerOpen, toggleProfileDrawer, openQRScanner } = mediaStore;

    const handleScanQRCode = () => {
        // The openQRScanner action already closes the drawer
        openQRScanner();
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
