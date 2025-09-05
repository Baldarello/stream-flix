import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, useScrollTrigger, Slide } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const navItems = ['Home', 'Serie TV', 'Film', 'Anime', 'La mia lista'];

export const Header: React.FC = () => {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      <AppBar 
        elevation={0}
        sx={{ 
          bgcolor: trigger ? 'background.default' : 'transparent',
          transition: 'background-color 0.3s ease-in-out',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', height: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Typography 
              variant="h6" 
              noWrap
              component="a"
              href="#"
              sx={{
                mr: 2,
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                letterSpacing: '.1rem',
                textTransform: 'uppercase',
              }}
            >
              StreamFlix
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
              {navItems.map((item) => (
                <Button key={item} sx={{ color: 'white', my: 2, display: 'block' }}>
                  {item}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit">
              <SearchIcon />
            </IconButton>
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
            <IconButton color="inherit">
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    </Slide>
  );
};
