/**
 * @fileoverview Motion Grammar - Single source of truth for all animations.
 *
 * All GSAP timelines and CSS transitions across the app must consume
 * durations and easings from this module so that the visual rhythm is
 * consistent. Reduced motion users collapse everything to short fades.
 *
 * Tree-shake friendly: GSAP is imported from `gsap` only where the caller
 * needs timeline APIs. This module exposes plain JS values plus a small
 * `reducedMotion` helper for synchronous guards.
 */

export const durations = {
    fast: 0.18,
    med: 0.32,
    cinematic: 0.72,
    epic: 1.4,
    fadeFallback: 0.12
};

export const easings = {
    standard: 'power2.out',
    standardInOut: 'power2.inOut',
    emphasized: 'power3.out',
    emphasizedInOut: 'power3.inOut',
    cinematic: 'expo.inOut',
    snap: 'power4.out'
};

export const stagger = {
    row: 0.04,
    grid: 0.03,
    char: 0.025
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
let cachedMatch = null;
let cachedListener = null;
const subscribers = new Set();

const computeMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

const ensureCached = () => {
    if (cachedMatch === null) {
        cachedMatch = computeMatch();
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            cachedListener = window.matchMedia(REDUCED_MOTION_QUERY);
            const handler = (event) => {
                cachedMatch = event.matches;
                subscribers.forEach((cb) => {
                    try { cb(cachedMatch); } catch (e) { /* ignore subscriber errors */ }
                });
            };
            if (typeof cachedListener.addEventListener === 'function') {
                cachedListener.addEventListener('change', handler);
            } else if (typeof cachedListener.addListener === 'function') {
                cachedListener.addListener(handler);
            }
        }
    }
    return cachedMatch;
};

/**
 * Returns true when the user prefers reduced motion.
 * Safe to call during SSR; returns false when `window` is unavailable.
 */
export const reducedMotion = () => {
    if (cachedMatch !== null) return cachedMatch;
    return ensureCached();
};

/**
 * Subscribe to reduced motion preference changes.
 * Returns an unsubscribe function.
 */
export const onReducedMotionChange = (cb) => {
    ensureCached();
    subscribers.add(cb);
    return () => subscribers.delete(cb);
};

/**
 * Resolves a duration in seconds, collapsing to the fade fallback when
 * reduced motion is requested.
 */
export const resolveDuration = (token) => {
    if (reducedMotion()) return durations.fadeFallback;
    return durations[token] ?? durations.med;
};

/**
 * Resolves an easing string, defaulting to `power2.out` for unknown tokens.
 */
export const resolveEasing = (token) => easings[token] ?? easings.standard;

/**
 * Convenience helper to check if WebGL/SVG/GSAP intensive effects are allowed.
 */
export const motionEnabled = () => !reducedMotion();

/**
 * Build a `gsap.matchMedia` scope key. Centralized so every consumer uses
 * the same condition string.
 */
export const reducedMotionCondition = () => `(prefers-reduced-motion: no-preference)`;
