/**
 * @fileoverview Master Playback View - Remote Master Controls
 * 
 * Displays the MasterRemotePlayerControlView when this device is a remote master
 * controlling playback on a SmartTV slave.
 */

import React from 'react';
import MasterRemotePlayerControlView from '@/remote/master/MasterRemotePlayerControlView.jsx';

/**
 * MasterPlaybackView Component
 * 
 * Wrapper for the MasterRemotePlayerControlView component used when:
 * - remoteStore.isRemoteMaster is true (this device is a remote master)
 * - remoteStore.remoteSlaveState?.nowPlayingItem is set (slave is playing)
 * 
 * @returns {React.ReactElement} Remote master playback controls view
 */
export const MasterPlaybackView = () => {
    return <MasterRemotePlayerControlView />;
};

MasterPlaybackView.displayName = 'MasterPlaybackView';
