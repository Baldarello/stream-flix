import { makeAutoObservable, runInAction } from 'mobx';

import * as driveService from '../services/googleDriveService';
import { db } from '../services/db';
import { mediaStore } from './mediaStore';

class SyncStore {
    // Google Auth state
    googleUser = null;
    isSyncing = false;
    isReloadingData = false;
    isGoogleAuthLoading = false;

    // Sync conflict modal
    isSyncConflictModalOpen = false;
    syncConflictData = null;
    isProcessingSyncConflict = false;

    // Backup debounce timer
    backupDebounceTimer = null;

    // Expose showSnackbar for methods that need to show notifications
    get showSnackbar() {
        return mediaStore.showSnackbar;
    }
    get hideSnackbar() {
        return mediaStore.hideSnackbar;
    }

    constructor() {
        makeAutoObservable(this);
    }

    // Getters
    get isLoggedIn() {
        return !!this.googleUser;
    }

    // Reload all data in memory (used after sync operations instead of page reload)
    reloadAllData = async () => {
        runInAction(() => {
            this.isReloadingData = true;
        });
        try {
            await mediaStore.loadPersistedData();
            await mediaStore.fetchAllData();
        } finally {
            runInAction(() => {
                this.isReloadingData = false;
            });
        }
    };

    synchronizeWithDrive = async () => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            return;
        }
        runInAction(() => {
            this.isSyncing = true;
        });
        try {
            this.showSnackbar('notifications.syncChecking', 'info', true);
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            const lastSyncFileId = (await db.preferences.get('lastSyncFileId'))?.value;

            if (remoteFile) {
                // If the latest remote file is the same one we last synced with, do nothing.
                if (remoteFile.id === lastSyncFileId) {
                    this.showSnackbar('notifications.syncUpToDate', 'success', true);
                    return;
                }

                // A newer remote file exists - compare with local to detect conflicts
                const remoteData = await driveService.readBackupFile(this.googleUser.accessToken, remoteFile.id);

                // Load all local data
                const [localMyList, localCachedItems, localMediaLinks, localEpisodeProgress] = await Promise.all([
                    db.myList.toArray(),
                    db.cachedItems.toArray(),
                    db.mediaLinks.toArray(),
                    db.episodeProgress.toArray(),
                ]);

                const localMyListIds = localMyList.map((item) => item.id);
                const remoteMyListIds = remoteData.myList || [];

                // Check for significant differences
                const hasLocalData = localMyListIds.length > 0 || localMediaLinks.length > 0;
                const hasRemoteData = remoteMyListIds.length > 0 || remoteData.mediaLinks?.length > 0;

                // Detect if there's a real conflict (different data in both)
                const localOnlyItems = localMyListIds.filter((id) => !remoteMyListIds.includes(id));
                const remoteOnlyItems = remoteMyListIds.filter((id) => !localMyListIds.includes(id));
                const hasConflict = (localOnlyItems.length > 0 && hasRemoteData) || (remoteOnlyItems.length > 0 && hasLocalData);

                if (hasConflict && hasLocalData && hasRemoteData) {
                    // Build shows map for detailed comparison
                    const localItemsMap = new Map(localCachedItems.map((item) => [item.id, item]));
                    const remoteItemsMap = new Map((remoteData.cachedItems || []).map((item) => [item.id, item]));

                    const showsMap = new Map();
                    const allIds = new Set([...localItemsMap.keys(), ...remoteItemsMap.keys()]);
                    allIds.forEach((id) => {
                        showsMap.set(id, {
                            local: localItemsMap.get(id),
                            remote: remoteItemsMap.get(id),
                        });
                    });

                    // Show conflict modal
                    runInAction(() => {
                        this.syncConflictData = {
                            myList: {
                                local: localMyListIds,
                                remote: remoteMyListIds,
                            },
                            shows: showsMap,
                            mediaLinks: {
                                local: localMediaLinks,
                                remote: remoteData.mediaLinks || [],
                            },
                            episodeProgress: {
                                local: localEpisodeProgress,
                                remote: remoteData.episodeProgress || [],
                            },
                        };
                        this.isSyncConflictModalOpen = true;
                    });
                    return;
                }

                // No conflict or one side is empty - proceed with simple restore
                this.showSnackbar('notifications.restoringFromCloud', 'info', true);
                await db.importData(remoteData);
                await db.preferences.put({ key: 'lastSyncFileId', value: remoteFile.id });
                this.showSnackbar('notifications.restoreComplete', 'success', true);
                await this.reloadAllData();
            } else {
                // No remote backup exists. Create one from local DB.
                this.showSnackbar('notifications.noBackupFoundCreating', 'info', true);
                const newFile = await this.backupToDrive(false);
                if (newFile) {
                    await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
                }
            }
        } catch (error) {
            console.error('Error during initial sync:', error);
            this.showSnackbar('notifications.syncError', 'error', true);
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    closeSyncConflictModal = () => {
        runInAction(() => {
            this.isSyncConflictModalOpen = false;
            this.syncConflictData = null;
        });
    };

    mergeLocalAndRemote = async (choices, deletedIds = []) => {
        if (!this.syncConflictData || !this.googleUser?.accessToken) {
            this.closeSyncConflictModal();
            return;
        }

        runInAction(() => {
            this.isProcessingSyncConflict = true;
        });

        try {
            const { myList, shows, mediaLinks, episodeProgress } = this.syncConflictData;

            // If no choices provided, do automatic merge (keep everything)
            if (!choices || choices.length === 0) {
                // Automatic merge: keep all unique items from both
                const mergedMyList = [...new Set([...myList.local, ...myList.remote])];

                // For shows, prefer local if it exists, otherwise use remote
                const mergedShows = [];
                shows.forEach((data) => {
                    if (data.local) {
                        mergedShows.push(data.local);
                    } else if (data.remote) {
                        mergedShows.push(data.remote);
                    }
                });

                // For links, combine all unique links (by URL)
                const mergedLinksMap = new Map();
                [...mediaLinks.local, ...mediaLinks.remote].forEach((link) => {
                    const key = `${link.mediaId}|${link.url}`;
                    if (!mergedLinksMap.has(key)) {
                        mergedLinksMap.set(key, link);
                    }
                });
                const mergedLinks = Array.from(mergedLinksMap.values());

                // For episode progress, keep the one with more recent timestamp
                const mergedProgressMap = new Map();
                [...episodeProgress.local, ...episodeProgress.remote].forEach((progress) => {
                    const existing = mergedProgressMap.get(progress.episodeId);
                    if (
                        !existing ||
                        (progress.lastWatchedAt && existing.lastWatchedAt && progress.lastWatchedAt > existing.lastWatchedAt)
                    ) {
                        mergedProgressMap.set(progress.episodeId, progress);
                    }
                });
                const mergedProgress = Array.from(mergedProgressMap.values());

                // Strip Dexie Proxy objects before storing to IndexedDB
                const cleanedShows = JSON.parse(JSON.stringify(mergedShows));
                const cleanedLinks = JSON.parse(JSON.stringify(mergedLinks));
                const cleanedProgress = JSON.parse(JSON.stringify(mergedProgress));

                // Import merged data
                const mergedData = {
                    myList: JSON.parse(
                        JSON.stringify(
                            (mergedMyList || [])
                                .map((id) => (typeof id === 'object' && id !== null ? id.id : id))
                                .filter((id) => typeof id === 'number' || typeof id === 'string')
                                .map((id, index) => ({ id, order: index }))
                        )
                    ),
                    cachedItems: cleanedShows,
                    mediaLinks: cleanedLinks,
                    episodeProgress: cleanedProgress,
                };

                await db.importData(mergedData);

                // Backup merged data to drive
                const newFile = await this.backupToDrive(false);
                if (newFile) {
                    await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
                }

                this.showSnackbar('notifications.syncMergeComplete', 'success', true);
                this.closeSyncConflictModal();
                await this.reloadAllData();
                return;
            }

            // Interactive merge based on user choices
            const finalMyList = [];
            const finalShows = [];
            const finalLinks = [];
            const finalProgress = [];
            const chosenIds = new Set(choices.map((c) => c.id));

            // Process each choice
            choices.forEach((choice) => {
                const showData = shows.get(choice.id);
                if (!showData) return;

                // My List
                if (choice.myListAction === 'local' || choice.myListAction === 'both') {
                    if (!finalMyList.includes(choice.id)) {
                        finalMyList.push(choice.id);
                    }
                }
                if (choice.myListAction === 'remote' || choice.myListAction === 'both') {
                    if (!finalMyList.includes(choice.id)) {
                        finalMyList.push(choice.id);
                    }
                }

                // Shows - add the show from the chosen side
                if (choice.myListAction !== 'none') {
                    if (choice.myListAction === 'local' || choice.myListAction === 'both') {
                        if (showData.local) {
                            finalShows.push(showData.local);
                        }
                    }
                    if (choice.myListAction === 'remote' || choice.myListAction === 'both') {
                        if (showData.remote && !finalShows.some((s) => s.id === showData.remote.id)) {
                            finalShows.push(showData.remote);
                        }
                    }
                }

                // Links based on choice
                const localLinks = mediaLinks.local.filter((l) => {
                    if (showData.local?.seasons) {
                        return showData.local.seasons.some((s) => s.episodes.some((e) => e.id === l.mediaId));
                    }
                    return l.mediaId === choice.id;
                });
                const remoteLinks = mediaLinks.remote.filter((l) => {
                    if (showData.remote?.seasons) {
                        return showData.remote.seasons.some((s) => s.episodes.some((e) => e.id === l.mediaId));
                    }
                    return l.mediaId === choice.id;
                });

                if (choice.linksAction === 'local') {
                    finalLinks.push(...localLinks);
                } else if (choice.linksAction === 'remote') {
                    finalLinks.push(...remoteLinks);
                } else {
                    // both
                    finalLinks.push(...localLinks, ...remoteLinks);
                }

                // Progress based on choice
                const localProgress = episodeProgress.local.filter((p) => {
                    if (!showData.local?.seasons) return false;
                    return showData.local.seasons.some((s) => s.episodes.some((e) => e.id === p.episodeId));
                });
                const remoteProgress = episodeProgress.remote.filter((p) => {
                    if (!showData.remote?.seasons) return false;
                    return showData.remote.seasons.some((s) => s.episodes.some((e) => e.id === p.episodeId));
                });

                if (choice.progressAction === 'local') {
                    finalProgress.push(...localProgress);
                } else if (choice.progressAction === 'remote') {
                    finalProgress.push(...remoteProgress);
                } else {
                    // both
                    // For both, merge with timestamp check
                    const progressMap = new Map();
                    [...localProgress, ...remoteProgress].forEach((p) => {
                        const existing = progressMap.get(p.episodeId);
                        if (
                            !existing ||
                            (p.lastWatchedAt && existing.lastWatchedAt && p.lastWatchedAt > existing.lastWatchedAt)
                        ) {
                            progressMap.set(p.episodeId, p);
                        }
                    });
                    finalProgress.push(...progressMap.values());
                }
            });

            // Preserve shows that are in the conflict payload but NOT in the
            // user's per-row choices (i.e. shows that the conflict modal
            // filtered out because the user never added them to My List and
            // they have no links/progress). Without this loop the merge
            // would wipe those shows from the local cache because
            // `db.importData` clears `cachedItems` before re-populating it.
            shows.forEach((data, id) => {
                if (chosenIds.has(id)) return;
                if (data.local) {
                    finalShows.push(data.local);
                } else if (data.remote) {
                    finalShows.push(data.remote);
                }
                // Also keep any links / progress attached to the unchosen
                // show so the user's existing data is preserved.
                const localLinks = mediaLinks.local.filter((l) => {
                    if (data.local?.seasons) {
                        return data.local.seasons.some((s) => s.episodes.some((e) => e.id === l.mediaId));
                    }
                    return l.mediaId === id;
                });
                const remoteLinks = mediaLinks.remote.filter((l) => {
                    if (data.remote?.seasons) {
                        return data.remote.seasons.some((s) => s.episodes.some((e) => e.id === l.mediaId));
                    }
                    return l.mediaId === id;
                });
                finalLinks.push(...localLinks, ...remoteLinks);
                const localProgress = episodeProgress.local.filter((p) => {
                    if (!data.local?.seasons) return false;
                    return data.local.seasons.some((s) => s.episodes.some((e) => e.id === p.episodeId));
                });
                const remoteProgress = episodeProgress.remote.filter((p) => {
                    if (!data.remote?.seasons) return false;
                    return data.remote.seasons.some((s) => s.episodes.some((e) => e.id === p.episodeId));
                });
                finalProgress.push(...localProgress, ...remoteProgress);
            });

            // Remove duplicate links by URL
            const uniqueLinksMap = new Map();
            finalLinks.forEach((link) => {
                const key = `${link.mediaId}|${link.url}`;
                if (!uniqueLinksMap.has(key)) {
                    uniqueLinksMap.set(key, link);
                }
            });

            // Strip Dexie Proxy objects before storing to IndexedDB
            const cleanedShows = JSON.parse(JSON.stringify(finalShows));
            const cleanedLinks = JSON.parse(JSON.stringify(Array.from(uniqueLinksMap.values())));
            const cleanedProgress = JSON.parse(JSON.stringify(finalProgress));

            // Import merged data
            const mergedData = {
                myList: JSON.parse(
                    JSON.stringify(
                        (finalMyList || [])
                            .map((id) => (typeof id === 'object' && id !== null ? id.id : id))
                            .filter((id) => typeof id === 'number' || typeof id === 'string')
                            .map((id, index) => ({ id, order: index }))
                    )
                ),
                cachedItems: cleanedShows,
                mediaLinks: cleanedLinks,
                episodeProgress: cleanedProgress,
            };

            await db.importData(mergedData);

            // Delete shows marked for deletion
            if (deletedIds.length > 0) {
                console.log('Deleting shows:', deletedIds);
                await db.myList.bulkDelete(deletedIds);
                await db.cachedItems.bulkDelete(deletedIds);
                await db.mediaLinks.where('mediaId').anyOf(deletedIds).delete();
                await db.episodeProgress.where('episodeId').anyOf(deletedIds).delete();
            }

            // Backup merged data to drive
            const newFile = await this.backupToDrive(false);
            if (newFile) {
                await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
            }

            this.showSnackbar('notifications.syncMergeComplete', 'success', true);
            this.closeSyncConflictModal();
            await this.reloadAllData();
        } catch (error) {
            console.error('Error merging data:', error);
            this.showSnackbar('notifications.syncMergeError', 'error', true, { error: error.message });
        } finally {
            runInAction(() => {
                this.isProcessingSyncConflict = false;
            });
        }
    };

    overwriteLocalWithRemote = async () => {
        if (!this.syncConflictData || !this.googleUser?.accessToken) {
            this.closeSyncConflictModal();
            return;
        }

        runInAction(() => {
            this.isProcessingSyncConflict = true;
        });

        try {
            // Get the remote file ID again for updating lastSyncFileId
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);

            // Build the remote data structure from conflict data
            const { myList, shows, mediaLinks, episodeProgress } = this.syncConflictData;

            const remoteData = {
                myList: JSON.parse(
                    JSON.stringify(
                        (myList.remote || [])
                            .map((id) => (typeof id === 'object' && id !== null ? id.id : id))
                            .filter((id) => typeof id === 'number' || typeof id === 'string')
                            .map((id, index) => ({ id, order: index }))
                    )
                ),
                cachedItems: JSON.parse(
                    JSON.stringify(
                        Array.from(shows.values())
                            .filter((s) => s.remote)
                            .map((s) => s.remote)
                    )
                ),
                mediaLinks: JSON.parse(JSON.stringify(mediaLinks.remote)),
                episodeProgress: JSON.parse(JSON.stringify(episodeProgress.remote)),
            };

            await db.importData(remoteData);

            if (remoteFile) {
                await db.preferences.put({ key: 'lastSyncFileId', value: remoteFile.id });
            }

            this.showSnackbar('notifications.syncOverwriteLocalComplete', 'success', true);
            this.closeSyncConflictModal();
            await this.reloadAllData();
        } catch (error) {
            console.error('Error overwriting local data:', error);
            this.showSnackbar('notifications.syncOverwriteLocalError', 'error', true, { error: error.message });
        } finally {
            runInAction(() => {
                this.isProcessingSyncConflict = false;
            });
        }
    };

    overwriteRemoteWithLocal = async () => {
        if (!this.syncConflictData || !this.googleUser?.accessToken) {
            this.closeSyncConflictModal();
            return;
        }

        runInAction(() => {
            this.isProcessingSyncConflict = true;
        });

        try {
            const { myList, shows, mediaLinks, episodeProgress } = this.syncConflictData;

            // Build local data structure
            const localData = {
                myList: JSON.parse(
                    JSON.stringify(
                        (myList.local || [])
                            .map((id) => (typeof id === 'object' && id !== null ? id.id : id))
                            .filter((id) => typeof id === 'number' || typeof id === 'string')
                            .map((id, index) => ({ id, order: index }))
                    )
                ),
                cachedItems: JSON.parse(
                    JSON.stringify(
                        Array.from(shows.values())
                            .filter((s) => s.local)
                            .map((s) => s.local)
                    )
                ),
                mediaLinks: JSON.parse(JSON.stringify(mediaLinks.local)),
                episodeProgress: JSON.parse(JSON.stringify(episodeProgress.local)),
            };

            // Backup local data to drive (overwrites remote)
            const tablesToBackup = [
                'myList',
                'viewingHistory',
                'cachedItems',
                'mediaLinks',
                'showIntroDurations',
                'preferences',
                'episodeProgress',
                'preferredSources',
                'selectedSeasons',
                'showFilterPreferences',
                'knownSlaves',
            ];
            const data = {};
            for (const tableName of tablesToBackup) {
                if (db[tableName]) {
                    // Strip Dexie Proxy objects before storing to Drive
                    data[tableName] = JSON.parse(JSON.stringify(await db[tableName].toArray()));
                }
            }

            const newFile = await driveService.writeBackupFile(this.googleUser.accessToken, data);
            await driveService.deleteOldBackups(this.googleUser.accessToken);

            if (newFile) {
                await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
            }

            this.showSnackbar('notifications.syncOverwriteRemoteComplete', 'success', true);
            this.closeSyncConflictModal();
        } catch (error) {
            console.error('Error overwriting remote data:', error);
            this.showSnackbar('notifications.syncOverwriteRemoteError', 'error', true, { error: error.message });
        } finally {
            runInAction(() => {
                this.isProcessingSyncConflict = false;
            });
        }
    };

    cancelSyncAndLogout = () => {
        // Close modal and sign out
        this.closeSyncConflictModal();
        // Import dynamically to avoid circular dependency
        import('../services/googleAuthService').then(({ handleSignOut }) => {
            handleSignOut();
        });
        this.showSnackbar('notifications.syncCancelled', 'info', true);
    };

    backupToDrive = async (showNotification = true) => {
        if (!this.isLoggedIn || !this.googleUser?.accessToken) {
            if (showNotification) this.showSnackbar('notifications.loginRequired', 'warning', true);
            return;
        }
        if (showNotification) this.showSnackbar('notifications.backupInProgress', 'info', true);
        runInAction(() => {
            this.isSyncing = true;
        });
        try {
            const tablesToBackup = [
                'myList',
                'viewingHistory',
                'cachedItems',
                'mediaLinks',
                'showIntroDurations',
                'preferences',
                'episodeProgress',
                'preferredSources',
                'selectedSeasons',
                'showFilterPreferences',
                'knownSlaves',
            ];
            const data = {};
            for (const tableName of tablesToBackup) {
                if (db[tableName]) {
                    data[tableName] = await db[tableName].toArray();
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
        runInAction(() => {
            this.isSyncing = true;
        });
        try {
            const remoteFile = await driveService.findLatestBackupFile(this.googleUser.accessToken);
            if (remoteFile) {
                const data = await driveService.readBackupFile(this.googleUser.accessToken, remoteFile.id);
                await db.importData(data);
                await db.preferences.put({ key: 'lastSyncFileId', value: remoteFile.id });
                this.showSnackbar('notifications.restoreComplete', 'success', true);
                await this.reloadAllData();
            } else {
                this.showSnackbar('notifications.noBackupFound', 'warning', true);
            }
        } catch (error) {
            console.error('Error during restore:', error);
            this.showSnackbar('notifications.restoreError', 'error', true, { error: error.message });
        } finally {
            runInAction(() => {
                this.isSyncing = false;
            });
        }
    };

    triggerDebouncedBackup = () => {
        if (this.backupDebounceTimer) clearTimeout(this.backupDebounceTimer);
        this.backupDebounceTimer = window.setTimeout(async () => {
            if (this.isLoggedIn) {
                const newFile = await this.backupToDrive();
                if (newFile) {
                    await db.preferences.put({ key: 'lastSyncFileId', value: newFile.id });
                }
            }
        }, 30000); // 30-second debounce
    };

    setGoogleUser = async (user) => {
        runInAction(() => {
            this.googleUser = user;
        });
        if (user) {
            this.showSnackbar('notifications.welcomeUser', 'success', true, { name: user.name });
        } else {
            this.showSnackbar('notifications.logoutSuccess', 'info', true);
        }
    };
}

export const syncStore = new SyncStore();
