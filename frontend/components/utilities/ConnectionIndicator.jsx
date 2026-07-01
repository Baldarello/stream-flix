import React from 'react';
import { Box } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { remoteStore } from '../../store/remoteStore.js';

const ConnectionIndicator = observer(() => {
    const { connectionHealth, missedPings, isRemoteMasterConnected } = remoteStore;

    // Determine color based on connection health
    const getColor = () => {
        if (!isRemoteMasterConnected) {
            return '#9e9e9e'; // Gray when disconnected
        }
        switch (connectionHealth) {
            case 'good':
                return '#4caf50'; // Green
            case 'degraded':
                return '#ff9800'; // Orange
            case 'poor':
                return '#f44336'; // Red
            default:
                return '#4caf50'; // Default green
        }
    };

    const getTooltip = () => {
        if (!isRemoteMasterConnected) {
            return 'Disconnected';
        }
        switch (connectionHealth) {
            case 'good':
                return 'Connection OK';
            case 'degraded':
                return `Connection degraded (${missedPings} missed ping${missedPings > 1 ? 's' : ''})`;
            case 'poor':
                return `Connection poor (${missedPings} missed pings)`;
            default:
                return 'Connection OK';
        }
    };

    return (
        <Box
            sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getColor(),
                boxShadow: `0 0 8px ${getColor()}80`,
                cursor: 'default',
                title: getTooltip(),
                transition: 'all 0.3s ease',
                '@keyframes pulse': {
                    '0%': { boxShadow: `0 0 8px ${getColor()}80` },
                    '50%': { boxShadow: `0 0 16px ${getColor()}80` },
                    '100%': { boxShadow: `0 0 8px ${getColor()}80` },
                },
                animation: connectionHealth === 'degraded' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
        />
    );
});

export default ConnectionIndicator;
