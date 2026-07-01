/**
 * @fileoverview Local Playback View - Local Video Player
 *
 * Displays the VideoPlayer component when local content is playing.
 */

import React from 'react';
import VideoPlayer from '../../components/media/VideoPlayer.jsx';

/**
 * LocalPlaybackView Component
 *
 * Wrapper for the VideoPlayer component used when:
 * - mediaStore.nowPlayingItem is set (local content is playing)
 *
 * @returns {React.ReactElement} Local video player view
 */
export const LocalPlaybackView = () => {
    return <VideoPlayer />;
};

LocalPlaybackView.displayName = 'LocalPlaybackView';
