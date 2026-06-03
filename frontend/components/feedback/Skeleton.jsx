/**
 * @fileoverview Skeleton - futuristic shimmer placeholder for loading states.
 *
 * Renders a translucent panel with a moving gradient sweep (the
 * `.shimmer` keyframe defined in `cinematic.css`). Used by LoadingView
 * and by the empty states of rows/grid.
 */

import React from 'react';
import { Box } from '@mui/material';

const SkeletonInner = ({ id = 'skeleton-shimmer', width = '100%', height = 220, borderRadius = 12, sx }) => {
    return (
        <Box
            id={id}
            data-component="skeleton"
            aria-hidden
            className="shimmer"
            sx={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(110deg, rgba(76, 210, 255, 0.06) 0%, rgba(122, 240, 255, 0.18) 50%, rgba(76, 210, 255, 0.06) 100%)',
                backgroundSize: '200% 100%',
                border: '1px solid rgba(76, 210, 255, 0.12)',
                ...sx
            }}
        />
    );
};

export const Skeleton = SkeletonInner;
Skeleton.displayName = 'Skeleton';

export const SkeletonCard = ({ index = 0 }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
        <Skeleton id={`skeleton-card-${index}`} height={300} />
        <Skeleton id={`skeleton-card-text-${index}`} width="70%" height={14} borderRadius={6} />
        <Skeleton id={`skeleton-card-sub-${index}`} width="40%" height={10} borderRadius={6} />
    </Box>
);

export default Skeleton;
