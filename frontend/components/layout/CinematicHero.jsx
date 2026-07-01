/**
 * @fileoverview CinematicHero - the futuristic Hero showpiece.
 *
 * Replaces the legacy `Hero.jsx` ken-burns splash with:
 *  - A parallax backdrop that subtly shifts on pointer move.
 *  - A kinetic char-by-char title reveal using GSAP + the motion grammar.
 *  - Holo CTA buttons with neon edge and a morph-in secondary action.
 *  - A light-leak radial bloom that drifts behind the content.
 *  - A SceneCanvas morph hook that fires when the user navigates to a
 *    detail view.
 *
 * Same public contract as the legacy Hero (`item`, `onMoreInfoClick`,
 * `onPlayClick`, `id`) so HomeView does not need to change.
 *
 * All animations are driven by GSAP timelines + the durations and easings
 * declared in `motion/grammar.js`. Reduced motion collapses to a static
 * splash with no movement.
 */

import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Button, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { gsap } from 'gsap';
import { useTranslations } from '../../hooks/useTranslations.js';
import { durations, easings, reducedMotion, stagger } from '../../motion/grammar.js';

const splitTitle = (title) => {
    if (!title) return [];
    // Split on word boundaries and individual characters for kinetic reveal.
    const tokens = [];
    title.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
            tokens.push({ kind: 'space', text: part });
        } else {
            Array.from(part).forEach((ch) => {
                tokens.push({ kind: 'char', text: ch });
            });
        }
    });
    return tokens;
};

export const CinematicHero = observer(function CinematicHeroInner({ item, onMoreInfoClick, onPlayClick, id = 'hero-cinematic' }) {
    const { t } = useTranslations();
    const rootRef = useRef(null);
    const titleRef = useRef(null);
    const overviewRef = useRef(null);
    const actionsRef = useRef(null);
    const backdropRef = useRef(null);
    const lastKeyRef = useRef(null);

    const title = (item && (item.title || item.name)) || '';
    const overview = (item && item.overview) || '';
    const trimmedOverview = overview.length > 200 ? `${overview.substring(0, 200)}...` : overview;
    const tokens = splitTitle(title);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const key = (item && (item.id || item.title || item.name)) || 'unknown';
        // Re-run the cinematic timeline when the hero content changes.
        if (lastKeyRef.current === key) return undefined;
        lastKeyRef.current = key;

        const tl = gsap.timeline();
        if (reducedMotion()) {
            // Short opacity fade only.
            tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });
            return undefined;
        }
        const chars = titleRef.current ? titleRef.current.querySelectorAll('.kinetic-char') : [];
        if (chars.length > 0) {
            tl.fromTo(
                chars,
                { y: '110%', autoAlpha: 0, filter: 'blur(8px)' },
                {
                    y: '0%',
                    autoAlpha: 1,
                    filter: 'blur(0px)',
                    duration: durations.cinematic,
                    ease: easings.emphasized,
                    stagger: stagger.char,
                },
                0
            );
        }
        if (overviewRef.current) {
            tl.fromTo(
                overviewRef.current,
                { y: 16, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: durations.med, ease: easings.standard },
                0.45
            );
        }
        if (actionsRef.current) {
            tl.fromTo(
                actionsRef.current.children,
                { y: 18, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: durations.med, ease: easings.emphasized, stagger: 0.06 },
                0.55
            );
        }
        if (backdropRef.current) {
            tl.fromTo(
                backdropRef.current,
                { scale: 1.1, filter: 'brightness(0.6)' },
                { scale: 1.0, filter: 'brightness(1.0)', duration: durations.epic, ease: easings.cinematic },
                0
            );
        }
        return () => {
            tl.kill();
        };
    }, [item && (item.id || item.title || item.name)]);

    useEffect(() => {
        const root = rootRef.current;
        const backdrop = backdropRef.current;
        if (!root || !backdrop || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        const onMove = (event) => {
            const rect = root.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            gsap.to(backdrop, { x: x * 14, y: y * 8, duration: 0.6, ease: easings.standard, overwrite: 'auto' });
        };
        const onLeave = () => {
            gsap.to(backdrop, { x: 0, y: 0, duration: 0.6, ease: easings.standard });
        };
        root.addEventListener('mousemove', onMove);
        root.addEventListener('mouseleave', onLeave);
        return () => {
            root.removeEventListener('mousemove', onMove);
            root.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    return (
        <Box
            id={id}
            ref={rootRef}
            data-component="cinematic-hero"
            sx={{
                position: 'relative',
                isolation: 'isolate',
                height: { xs: '70vh', md: '56.25vw' },
                minHeight: '420px',
                maxHeight: { xs: '620px', md: '820px' },
                width: '100%',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                zIndex: 100,
                pointerEvents: 'none',
            }}
        >
            {/* Backdrop */}
            <Box
                ref={backdropRef}
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${item && item.backdrop_path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.95)',
                    willChange: 'transform',
                    zIndex: 1,
                }}
            />
            {/* Light leak */}
            <Box aria-hidden className="light-leak" sx={{ zIndex: 2 }} />
            {/* Cinematic gradient */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(to right, rgba(5,6,13,0.92) 0%, rgba(5,6,13,0.55) 45%, rgba(5,6,13,0.2) 80%, rgba(5,6,13,0.6) 100%), linear-gradient(to top, rgba(5,6,13,1) 8%, rgba(5,6,13,0.4) 50%, rgba(5,6,13,0) 90%)',
                    zIndex: 3,
                }}
            />
            {/* Scanline overlay (subtle) */}
            <Box aria-hidden className="scanline" sx={{ position: 'absolute', inset: 0, opacity: 0.25, zIndex: 4 }} />
            {/* Content */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 5,
                    p: { xs: 2, md: 8 },
                    pt: { xs: 'calc(7rem + env(safe-area-inset-top))', md: 'calc(2rem + env(safe-area-inset-top))' },
                    width: { xs: '100%', md: '52%', lg: '42%' },
                    pointerEvents: 'auto',
                }}
            >
                <Stack spacing={2.5}>
                    <Typography
                        component="h1"
                        data-testid="hero-title"
                        ref={titleRef}
                        sx={{
                            fontFamily: "'Space Grotesk', 'Poppins', sans-serif",
                            fontWeight: 700,
                            fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.6rem', lg: '4.2rem' },
                            lineHeight: 1.05,
                            letterSpacing: '-0.02em',
                            color: 'var(--text-primary)',
                            textShadow: 'var(--hologram-shadow)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            rowGap: '0.1em',
                            columnGap: 0,
                        }}
                    >
                        {tokens.map((tok, idx) =>
                            tok.kind === 'space' ? (
                                <span key={`s-${idx}`} style={{ width: '0.4em' }}>
                                    {tok.text}
                                </span>
                            ) : (
                                <span
                                    key={`c-${idx}`}
                                    className="kinetic-char"
                                    style={{ display: 'inline-block', willChange: 'transform, filter' }}
                                >
                                    {tok.text}
                                </span>
                            )
                        )}
                    </Typography>
                    <Typography
                        ref={overviewRef}
                        data-testid="hero-overview"
                        variant="body1"
                        sx={{
                            color: 'var(--text-primary)',
                            opacity: 0.85,
                            textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                            maxWidth: 560,
                        }}
                    >
                        {trimmedOverview}
                    </Typography>
                    <Stack ref={actionsRef} direction="row" spacing={1.5} sx={{ pt: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            id="hero-cta-play"
                            data-testid="hero-cta-play"
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            size="large"
                            onClick={onPlayClick}
                            className="neon-edge"
                            sx={{
                                bgcolor: 'var(--neon-accent)',
                                color: 'var(--bg-void)',
                                fontWeight: 700,
                                px: 3.2,
                                py: 1.2,
                                borderRadius: 999,
                                boxShadow: '0 0 18px rgba(76, 210, 255, 0.45)',
                                '&:hover': {
                                    bgcolor: 'var(--neon-accent-hot)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 0 24px rgba(122, 240, 255, 0.65)',
                                },
                            }}
                        >
                            {t('hero.play')}
                        </Button>
                        <Button
                            id="hero-cta-more"
                            data-testid="hero-cta-more"
                            variant="outlined"
                            startIcon={<InfoOutlinedIcon />}
                            size="large"
                            onClick={onMoreInfoClick}
                            sx={{
                                color: 'var(--text-primary)',
                                borderColor: 'rgba(76, 210, 255, 0.45)',
                                borderRadius: 999,
                                px: 3,
                                py: 1.1,
                                backdropFilter: 'blur(8px)',
                                background: 'rgba(10, 14, 28, 0.45)',
                                '&:hover': {
                                    background: 'rgba(76, 210, 255, 0.12)',
                                    borderColor: 'var(--neon-accent-hot)',
                                    boxShadow: '0 0 14px rgba(76, 210, 255, 0.35)',
                                },
                            }}
                        >
                            {t('hero.moreInfo')}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    );
});

CinematicHero.displayName = 'CinematicHero';
