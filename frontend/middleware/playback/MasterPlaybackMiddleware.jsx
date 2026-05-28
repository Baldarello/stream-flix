/**
 * @fileoverview Playback Middleware - Remote Master Handler
 * 
 * This middleware handles the remote master playback mode,
 * displaying the remote player control view when the master controls a slave's playback.
 */

import React from 'react';
import RemotePlayerControlView from '../../components/utilities/RemotePlayerControlView.jsx';
import MediaSyncModal from '../../components/modals/MediaSyncModal.jsx';
import { NotificationSnackbar } from '../../components/utilities/NotificationSnackbar.jsx';
import DebugOverlay from '../../components/utilities/DebugOverlay.jsx';

/**
 * Master Playback Middleware
 * 
 * Checks if the device is a remote master and a slave is playing content.
 * If so, displays the RemotePlayerControlView for controlling the slave's playback.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with mediaSyncModalOpen and mediaSyncTargetSlaveId
 * @param {Object} context.stores.remoteStore - Remote store with isRemoteMaster and remoteSlaveState
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Remote player control view or null to continue chain
 */
export const MasterPlaybackMiddleware = ({ stores, children }) => {
    const { isRemoteMaster, remoteSlaveState } = stores.remoteStore;
    const { isMediaSyncModalOpen, mediaSyncTargetSlaveId } = stores.mediaStore;

    if (isRemoteMaster && remoteSlaveState?.nowPlayingItem) {
        return (
            <>
                <RemotePlayerControlView />
                <MediaSyncModal
                    open={isMediaSyncModalOpen}
                    onClose={() => stores.mediaStore.closeMediaSyncModal()}
                    slaveId={mediaSyncTargetSlaveId || ''}
                />
                <NotificationSnackbar />
                <DebugOverlay />
            </>
        );
    }

    return children;
};
