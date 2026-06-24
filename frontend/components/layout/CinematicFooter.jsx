/**
 * @fileoverview CinematicFooter - thin holo footer strip.
 *
 * Replaces the legacy `Footer.jsx` with a minimal holo strip: brand mark
 * + status + version, animated on scroll-in via a CSS keyframe.
 */

import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Container, IconButton, Typography } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { gsap } from 'gsap';
import { durations, easings, reducedMotion } from '../../motion/grammar.js';

const socialIcons = [
    { icon: <FacebookIcon fontSize="small" />, href: '#', label: 'Facebook' },
    { icon: <InstagramIcon fontSize="small" />, href: '#', label: 'Instagram' },
    { icon: <TwitterIcon fontSize="small" />, href: '#', label: 'Twitter' },
    { icon: <YouTubeIcon fontSize="small" />, href: '#', label: 'YouTube' }
];

const CinematicFooterInner = () => {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || reducedMotion()) return;
        gsap.fromTo(el,
            { autoAlpha: 0, y: 24 },
            {
                autoAlpha: 1,
                y: 0,
                duration: durations.cinematic,
                ease: easings.standard,
                scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' }
            });
    }, []);

    return (
        <Box
            id="footer-cinematic"
            ref={ref}
            data-component="cinematic-footer"
            className="holo-surface"
            component="footer"
            sx={{
                mt: 8,
                pt: 4,
                pb: 'calc(1.5rem + env(safe-area-inset-bottom))',
                color: 'var(--text-secondary)',
                borderTop: '1px solid rgba(76, 210, 255, 0.18)',
                background: 'linear-gradient(180deg, transparent, rgba(5,6,13,0.7))'
            }}
        >
            <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                    {socialIcons.map((s) => (
                        <IconButton
                            key={s.label}
                            component="a"
                            href={s.href}
                            aria-label={s.label}
                            size="small"
                            sx={{
                                color: 'var(--text-secondary)',
                                '&:hover': { color: 'var(--neon-accent)', transform: 'scale(1.1)' }
                            }}
                        >
                            {s.icon}
                        </IconButton>
                    ))}
                </Box>
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: 'var(--text-dim)'
                    }}
                >
                    QUIX &middot; Stream the future
                </Typography>
            </Container>
        </Box>
    );
};

export const CinematicFooter = observer(CinematicFooterInner);
CinematicFooter.displayName = 'CinematicFooter';
