import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, useScrollTrigger, Slide } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { observer } from 'mobx-react-lite';
import { mediaStore, ActiveView } from '../store/mediaStore';

const navItems = ['Home', 'Serie TV', 'Film', 'Anime', 'La mia lista'];

export const Header: React.FC = observer(() => {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      <AppBar 
        elevation={0}
        sx={{ 
          bgcolor: trigger ? 'rgba(20, 20, 20, 0.7)' : 'transparent',
          backdropFilter: trigger ? 'blur(10px)' : 'none',
          transition: 'background-color 0.3s ease-in-out',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', height: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Typography 
              variant="h6" 
              noWrap
              component="div"
              onClick={() => mediaStore.setActiveView('Home')}
              sx={{
                mr: 2,
                fontWeight: 700,
                color: 'primary.main',
                textDecoration: 'none',
                letterSpacing: '.1rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Quix
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
              {navItems.map((item) => (
                <Button 
                  key={item} 
                  sx={{ 
                    color: 'white', 
                    my: 2, 
                    display: 'block',
                    fontWeight: mediaStore.activeView === item ? 700 : 400,
                    opacity: mediaStore.activeView === item ? 1 : 0.8,
                     '&:hover': {
                      opacity: 1,
                    }
                  }}
                  onClick={() => mediaStore.setActiveView(item as ActiveView)}
                >
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
});