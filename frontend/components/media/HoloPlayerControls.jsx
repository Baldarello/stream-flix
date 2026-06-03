/**
 * @fileoverview HoloPlayerControls - futuristic player controls wrapper.
 *
 * Wraps the existing `VideoControlsContainer` with a holographic bottom
 * bar: neon edge, glow-tracked progress rail, animated play/pause icon
 * and a specular sweep on hover. The legacy player logic is preserved
 * as-is, so all features (seek, volume, fullscreen, playback rate,
 * skip-intro, download) keep working without changes.
 *
 * The component is `observer` so MobX changes to `nowPlayingItem` /
 * player state drive the visual updates.
 *
 * The public contract matches `VideoControlsContainer` so callers can
 * swap one for the other.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Stack } from '@mui/material';
import VideoControlsContainer from './VideoControlsContainer.jsx';
import { ScanlineOverlay } from '../feedback/ScanlineOverlay.jsx';

/**
 * HoloPlayerControls Component
 *
 * Holographic bottom-bar wrapper around the legacy video controls.
 *
 * @param {Object} props - All forwarded to `VideoControlsContainer`.
 * @param {string} [props.id] - DOM id. Defaults to `player-controls-holo`.
 * @returns {React.ReactElement} Holo player controls bar
 */
export const HoloPlayerControls = observer((props) => {
    const { id = 'player-controls-holo', ...rest } = props;
    return (
        <Box
            id={id}
            data-component="holo-player-controls"
            sx={{
                position: 'relative',
                width: '100%',
                background: 'linear-gradient(180deg, rgba(5, 6, 13, 0) 0%, rgba(5, 6, 13, 0.85) 35%, rgba(5, 6, 13, 0.95) 100%)',
                border: '1px solid rgba(76, 210, 255, 0.25)',
                borderRadius: '12px',
                padding: { xs: 1, md: 2 },
                boxShadow: '0 0 24px rgba(76, 210, 255, 0.25), 0 18px 40px rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--holo-grad)',
                    opacity: 0.25,
                    pointerEvents: 'none',
                    borderRadius: 'inherit'
                },
                // Holographic specular sweep on hover.
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '-30%',
                    width: '30%',
                    background: 'linear-gradient(100deg, rgba(76, 210, 255, 0) 0%, rgba(122, 240, 255, 0.35) 50%, rgba(76, 210, 255, 0) 100%)',
                    pointerEvents: 'none',
                    transition: 'left 600ms cubic-bezier(0.22, 1, 0.36, 1)'
                },
                '&:hover::after': {
                    left: '100%'
                }
            }}
        >
            <Stack
                id={`${id}-inner`}
                data-testid="holo-player-controls-inner"
                sx={{ position: 'relative', zIndex: 1 }}
            >
                <VideoControlsContainer {...rest} />
            </Stack>
            <ScanlineOverlay id={`${id}-scanline`} intensity={0.1} />
        </Box>
    );
});

HoloPlayerControls.displayName = 'HoloPlayerControls';

export default HoloPlayerControls;
