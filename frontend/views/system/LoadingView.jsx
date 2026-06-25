/**
 * @fileoverview Loading View - Cinematic loading shell.
 *
 * Replaces the legacy centered spinner with a futuristic full-screen
 * loading state built from the new design tokens:
 *  - A pulsing neon orb rendered with the unified `--neon-accent`.
 *  - A typewriter "INITIALIZING" caption using the JetBrains Mono
 *    display font.
 *  - Three `Skeleton` placeholders prefiguring the upcoming content
 *    rows so the app never feels like a frozen white screen.
 *
 * The view is mounted by `ViewSwitch` while the media store is still
 * fetching the initial library. It is intentionally lightweight: no
 * WebGL, no heavy GSAP timelines, just a small CSS keyframe and the
 * shared `Skeleton` component from the futuristic rework.
 */

import React, {useEffect, useState} from 'react';
import {Box, Stack, Typography} from '@mui/material';
import {Skeleton} from '../../components/feedback/Skeleton.jsx';

const CAPTION = 'INITIALIZING';

const TypewriterCaption = () => {
    const [shown, setShown] = useState(() => 0);
    useEffect(() => {
        let frame = 0;
        const id = setInterval(() => {
            frame += 1;
            setShown((prev) => (prev < CAPTION.length ? prev + 1 : 0));
        }, 220);
        return () => clearInterval(id);
    }, []);
    const visible = CAPTION.slice(0, shown).padEnd(CAPTION.length, '\u00A0');
    return (
        <Typography
            id="loading-caption"
            data-component="loading-caption"
            sx={{
                fontFamily: "'JetBrains Mono', 'Inter', monospace",
                fontWeight: 600,
                fontSize: { xs: 14, md: 18 },
                letterSpacing: '0.5em',
                textTransform: 'uppercase',
                color: 'var(--neon-accent)',
                textShadow: '0 0 16px rgba(76, 210, 255, 0.45)',
                minWidth: 220,
                textAlign: 'center'
            }}
            aria-live="polite"
        >
            {visible}
        </Typography>
    );
};

const PulsingOrb = () => (
    <Box
        id="loading-orb"
        data-component="loading-orb"
        sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, var(--neon-accent-hot) 0%, var(--neon-accent) 35%, rgba(76, 210, 255, 0.0) 70%)',
            boxShadow: '0 0 24px rgba(76, 210, 255, 0.55), 0 0 60px rgba(76, 210, 255, 0.35)',
            animation: 'loading-orb-pulse 1.6s ease-in-out infinite',
            '@keyframes loading-orb-pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.85, boxShadow: '0 0 24px rgba(76, 210, 255, 0.55), 0 0 60px rgba(76, 210, 255, 0.35)' },
                '50%': { transform: 'scale(1.18)', opacity: 1, boxShadow: '0 0 40px rgba(76, 210, 255, 0.85), 0 0 90px rgba(76, 210, 255, 0.55)' }
            }
        }}
    />
);

/**
 * LoadingView Component
 *
 * Cinematic full-screen loading state. Uses the futuristic Skeleton
 * placeholders, a pulsing neon orb, and a typewriter caption.
 *
 * @returns {React.ReactElement} Loading view
 */
export const LoadingView = () => {
    return (
        <Box
            id="loading-screen"
            data-component="loading-view"
            sx={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--cinematic-grad)',
                color: 'var(--text-primary)',
                gap: 6,
                px: { xs: 2, md: 6 },
                py: 8
            }}
        >
            <PulsingOrb />
            <TypewriterCaption />
            <Stack
                id="loading-skeletons"
                data-testid="loading-skeletons"
                spacing={2}
                sx={{
                    width: '100%',
                    maxWidth: 720,
                    opacity: 0.85
                }}
            >
                <Skeleton id="loading-skeleton-row-1" height={48} borderRadius={10} />
                <Skeleton id="loading-skeleton-row-2" height={48} borderRadius={10} />
                <Skeleton id="loading-skeleton-row-3" height={48} borderRadius={10} />
            </Stack>
        </Box>
    );
};

LoadingView.displayName = 'LoadingView';

export default LoadingView;
