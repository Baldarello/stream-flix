/**
 * @fileoverview CinematicDetail - cinematic detail-view shell.
 *
 * Wraps the legacy `DetailView` in a futuristic container with a
 * scanline overlay and a GSAP morph-in entry timeline. The existing
 * detail view logic is preserved as-is so all features (episodes
 * drawer, link selection, watch together, etc.) keep working.
 *
 * The component is `observer` so MobX changes to `currentSelectedItem`
 * (open/close) drive the entry / exit animation.
 */

import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {Box} from '@mui/material';
import {gsap} from 'gsap';
import DetailView from './DetailView.jsx';
import {ScanlineOverlay} from '../feedback/ScanlineOverlay.jsx';
import {durations, easings, reducedMotion} from '../../motion/grammar.js';
import {mediaStore} from '../../store/mediaStore.js';

const CinematicDetailInner = ({ id = 'detail-cinematic' }) => {
    // Access linksRefreshVersion here so the outer observer tracks it.
    // When links are added/deleted, linksRefreshVersion changes → this
    // component re-renders → DetailView (with key=detailKey) remounts
    // with fresh data from the patched selectedItem.
    const linksRefreshVersion = mediaStore.linksRefreshVersion;
    const detailKey = `detail-${mediaStore.currentSelectedItem?.id ?? 'none'}-v${linksRefreshVersion}`;

    // The morph-in animation (scale + blur) MUST be applied to an
    // inner wrapper, NOT the root, because both `transform` and
    // `filter` create a new containing block for descendants. The
    // child `DetailView` uses `position: fixed; inset: 0` and would
    // otherwise be constrained to the (zero-sized) root box, making
    // the entire detail view invisible.
    const rootRef = useRef(null);
    const animRef = useRef(null);
    const lastKeyRef = useRef(null);

    useEffect(() => {
        const root = rootRef.current;
        const anim = animRef.current;
        if (!root) return undefined;
        // The component re-mounts whenever the detail view opens, so a
        // single timeline is enough. Reduced motion collapses to a fade.
        if (reducedMotion()) {
            gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });
            return undefined;
        }
        const tl = gsap.timeline();
        tl.fromTo(anim || root,
            { autoAlpha: 0, scale: 0.97, filter: 'blur(8px)' },
            { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: durations.cinematic, ease: easings.cinematic });
        lastKeyRef.current = Date.now();
        return () => tl.kill();
    }, []);

    return (
        <Box
            id={id}
            ref={rootRef}
            data-component="cinematic-detail"
            sx={{
                // Stable containing block so the child DetailView's
                // `position: fixed; inset: 0` resolves to the viewport.
                // No transform/filter on this root.
                position: 'fixed',
                inset: 0,
                zIndex: 1199,
                pointerEvents: 'auto'
            }}
        >
            <DetailView key={detailKey} />
            <Box
                id={`${id}-scanline-wrapper`}
                ref={animRef}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 1300,
                    // Sits above DetailView (zIndex 1200) so the
                    // scanline overlay can sweep on top of the detail.
                    willChange: 'transform, filter, opacity'
                }}
            >
                <ScanlineOverlay id="detail-scanline" intensity={0.18} />
            </Box>
        </Box>
    );
};

export const CinematicDetail = observer(CinematicDetailInner);
CinematicDetail.displayName = 'CinematicDetail';
