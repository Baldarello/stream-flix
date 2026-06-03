/**
 * @fileoverview GoogleDriveSyncConflictModal - modal orchestrator.
 *
 * Thin wrapper around `ModalShell` that hosts the two atomic steps
 * (overview / choose) of the Google Drive sync conflict resolution
 * flow. The component itself owns no `useState` — all per-screen
 * state lives in `googleDriveSyncConflictStore` and is exposed
 * through `mediaStore` (delegation pattern).
 *
 * The component still accepts the legacy prop contract
 * (`open`, `onClose`, `conflictData`, `onMerge`, `onOverwriteLocal`,
 * `onOverwriteRemote`, `onCancel`, `isProcessing`) so the existing
 * mounts in `OverlayLayer.jsx` and `MainLayout.jsx` keep working
 * without changes.
 */
import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from './ModalShell.jsx';
import {
    SyncConflictOverviewStep,
    SyncConflictChooseStep,
    SyncConflictActionPanel,
    SyncConflictProcessingOverlay
} from './syncConflict/index.js';

const GoogleDriveSyncConflictModal = observer(({
                                                   open,
                                                   onClose,
                                                   conflictData,
                                                   onMerge,
                                                   onOverwriteLocal,
                                                   onOverwriteRemote,
                                                   onCancel,
                                                   isProcessing = false
                                               }) => {
    const {t} = useTranslations();
    const {
        syncConflictStep,
        syncConflictChoices,
        initializeSyncConflictChoices,
        setSyncConflictStep,
        resetSyncConflict
    } = mediaStore;

    const lastInitializedRef = useRef(null);

    // Hydrate the per-screen store whenever the upstream conflictData
    // changes (or when the modal re-opens with the same fixture).
    useEffect(() => {
        if (!open) return;
        if (conflictData && lastInitializedRef.current !== conflictData) {
            initializeSyncConflictChoices(conflictData);
            lastInitializedRef.current = conflictData;
            setSyncConflictStep('overview');
        }
    }, [open, conflictData, initializeSyncConflictChoices, setSyncConflictStep]);

    // Reset when the modal closes so a subsequent conflict re-hydrates
    // from scratch.
    useEffect(() => {
        if (!open) {
            lastInitializedRef.current = null;
            resetSyncConflict();
        }
    }, [open, resetSyncConflict]);

    const handleMerge = () => {
        if (typeof onMerge !== 'function') return;
        const choicesToSend = syncConflictChoices;
        const filteredChoices = choicesToSend.filter(c => !c.deleteShow);
        const deletedIds = choicesToSend.filter(c => c.deleteShow).map(c => c.id);
        onMerge(filteredChoices, deletedIds);
    };

    return (
        <ModalShell
            id="google-drive-sync-conflict-modal"
            data-component="google-drive-sync-conflict-modal"
            open={!!open}
            onClose={isProcessing ? undefined : onClose}
            title={t('syncConflict.title')}
            maxWidth="md"
        >
            {isProcessing ? (
                <SyncConflictProcessingOverlay/>
            ) : (
                <>
                    {syncConflictStep === 'overview' && <SyncConflictOverviewStep/>}
                    {syncConflictStep === 'choose' && <SyncConflictChooseStep/>}
                    <SyncConflictActionPanel
                        onMerge={handleMerge}
                        onOverwriteLocal={onOverwriteLocal}
                        onOverwriteRemote={onOverwriteRemote}
                        onCancel={onCancel}
                    />
                </>
            )}
        </ModalShell>
    );
});

GoogleDriveSyncConflictModal.displayName = 'GoogleDriveSyncConflictModal';

export default GoogleDriveSyncConflictModal;
