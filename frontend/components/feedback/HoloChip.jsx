/**
 * @fileoverview HoloChip - futuristic chip primitive.
 *
 * A small atomic chip used by the player controls, modals, snackbar and
 * category row strips. It applies the neon-edge + holo-surface styling
 * from the cinematic design system.
 *
 * Public contract matches MUI's `Chip` so it can be used as a drop-in
 * replacement.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Chip} from '@mui/material';

/**
 * HoloChip Component
 *
 * Futuristic chip with neon edge and holo surface.
 *
 * @param {Object} props - Forwarded to MUI Chip.
 * @param {string} [props.id] - DOM id. Defaults to `holo-chip`.
 * @returns {React.ReactElement} Holo chip
 */
export const HoloChip = observer((props) => {
    const { id = 'holo-chip', sx, ...rest } = props;
    return (
        <Chip
            id={id}
            data-component="holo-chip"
            sx={{
                background: 'var(--holo-grad)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(76, 210, 255, 0.35)',
                borderRadius: '999px',
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                height: 24,
                boxShadow: '0 0 8px rgba(76, 210, 255, 0.2)',
                '&:hover': {
                    borderColor: 'var(--neon-accent)',
                    boxShadow: '0 0 14px rgba(76, 210, 255, 0.4)'
                },
                ...(sx || {})
            }}
            {...rest}
        />
    );
});

HoloChip.displayName = 'HoloChip';

export default HoloChip;
