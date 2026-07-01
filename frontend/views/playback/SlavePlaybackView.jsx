/**
 * @fileoverview Slave Playback View - SmartTV Slave Video Player
 *
 * Displays the SlaveVideoPlayer component when this device is a SmartTV
 * receiving playback from a remote master.
 */

import React from 'react';
import SlaveVideoPlayer from '../../components/media/SlaveVideoPlayer.jsx';

/**
 * SlavePlaybackView Component
 *
 * Wrapper for the SlaveVideoPlayer component used when:
 * - remoteStore.isSmartTV is true (this device is a SmartTV slave)
 * - mediaStore.nowPlayingItem is set (content is being received from master)
 *
 * @returns {React.ReactElement} Slave video player view
 */
export const SlavePlaybackView = () => {
    return <SlaveVideoPlayer />;
};

SlavePlaybackView.displayName = 'SlavePlaybackView';
