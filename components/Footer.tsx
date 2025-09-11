import React from 'react';
// FIX: Changed the Grid import to be a direct import from '@mui/material/Grid'. This can resolve module resolution issues that cause incorrect type inference for the 'item' prop.
import { Box, Container, Link, Typography, IconButton } from '@mui/material';
import Grid from '@mui/material/Grid';
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
          // In MUI v5+, Grid items require the `item` prop for breakpoint props like `xs` and `sm` to be applied correctly.
          <Grid item xs={6} sm={3} key={link}>
            <Link href="#" color="inherit" underline="hover" variant="body2">
              {link}
            </Link>
          </Grid>
        ))}
      </Grid>
      <Typography variant="body2" sx={{ mt: 4 }}>
        &copy; 1997-2024 Quix, Inc.
      </Typography>
    </Container>
  );
};
