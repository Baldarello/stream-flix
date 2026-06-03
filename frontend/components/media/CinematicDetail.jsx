/**
 * @fileoverview CinematicDetail - cinematic detail-view shell.
 *
 * Wraps the legacy `DetailView` in a futurisic container with a
 * scanline overlay and a GSAP morph-in entry timeline. The existing
 * detail view logic is preserved as-is so all features (episodes
 * drawer, link selection, watch together, etc.) keep working.
 *
 * The component is `observer` so MobX changes to `currentSelectedItem`
 * (open/close) drive the entry / exit animation.
 */

import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@mui/material';
import { gsap } from 'gsap';
import DetailView from './DetailView.jsx';
import { ScanlineOverlay } from '../feedback/ScanlineOverlay.jsx';
import { durations, easings, reducedMotion } from '../../motion/grammar.js';

const CinematicDetailInner = ({ id = 'detail-cinematic' }) => {
    const rootRef = useRef(null);
    const lastKeyRef = useRef(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        // The component re-mounts whenever the detail view opens, so a
        // single timeline is enough. Reduced motion collapses to a fade.
        if (reducedMotion()) {
            gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });
            return undefined;
        }
        const tl = gsap.timeline();
        tl.fromTo(root, { autoAlpha: 0, scale: 0.97, filter: 'blur(8px)' },
            { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: durations.cinematic, ease: easings.cinematic });
        lastKeyRef.current = Date.now();
        return () => tl.kill();
    }, []);

    return (
        <Box
            id={id}
            ref={rootRef}
            data-component="cinematic-detail"
            sx={{ position: 'relative' }}
        >
            <DetailView />
            <ScanlineOverlay id="detail-scanline" intensity={0.18} />
        </Box>
    );
};

export const CinematicDetail = observer(CinematicDetailInner);
CinematicDetail.displayName = 'CinematicDetail';
