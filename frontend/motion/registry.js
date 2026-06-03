/**
 * @fileoverview Motion Registry - declarative per-view-key GSAP timelines.
 *
 * Each entry is a function that takes a target DOM node and an optional
 * context object (refs to the SceneCanvas, the ambient canvas, the active
 * view root) and returns a GSAP timeline that performs the cinematic
 * transition. The TransitionPortal reads the previous/next view key and
 * picks the matching factory.
 *
 * Timelines are built lazily so that the bundle stays small. The
 * `gsap/matchMedia` scoping ensures reduced-motion users collapse to a
 * simple opacity fade.
 */

import { gsap } from 'gsap';
import { durations, easings, reducedMotion, reducedMotionCondition } from './grammar.js';

export const VIEW_KEYS = {
    HOME: 'home',
    LIBRARY: 'library',
    SEARCH: 'search',
    DETAIL: 'detail',
    PLAYER: 'player',
    QR: 'qr',
    PAIRING: 'pairing',
    MASTER: 'master',
    SLAVE: 'slave',
    LOADING: 'loading',
    ERROR: 'error'
};

const ensureMatchMedia = () => {
    if (typeof window === 'undefined' || !gsap.matchMedia) {
        return null;
    }
    if (!ensureMatchMedia._mm) {
        ensureMatchMedia._mm = gsap.matchMedia();
    }
    return ensureMatchMedia._mm;
};

const fadeOnlyTimeline = (target) => gsap.timeline()
    .fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' });

/**
 * Cinematic morph used by Hero -> Detail and similar "expansion" transitions.
 * The current view fades + scales down while a scanline overlay sweeps in,
 * and the next view fades up behind it.
 */
const morphExpand = (overlayNode, nextViewNode, { sceneCanvasRef } = {}) => {
    const tl = gsap.timeline();
    if (!overlayNode || !nextViewNode) return tl;

    tl.set(overlayNode, { autoAlpha: 1 });
    tl.fromTo(overlayNode,
        { scaleY: 0, transformOrigin: '50% 50%' },
        { scaleY: 1, duration: durations.cinematic, ease: easings.cinematic });
    tl.fromTo(nextViewNode, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: durations.med, ease: easings.emphasized }, '<0.2');
    if (sceneCanvasRef && sceneCanvasRef.current && typeof sceneCanvasRef.current.playMorph === 'function') {
        tl.call(() => {
            sceneCanvasRef.current.playMorph({ intensity: 0.7, durationMs: durations.cinematic * 1000 });
        }, [], '<');
    }
    tl.to(overlayNode, { autoAlpha: 0, duration: durations.med, ease: easings.standard }, '>-0.1');
    return tl;
};

/**
 * Camera-dive used for Detail -> Player. The view root scales up and fades
 * while the scene canvas flashes.
 */
const cameraDive = (overlayNode, nextViewNode, { sceneCanvasRef } = {}) => {
    const tl = gsap.timeline();
    if (!overlayNode || !nextViewNode) return tl;
    tl.set(overlayNode, { autoAlpha: 1 });
    tl.fromTo(overlayNode,
        { scaleY: 0, transformOrigin: '50% 0%' },
        { scaleY: 1, duration: durations.cinematic, ease: easings.cinematic });
    if (sceneCanvasRef && sceneCanvasRef.current && typeof sceneCanvasRef.current.playMorph === 'function') {
        tl.call(() => {
            sceneCanvasRef.current.playMorph({ intensity: 0.95, durationMs: durations.cinematic * 1000 });
        }, [], '<');
    }
    tl.fromTo(nextViewNode, { scale: 0.92, autoAlpha: 0, filter: 'blur(12px)' },
        { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: durations.cinematic, ease: easings.cinematic }, '<0.1');
    tl.to(overlayNode, { autoAlpha: 0, duration: durations.med, ease: easings.standard }, '>-0.1');
    return tl;
};

/**
 * Light horizontal swipe used for library <-> home switches.
 */
const swipeSwap = (overlayNode, nextViewNode) => {
    const tl = gsap.timeline();
    if (!overlayNode || !nextViewNode) return tl;
    tl.set(overlayNode, { autoAlpha: 1 });
    tl.fromTo(overlayNode,
        { xPercent: -100 },
        { xPercent: 0, duration: durations.med, ease: easings.emphasized });
    tl.fromTo(nextViewNode, { xPercent: 12, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: durations.med, ease: easings.emphasized }, '<');
    tl.to(overlayNode, { autoAlpha: 0, duration: durations.med, ease: easings.standard }, '>-0.05');
    return tl;
};

const REGISTRY = {
    'home->detail': morphExpand,
    'home->search': swipeSwap,
    'home->library': swipeSwap,
    'library->home': swipeSwap,
    'library->detail': morphExpand,
    'search->home': swipeSwap,
    'search->detail': morphExpand,
    'detail->player': cameraDive,
    'detail->home': morphExpand,
    'detail->library': swipeSwap,
    'player->detail': morphExpand,
    'master->home': swipeSwap,
    'slave->home': morphExpand,
    'qr->home': swipeSwap,
    'pairing->home': swipeSwap
};

export const buildTransition = (fromKey, toKey, args) => {
    if (reducedMotion()) {
        return fadeOnlyTimeline(args && args.nextViewNode);
    }
    const factory = REGISTRY[`${fromKey}->${toKey}`] || swipeSwap;
    const mm = ensureMatchMedia();
    const nextViewNode = args && args.nextViewNode;
    if (mm) {
        return factory(args && args.overlayNode, nextViewNode, args) || gsap.timeline();
    }
    return factory(args && args.overlayNode, nextViewNode, args) || gsap.timeline();
};

export const reducedMotionMediaCondition = reducedMotionCondition;
