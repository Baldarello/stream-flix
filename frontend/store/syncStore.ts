import {makeAutoObservable, runInAction} from 'mobx';
import type {GoogleUser} from '../types.ts';
import * as driveService from '../services/googleDriveService';
import {db} from '../services/db';
import type {AlertColor} from '@mui/material';

class SyncStore {
    // Google Auth state
    googleUser: GoogleUser | null = null;
    isSyncing = false;
    isReloadingData = false;
    isGoogleAuthLoading = false;
    
    // Sync conflict modal
    isSyncConflictModalOpen = false;
    syncConflictData: {
        myList: { local: number[]; remote: number[] };
        shows: Map<number, { local: any; remote: any }>;
        mediaLinks: { local: any[]; remote: any[] };
        episodeProgress: { local: any[]; remote: any[] };
    } | null = null;
    isProcessingSyncConflict = false;
    
    // Snackbar helper
    showSnackbar = (message: string, severity: AlertColor = 'info', isTranslationKey = false, translationValues?: Record<string, any>) => {
        // Delegate to mediaStore for actual display
        // This avoids circular dependency
    };
    
    // Getters
    get isLoggedIn() {
        return !!this.googleUser;
    }

    backupToDrive = async (showNotification = true): Promise<driveService.DriveFile | undefined> => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            if (showNotification) this.showSnackbar('notifications.loginRequired', 'warning', true);
            return;
        }
        if (showNotification) this.showSnackbar('notifications.backupInProgress', 'info', true);
        this.isSyncing = true;
        try {
            const tablesToBackup = ['myList', 'viewingHistory', 'cachedItems', 'mediaLinks', 'showIntroDurations', 'preferences', 'episodeProgress', 'preferredSources', 'selectedSeasons', 'showFilterPreferences', 'knownSlaves'];
            const data: { [key: string]: any[] } = {};
            for (const tableName of tablesToBackup) {
                if ((db as any)[tableName]) {
                    data[tableName] = await (db as any)[tableName].toArray();
                }
            }

            const newFile = await driveService.writeBackupFile(this.googleUser.accessToken, data);
            await driveService.deleteOldBackups(this.googleUser.accessToken);

            if (showNotification) this.showSnackbar('notifications.backupComplete', 'success', true);
            return newFile;
        } catch (error) {
            console.error('Failed to backup to drive:', error);
            if (showNotification) this.showSnackbar('notifications.backupSaveError', 'error', true);
            return undefined;
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    restoreFromDrive = async () => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            this.showSnackbar('notifications.loginRequired', 'warning', true);
            return;
        }
        this.showSnackbar('notifications.restoreInProgress', 'info', true);
        this.isSyncing = true;
        try {
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            if (remoteFile) {
                const data = await driveService.readBackupFile(this.googleUser.accessToken, remoteFile.id);
                await db.importData(data);
                await db.preferences.put({key: 'lastSyncFileId', value: remoteFile.id});
                this.showSnackbar('notifications.restoreComplete', 'success', true);
            } else {
                this.showSnackbar('notifications.noBackupFound', 'warning', true);
            }
        } catch (error) {
            console.error("Error during restore:", error);
            this.showSnackbar('notifications.restoreError', 'error', true, {error: (error as Error).message});
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    // TODO: Implementare metodi di sync
    // synchronizeWithDrive, backupToDrive, restoreFromDrive, mergeLocalAndRemote, etc.
}

export const syncStore = new SyncStore();
