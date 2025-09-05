import React from 'react';
import { Box, Container, Grid, Link, Typography, IconButton } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';

export const Footer: React.FC = () => {
  const links = [
    'Audio and Subtitles', 'Audio Description', 'Help Center', 'Gift Cards',
    'Media Center', 'Investor Relations', 'Jobs', 'Terms of Use',
    'Privacy', 'Legal Notices', 'Cookie Preferences', 'Corporate Information',
    'Contact Us'
  ];

  const socialIcons = [
    { icon: <FacebookIcon />, href: '#' },
    { icon: <InstagramIcon />, href: '#' },
    { icon: <TwitterIcon />, href: '#' },
    { icon: <YouTubeIcon />, href: '#' },
  ];

  return (
    <Container maxWidth="md" component="footer" sx={{ pt: 8, pb: 6, color: 'text.secondary' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {socialIcons.map((social, index) => (
          <IconButton key={index} component="a" href={social.href} color="inherit" sx={{ '&:hover': { color: 'text.primary' } }}>
            {social.icon}
          </IconButton>
        ))}
      </Box>
      <Grid container spacing={2}>
        {links.map((link) => (
          // In MUI Grid v2+, a Grid component with breakpoint props (e.g., xs, sm) is implicitly
          // a grid item when it's a direct child of a Grid container.
          // FIX: Added the `item` prop to correctly define this as a Grid item.
          <Grid item xs={6} sm={3} key={link}>
            <Link href="#" color="inherit" underline="hover" variant="body2">
              {link}
            </Link>
          </Grid>
        ))}
      </Grid>
      <Typography variant="body2" sx={{ mt: 4 }}>
        &copy; 1997-2024 StreamFlix, Inc.
      </Typography>
    </Container>
  );
};