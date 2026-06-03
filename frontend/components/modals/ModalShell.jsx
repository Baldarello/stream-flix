/**
 * @fileoverview ModalShell - shared futuristic modal wrapper.
 *
 * Wraps the legacy MUI Dialog with the cinematic visual vocabulary:
 *  - Holographic surface (`--holo-grad` overlay + moving specular sweep).
 *  - Scanline overlay during entry.
 *  - Shared GSAP timeline for entry: scale + blur + sweep-light.
 *  - Reduced motion collapses to a 120ms fade.
 *  - Neon edge and edge-glow on the paper.
 *
 * The shell is a single atomic component. It renders a `Mui Dialog` with
 * the futuristic paper styling, plus a `ScanlineOverlay` on top. The
 * public contract matches the MUI `Dialog` props so modals can be
 * migrated to use `<ModalShell open={...} onClose={...}>` instead of
 * `<Dialog open={...} onClose={...}>`.
 */

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { gsap } from 'gsap';
import { durations, easings, reducedMotion } from '../../motion/grammar.js';
import { ScanlineOverlay } from '../feedback/ScanlineOverlay.jsx';

/**
 * ModalShell Component
 *
 * Shared futuristic modal wrapper with a single GSAP entry timeline.
 *
 * @param {Object} props
 * @param {boolean} [props.open] - Whether the modal is open.
 * @param {Function} [props.onClose] - Close handler.
 * @param {string} [props.title] - Optional title text.
 * @param {string} [props.id] - DOM id. Defaults to `modal-shell`.
 * @param {React.ReactNode} [props.children] - Modal content.
 * @param {boolean} [props.disableEntryAnimation] - Skip the GSAP entry.
 * @param {string} [props.maxWidth] - MUI maxWidth.
 * @param {boolean} [props.fullWidth] - MUI fullWidth.
 * @returns {React.ReactElement} Modal shell
 */
export const ModalShell = ({
    open = false,
    onClose,
    title,
    id = 'modal-shell',
    children,
    disableEntryAnimation = false,
    maxWidth = 'sm',
    fullWidth = true,
    ...rest
}) => {
    const paperRef = useRef(null);
    const lastOpenRef = useRef(false);

    useEffect(() => {
        if (disableEntryAnimation) return undefined;
        if (!open) {
            lastOpenRef.current = false;
            return undefined;
        }
        // Only run the entry when the modal just opened.
        if (lastOpenRef.current) return undefined;
        lastOpenRef.current = true;

        const paper = paperRef.current;
        if (!paper) return undefined;

        if (reducedMotion()) {
            gsap.fromTo(paper,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.12, ease: 'none', overwrite: 'auto' });
            return undefined;
        }

        // Shared timeline: scale + blur + sweep-light. The sweep is a
        // temporary bright overlay on the paper; we move it from left
        // to right and then remove it.
        const tl = gsap.timeline();
        tl.fromTo(paper,
            { autoAlpha: 0, scale: 0.94, filter: 'blur(6px)' },
            { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: durations.med, ease: easings.emphasized, overwrite: 'auto' });

        const sweep = paper.querySelector('.modal-shell-sweep');
        if (sweep) {
            tl.fromTo(sweep,
                { x: '-100%' },
                { x: '100%', duration: durations.med, ease: easings.standard, overwrite: 'auto' },
                '<0.05');
        }

        return () => tl.kill();
    }, [open, disableEntryAnimation]);

    return (
        <Dialog
            id={id}
            data-component="modal-shell"
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                ref: paperRef,
                className: 'modal-shell-paper',
                sx: {
                    position: 'relative',
                    backgroundColor: 'var(--bg-deep)',
                    backgroundImage: 'var(--holo-grad)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(76, 210, 255, 0.35)',
                    borderRadius: '14px',
                    boxShadow: '0 0 24px rgba(76, 210, 255, 0.35), 0 24px 60px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        background: 'var(--holo-grad)',
                        opacity: 0.35,
                        pointerEvents: 'none',
                        zIndex: 0
                    }
                }
            }}
            {...rest}
        >
            {/* Holographic sweep overlay (animated by GSAP). */}
            <Box
                aria-hidden
                className="modal-shell-sweep"
                sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '30%',
                    pointerEvents: 'none',
                    background: 'linear-gradient(100deg, rgba(76, 210, 255, 0) 0%, rgba(122, 240, 255, 0.35) 50%, rgba(76, 210, 255, 0) 100%)',
                    zIndex: 1
                }}
            />
            {title && (
                <DialogTitle
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.01em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 12px rgba(76, 210, 255, 0.25)',
                        pr: 6
                    }}
                >
                    {title}
                    {onClose && (
                        <IconButton
                            id={`${id}-close`}
                            aria-label="close"
                            onClick={onClose}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: 'var(--neon-accent)',
                                '&:hover': { color: 'var(--neon-accent-hot)', transform: 'rotate(90deg)', transition: 'transform 200ms ease' }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    )}
                </DialogTitle>
            )}
            <DialogContent
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    color: 'var(--text-primary)'
                }}
            >
                {children}
            </DialogContent>
            <ScanlineOverlay id={`${id}-scanline`} intensity={0.12} />
        </Dialog>
    );
};

ModalShell.displayName = 'ModalShell';

export default ModalShell;
