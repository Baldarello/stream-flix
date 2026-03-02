import React from 'react';
import { Box, Container, Link, Typography, IconButton } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';

export const Footer: React.FC = () => {
  const socialIcons = [
    { icon: <FacebookIcon />, href: '#' },
    { icon: <InstagramIcon />, href: '#' },
    { icon: <TwitterIcon />, href: '#' },
    { icon: <YouTubeIcon />, href: '#' },
  ];

  return (
    <Container maxWidth="md" component="footer" sx={{ pt: 8, pb: 6, color: 'text.secondary', textAlign: 'center' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
        {socialIcons.map((social, index) => (
          <IconButton key={index} component="a" href={social.href} color="inherit" sx={{ '&:hover': { color: 'text.primary', transform: 'scale(1.1)' } }}>
            {social.icon}
          </IconButton>
        ))}
      </Box>
      <Typography variant="body2" sx={{ mt: 4 }}>
        &copy; 1997-2024 Quix, Inc.
      </Typography>
    </Container>
  );
};