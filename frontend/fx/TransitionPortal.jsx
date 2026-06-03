/**
 * @fileoverview TransitionPortal - React Portal driven by fxStore.
 *
 * Subscribes to `fxStore.isTransitioning` and `fxStore.targetViewKey`. When
 * a transition starts the portal renders a fullscreen overlay into
 * `document.body`, traps focus inside the portal, runs the matching
 * timeline from `motion/registry.js`, then unmounts the overlay and
 * restores focus to the previously focused element.
 *
 * Reduced motion users get a 120ms opacity fade and the focus still
 * restores.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { gsap } from 'gsap';
import { fxStore } from '../store/fxStore.js';
import { buildTransition } from '../motion/registry.js';
import { reducedMotion } from '../utils/reducedMotion.js';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const getFocusable = (root) => {
    if (!root) return [];
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    });
};

const FocusTrap = ({ active, onEscape, children }) => {
    const ref = useRef(null);
    const handler = useCallback((event) => {
        if (!active || !ref.current) return;
        if (event.key === 'Escape' && onEscape) {
            onEscape();
            return;
        }
        if (event.key !== 'Tab') return;
        const items = getFocusable(ref.current);
        if (items.length === 0) {
            event.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }, [active, onEscape]);

    useEffect(() => {
        if (!active) return undefined;
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [active, handler]);

    useEffect(() => {
        if (!active || !ref.current) return;
        const items = getFocusable(ref.current);
        if (items.length > 0) {
            items[0].focus();
        } else {
            ref.current.focus();
        }
    }, [active]);

    return (
        <div
            ref={ref}
            tabIndex={-1}
            data-testid="transition-portal-focus"
            style={{ outline: 'none' }}
        >
            {children}
        </div>
    );
};

export const TransitionPortal = observer(function TransitionPortalInner() {
    const overlayRef = useRef(null);
    const previousFocusRef = useRef(null);
    const [running, setRunning] = useState(false);
    const [pending, setPending] = useState(null);

    useEffect(() => {
        if (!fxStore.isTransitioning || fxStore.isFirstPaint) return;
        const fromKey = fxStore.prevViewKey || 'home';
        const toKey = fxStore.targetViewKey || 'home';
        if (fromKey === toKey) {
            fxStore.endTransition();
            return;
        }
        // Capture focus so we can restore it after the timeline.
        previousFocusRef.current = document.activeElement;
        setPending({ fromKey, toKey });
        setRunning(true);
    }, [fxStore.isTransitioning, fxStore.targetViewKey, fxStore.isFirstPaint]);

    useEffect(() => {
        if (!running || !pending) return;
        let cancelled = false;
        const { fromKey, toKey } = pending;
        const run = async () => {
            const overlay = overlayRef.current;
            if (!overlay) {
                finish();
                return;
            }
            // Build the timeline. The "next view" argument is a stand-in -
            // the registry factories read DOM as a whole.
            const tl = buildTransition(fromKey, toKey, {
                overlayNode: overlay,
                nextViewNode: overlay
            });
            try {
                if (reducedMotion() || !tl) {
                    // simple opacity fade fallback
                    await gsap.fromTo(overlay,
                        { autoAlpha: 0 },
                        { autoAlpha: 1, duration: 0.12, ease: 'none' }).then();
                } else {
                    tl.play();
                    await new Promise((resolve) => {
                        const onComplete = () => {
                            tl.eventCallback('onComplete', null);
                            resolve();
                        };
                        tl.eventCallback('onComplete', onComplete);
                    });
                }
            } finally {
                if (!cancelled) {
                    finish();
                }
            }
        };
        const finish = () => {
            if (cancelled) return;
            setRunning(false);
            setPending(null);
            fxStore.endTransition();
            // Restore focus to the previously focused element if still in DOM.
            const previous = previousFocusRef.current;
            if (previous && document.contains(previous) && typeof previous.focus === 'function') {
                try { previous.focus(); } catch (_e) { /* ignore */ }
            }
        };
        run();
        return () => { cancelled = true; };
    }, [running, pending]);

    if (!running || !pending) return null;

    const node = (
        <FocusTrap active onEscape={() => { /* no-op: portal completes via timeline */ }}>
            <div
                id="transition-portal"
                data-testid="transition-portal"
                data-from-key={pending.fromKey}
                data-to-key={pending.toKey}
                ref={overlayRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 1500,
                    background: 'linear-gradient(180deg, rgba(5,6,13,0.4), rgba(5,6,13,0.85))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--neon-accent)',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    fontSize: 12,
                    textShadow: 'var(--hologram-shadow)'
                }}
            >
                <span aria-hidden>
                    {pending.fromKey} <span style={{ color: 'var(--text-secondary)' }}>→</span> {pending.toKey}
                </span>
            </div>
        </FocusTrap>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(node, document.body);
});

TransitionPortal.displayName = 'TransitionPortal';
