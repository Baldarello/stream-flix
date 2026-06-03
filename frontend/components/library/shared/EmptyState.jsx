/**
 * @fileoverview EmptyState - shared empty-state primitive.
 *
 * Used by all the new library tabs to render a centered illustration
 * + title + subtitle + optional CTA. Built with the cinematic
 * vocabulary (`holo-surface`, `neon-edge`) so each tab shares the
 * same look and feel.
 */

import React from 'react';
import {Box, Button, Typography} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Optional custom icon.
 * @param {string} [props.title] - Primary heading.
 * @param {string} [props.subtitle] - Secondary copy.
 * @param {string} [props.ctaLabel] - Optional CTA label.
 * @param {Function} [props.onCta] - Optional CTA click handler.
 * @param {string} [props.id] - DOM id.
 * @returns {React.ReactElement}
 */
export const EmptyState = ({
                               icon,
                               title,
                               subtitle,
                               ctaLabel,
                               onCta,
                               id = 'library-empty-state',
                           }) => {
    return (
        <Box
            id={id}
            data-component="library-empty-state"
            className="holo-surface neon-edge"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: {xs: 6, md: 8},
                px: 3,
                textAlign: 'center',
                borderRadius: '14px',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--holo-grad)',
                    border: '1px solid rgba(76, 210, 255, 0.45)',
                    boxShadow: 'var(--edge-glow)',
                    color: 'var(--neon-accent)',
                }}
            >
                {icon || <InboxIcon sx={{fontSize: 44}}/>}
            </Box>
            {title && (
                <Typography
                    variant="h6"
                    sx={{
                        color: 'var(--text-primary)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                    }}
                >
                    {title}
                </Typography>
            )}
            {subtitle && (
                <Typography
                    variant="body2"
                    sx={{color: 'var(--text-secondary)', maxWidth: 480}}
                >
                    {subtitle}
                </Typography>
            )}
            {ctaLabel && onCta && (
                <Button
                    variant="contained"
                    onClick={onCta}
                    sx={{
                        mt: 1,
                        background: 'var(--neon-accent)',
                        color: 'var(--bg-deep)',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        '&:hover': {
                            background: 'var(--neon-accent-hot)',
                            boxShadow: 'var(--edge-glow-hot)',
                        },
                    }}
                >
                    {ctaLabel}
                </Button>
            )}
        </Box>
    );
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;
