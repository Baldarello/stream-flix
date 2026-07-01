/**
 * @fileoverview ScanlineOverlay - horizontal scanline effect for loading
 * states and the transition portal. Renders a thin fixed overlay with a
 * moving specular band, opt-in via the `scanline` class on a parent.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box } from '@mui/material';

export const ScanlineOverlay = observer(function ScanlineOverlayInner(props) {
    const { id = 'scanline-overlay', intensity = 0.6, label } = props;
    return (
        <Box
            id={id}
            aria-hidden
            className="scanline"
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: intensity,
                zIndex: 4,
            }}
        >
            {label ? (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--neon-accent)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        textShadow: 'var(--hologram-shadow)',
                    }}
                >
                    {label}
                </Box>
            ) : null}
        </Box>
    );
});

ScanlineOverlay.displayName = 'ScanlineOverlay';

export default ScanlineOverlay;
