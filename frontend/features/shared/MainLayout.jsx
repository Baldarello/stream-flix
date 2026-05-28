/**
 * @fileoverview Shared Feature - Main Layout Component
 * 
 * This component wraps the main application content with the standard layout:
 * Header, main content area, Footer, DetailView, and ProfileDrawer.
 */

import React from 'react';
import { Box } from '@mui/material';
import { mediaStore } from '../../store/mediaStore.js';
import { Header } from '../../components/layout/Header.jsx';
import { Footer } from '../../components/layout/Footer.jsx';
import DetailView from '../../components/media/DetailView.jsx';
import ProfileDrawer from '../../components/utilities/ProfileDrawer.jsx';
import WatchTogetherModal from '../../components/modals/WatchTogetherModal.jsx';
import { NotificationSnackbar } from '../../components/utilities/NotificationSnackbar.jsx';
import LinkSelectionModal from '../../components/modals/LinkSelectionModal.jsx';
import LinkMovieModal from '../../components/modals/LinkMovieModal.jsx';
import ShareLibraryModal from '../../components/modals/ShareLibraryModal.jsx';
import ImportLibraryModal from '../../components/modals/ImportLibraryModal.jsx';
import RevisionsModal from '../../components/modals/RevisionsModal.jsx';
import MediaSyncModal from '../../components/modals/MediaSyncModal.jsx';
import GoogleDriveSyncConflictModal from '../../components/modals/GoogleDriveSyncConflictModal.jsx';
import EpisodeInfoModal from '../../components/modals/EpisodeInfoModal.jsx';
import NotificationsModal from '../../components/modals/NotificationsModal.jsx';

/**
 * Main Layout Component
 * 
 * Wraps the main content with the standard app layout including:
 * Header, Footer, DetailView (when item selected), ProfileDrawer, and modals.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Main content to render
 * @returns {React.ReactElement} Layout wrapper component
 */
export const MainLayout = ({ children }) => {
    const { currentSelectedItem } = mediaStore;

    return (
        <Box sx={{ color: 'text.primary' }}>
            <Header />
            <main style={{ pt: 'calc(64px + env(safe-area-inset-top))' }}>
                {children}
            </main>
            <Footer />
            
            {/* Detail View */}
            {currentSelectedItem && <DetailView />}
            
            {/* Drawers */}
            <ProfileDrawer />
            
            {/* Modals */}
            <WatchTogetherModal />
            <NotificationSnackbar />
            <LinkSelectionModal />
            <LinkMovieModal />
            <ShareLibraryModal />
            <ImportLibraryModal />
            <RevisionsModal />
            <MediaSyncModal
                open={mediaStore.isMediaSyncModalOpen}
                onClose={() => mediaStore.closeMediaSyncModal()}
                slaveId={mediaStore.mediaSyncTargetSlaveId || ''}
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
        </Box>
    );
};
