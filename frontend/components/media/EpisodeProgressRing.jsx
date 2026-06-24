/**
 * @fileoverview EpisodeProgressRing - Circular SVG progress indicator.
 *
 * Renders a circular SVG progress ring (0-100%) for episode watch progress.
 */

import React from 'react';

export const EpisodeProgressRing = ({
    progress = 0,
    size = 32,
    stroke = 3
}) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)' }}
        >
            {/* Background ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(76, 210, 255, 0.2)"
                strokeWidth={stroke}
            />
            {/* Progress ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--neon-accent)"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                    filter: 'drop-shadow(0 0 4px rgba(76, 210, 255, 0.5))'
                }}
            />
        </svg>
    );
};

EpisodeProgressRing.displayName = 'EpisodeProgressRing';

export default EpisodeProgressRing;
