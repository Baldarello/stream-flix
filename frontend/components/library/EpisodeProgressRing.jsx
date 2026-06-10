import React from 'react';
import {Box} from '@mui/material';

/**
 * EpisodeProgressRing - Circular progress indicator for episode watch progress.
 * Shows a cyan progress ring around a small icon indicating how much of the
 * episode has been watched.
 */
const EpisodeProgressRing = ({progress = 0, size = 32}) => {
    const radius = (size - 4) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <Box
            sx={{
                width: size,
                height: size,
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{transform: 'rotate(-90deg)'}}
            >
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(76, 210, 255, 0.15)"
                    strokeWidth="3"
                />
                {/* Progress ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--neon-accent)"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                        filter: 'drop-shadow(0 0 4px rgba(76, 210, 255, 0.5))',
 transition: 'stroke-dashoffset 200ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                />
            </svg>
        </Box>
    );
};

EpisodeProgressRing.displayName = 'EpisodeProgressRing';

export { EpisodeProgressRing };
export default EpisodeProgressRing;
