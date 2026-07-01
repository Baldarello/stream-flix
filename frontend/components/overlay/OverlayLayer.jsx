/**
 * @fileoverview Overlay Layer - Modal and Drawer Components
 *
 * This module exports all overlay components that should always be rendered
 * on top of the main content. These components are not part of ViewSwitch
 * because they need to be visible regardless of the current view.
 *
 * All modals are lazy-loaded via React.lazy for code splitting.
 */

import React, { lazy, Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../../store/mediaStore.js';
import { remoteStore } from '../../store/remoteStore.js';
import { NotificationSnackbar } from '../utilities/NotificationSnackbar.jsx';
import { Skeleton } from '../feedback/Skeleton.jsx';

// Lazy-loaded modals
const WatchTogetherModal = lazy(() => import('../modals/WatchTogetherModal.jsx'));
const LinkSelectionModal = lazy(() => import('../modals/LinkSelectionModal.jsx'));
const LinkMovieModal = lazy(() => import('../modals/LinkMovieModal.jsx'));
const ShareLibraryModal = lazy(() => import('../modals/ShareLibraryModal.jsx'));
const ImportLibraryModal = lazy(() => import('../modals/ImportLibraryModal.jsx'));
const RevisionsModal = lazy(() => import('../modals/RevisionsModal.jsx'));
const MediaSyncModal = lazy(() => import('../modals/MediaSyncModal.jsx'));
const GoogleDriveSyncConflictModal = lazy(() => import('../modals/GoogleDriveSyncConflictModal.jsx'));
const EpisodeInfoModal = lazy(() => import('../modals/EpisodeInfoModal.jsx'));
const NotificationsModal = lazy(() => import('../modals/NotificationsModal.jsx'));

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
            {/* Modals - lazy loaded with Suspense */}
            <Suspense fallback={<Skeleton id="overlay-watch-together-suspense" />}>
                <WatchTogetherModal />
            </Suspense>
            <NotificationSnackbar />
            <Suspense fallback={<Skeleton id="overlay-link-selection-suspense" />}>
                <LinkSelectionModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-link-movie-suspense" />}>
                <LinkMovieModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-share-library-suspense" />}>
                <ShareLibraryModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-import-library-suspense" />}>
                <ImportLibraryModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-revisions-suspense" />}>
                <RevisionsModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-media-sync-suspense" />}>
                <MediaSyncModal
                    open={remoteStore.isMediaSyncModalOpen}
                    onClose={() => remoteStore.closeMediaSyncModal()}
                    slaveId={remoteStore.mediaSyncTargetSlaveId || ''}
                />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-drive-conflict-suspense" />}>
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
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-episode-info-suspense" />}>
                <EpisodeInfoModal />
            </Suspense>
            <Suspense fallback={<Skeleton id="overlay-notifications-suspense" />}>
                <NotificationsModal />
            </Suspense>
        </>
    );
});

OverlayLayer.displayName = 'OverlayLayer';
