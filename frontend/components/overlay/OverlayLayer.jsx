/**
 * @fileoverview Overlay Layer - Modal and Drawer Components
 * 
 * This module exports all overlay components that should always be rendered
 * on top of the main content. These components are not part of ViewSwitch
 * because they need to be visible regardless of the current view.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../../store/mediaStore.js';
import { remoteStore } from '../../store/remoteStore.js';
import WatchTogetherModal from '../modals/WatchTogetherModal.jsx';
import { NotificationSnackbar } from '../utilities/NotificationSnackbar.jsx';
import LinkSelectionModal from '../modals/LinkSelectionModal.jsx';
import LinkMovieModal from '../modals/LinkMovieModal.jsx';
import ShareLibraryModal from '../modals/ShareLibraryModal.jsx';
import ImportLibraryModal from '../modals/ImportLibraryModal.jsx';
import RevisionsModal from '../modals/RevisionsModal.jsx';
import MediaSyncModal from '../modals/MediaSyncModal.jsx';
import GoogleDriveSyncConflictModal from '../modals/GoogleDriveSyncConflictModal.jsx';
import EpisodeInfoModal from '../modals/EpisodeInfoModal.jsx';
import NotificationsModal from '../modals/NotificationsModal.jsx';

/**
 * OverlayLayer Component
 * 
 * Renders all modal dialogs, drawers, and snackbar notifications.
 * This component is always rendered on top of the main content
 * regardless of which view is currently active.
 * 
 * @returns {React.ReactElement} Overlay components
 */
export const OverlayLayer = observer(() => {
    return (
        <>
            {/* Modals */}
            <WatchTogetherModal />
            <NotificationSnackbar />
            <LinkSelectionModal />
            <LinkMovieModal />
            <ShareLibraryModal />
            <ImportLibraryModal />
            <RevisionsModal />
            <MediaSyncModal
                open={remoteStore.isMediaSyncModalOpen}
                onClose={() => remoteStore.closeMediaSyncModal()}
                slaveId={remoteStore.mediaSyncTargetSlaveId || ''}
            />
            <GoogleDriveSyncConflictModal
                open={mediaStore.isSyncConflictModalOpen}
                onClose={() => mediaStore.closeSyncConflictModal()}
                conflictData={mediaStore.syncConflictData}
                onMerge={(choices, deletedIds) => mediaStore.mergeLocalAndRemote(choices, deletedIds)}
                onOverwriteLocal={() => mediaStore.overwriteLocalWithRemote()}
                onOverwriteRemote={() => mediaStore.overwriteRemoteWithLocal()}
                onCancel={() => mediaStore.cancelSyncAndLogout()}
                isProcessing={mediaStore.isProcessingSyncConflict}
            />
            <EpisodeInfoModal />
            <NotificationsModal />
        </>
    );
});

OverlayLayer.displayName = 'OverlayLayer';
