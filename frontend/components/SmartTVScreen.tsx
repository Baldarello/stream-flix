import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {Box} from '@mui/material';
import {mediaStore} from '../store/mediaStore.ts';
import {websocketService} from '../services/websocketService.js';
import SmartTVBackground from './SmartTVBackground.tsx';
import SmartTVLoadingView from './SmartTVLoadingView.tsx';
import SmartTVReconnectingView from './SmartTVReconnectingView.tsx';
import SmartTVConnectedView from './SmartTVConnectedView.tsx';
import SmartTVPairingView from './SmartTVPairingView.tsx';

const SmartTVScreen: React.FC = observer(() => {
    const {slaveId, isRemoteMasterConnected, isSmartTV} = mediaStore;

    // Track if we've already sent the disconnecting message to avoid duplicates
    const hasSentDisconnecting = useRef(false);

    // Track if we're in a reconnection state (between beforeunload and reconnect)
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Animation state for staggered entrance
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        // Delay content reveal for smooth entrance animation
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Send disconnecting message before page unload to preserve session for reconnection
    useEffect(() => {
        if (!isSmartTV || !slaveId) return;

        const handleBeforeUnload = () => {
            // Only send once to avoid duplicate messages
            if (hasSentDisconnecting.current) return;
            hasSentDisconnecting.current = true;

            // Set reconnecting state to show loading UI
            setIsReconnecting(true);

            // Close the WebSocket to ensure the server properly handles the disconnect
            // This is critical for the session to be preserved for reconnection
            if (websocketService.ws) {
                websocketService.slaveDisconnecting();
                // Close with a delay to ensure the message is sent
                setTimeout(() => {
                    if (websocketService.ws && websocketService.ws.readyState === WebSocket.OPEN) {
                        websocketService.ws.close(1000, 'Intentional disconnect for reload');
                    }
                }, 100);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isSmartTV, slaveId]);

    // Clear reconnecting state when connection is restored
    useEffect(() => {
        if (isRemoteMasterConnected && isReconnecting) {
            setIsReconnecting(false);
        }
    }, [isRemoteMasterConnected, isReconnecting]);

    const renderContent = () => {
        // Show reconnecting state when slave is refreshing (between beforeunload and reconnect)
        if (isReconnecting) {
            return <SmartTVReconnectingView showContent={showContent} />;
        }

        if (isRemoteMasterConnected) {
            return <SmartTVConnectedView showContent={showContent} />;
        }

        if (slaveId) {
            return <SmartTVPairingView showContent={showContent} />;
        }

        // Loading state
        return <SmartTVLoadingView showContent={showContent} />;
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                bgcolor: 'background.default',
                color: 'text.primary',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <SmartTVBackground />

            {/* Main content - scrollable wrapper */}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    px: 3,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    width: '100%',
                    // Safe area padding for mobile notches/status bars
                    pt: 2,
                    pb: 2,
                }}
            >
                {renderContent()}
            </Box>
        </Box>
    );
});

export default SmartTVScreen;
