import Dexie from 'dexie';

/**
 * @typedef {Object} MyListItem
 * @property {number} id
 * @property {number} [order]
 */

/**
 * @typedef {Object} ShowIntroDuration
 * @property {number} id
 * @property {number} duration
 */

/**
 * @typedef {Object} Preference
 * @property {string} key
 * @property {*} value
 */

/**
 * @typedef {Object} SelectedSeason
 * @property {number} showId
 * @property {number} seasonNumber
 */

/**
 * @typedef {Object} Revision
 * @property {number} [id]
 * @property {number} timestamp
 * @property {string} table
 * @property {*} key
 * @property {1|2|3} type
 * @property {*} [obj]
 * @property {*} [oldObj]
 */

/**
 * @typedef {Object} DbChange
 * @property {string} table
 * @property {*} key
 * @property {1|2|3} type
 * @property {*} [obj]
 * @property {*} [oldObj]
 */

/**
 * @typedef {Object} KnownSlave
 * @property {string} id
 * @property {string} name
 * @property {number} lastSeen
 * @property {string} [shortCode]
 */

export class QuixDB extends Dexie {
    constructor() {
        super('quixDB');

        this.version(1).stores({
            myList: '&id',
            viewingHistory: '++id, episodeId, watchedAt',
            cachedItems: '&id',
            episodeLinks: '&id',
            showIntroDurations: '&id',
        });

        this.version(2).stores({
            preferences: '&key',
        });

        this.version(3).stores({
            revisions: '++id, timestamp',
        });

        this.version(4)
            .stores({
                episodeLinks: '++id, episodeId',
            })
            .upgrade((tx) => {
                tx.table('episodeLinks').clear();
            });

        this.version(5).stores({
            showIntroDurations: '&id',
            episodeProgress: 'episodeId',
            preferredSources: '&showId',
            selectedSeasons: '[showId+seasonNumber]',
            showFilterPreferences: '&showId',
        });

        this.version(6).stores({
            knownSlaves: '&id, shortCode',
        });

        this.version(7)
            .stores({
                mediaLinks: '++id, mediaId',
                episodeLinks: null,
            })
            .upgrade(async (tx) => {
                const episodeLinks = await tx.table('episodeLinks').toArray();
                if (episodeLinks.length > 0) {
                    const mediaLinksToMigrate = episodeLinks.map((link) => ({
                        mediaId: link.episodeId,
                        url: link.url,
                        label: link.label || new URL(link.url).hostname,
                    }));
                    await tx.table('mediaLinks').bulkAdd(mediaLinksToMigrate);
                }
            });

        this.version(8)
            .stores({
                myList: '&id, order',
            })
            .upgrade(async (tx) => {
                const oldMyList = await tx.table('myList').toArray();
                if (oldMyList.length > 0 && typeof oldMyList[0].order === 'undefined') {
                    const newMyList = oldMyList.map((item, index) => ({
                        id: item.id,
                        order: index,
                    }));
                    await tx.table('myList').clear();
                    await tx.table('myList').bulkAdd(newMyList);
                }
            });

        this.version(9).stores({
            selectedSeasons: '&showId',
        });

        this.version(10).stores({
            showFilterPreferences: '&showId',
        });

        this.version(11).stores({
            knownSlaves: '&id, lastSeen',
        });

        this.version(12).stores({
            episodeProgress: '&episodeId, lastWatchedAt',
        });

        this.version(13).stores({
            mediaLinks: '++id, mediaId, isValid',
        });
    }

    /**
     * Handles database changes and syncs to MobX stores
     * @param {DbChange[]} changes
     */
    handleDbChanges(changes) {
        for (const change of changes) {
            if (change.type === 1) {
                // CREATE
                console.log(`[DB] Created: ${change.table}`, change.obj);
            } else if (change.type === 2) {
                // UPDATE
                console.log(`[DB] Updated: ${change.table}`, change.obj);
            } else if (change.type === 3) {
                // DELETE
                console.log(`[DB] Deleted: ${change.table}`, change.key);
            }
        }
    }

    /**
     * Import data from a backup data object
     * @param {Object} data - Object containing myList, cachedItems, mediaLinks, and episodeProgress
     */
    async importData(data) {
        if (!data) {
            throw new Error('Invalid import data format: data is null or undefined');
        }

        const now = Date.now();

        await this.transaction('rw', [this.myList, this.cachedItems, this.mediaLinks, this.episodeProgress], async () => {
            // Handle myList table - clear and import
            if (data.myList && Array.isArray(data.myList)) {
                await this.myList.clear();
                if (data.myList.length > 0) {
                    await this.myList.bulkPut(data.myList);
                }
            }

            // Handle cachedItems (shows) - clear and import
            if (data.cachedItems && Array.isArray(data.cachedItems)) {
                await this.cachedItems.clear();
                for (const show of data.cachedItems) {
                    await this.cachedItems.put(show);

                    // Handle links for this show if present
                    if (show.links && Array.isArray(show.links)) {
                        for (const link of show.links) {
                            await this.mediaLinks.put({
                                ...link,
                                mediaId: show.id,
                            });
                        }
                    }
                }
            }

            // Handle mediaLinks table - clear and import (if passed directly)
            if (data.mediaLinks && Array.isArray(data.mediaLinks)) {
                await this.mediaLinks.clear();
                for (const link of data.mediaLinks) {
                    await this.mediaLinks.put(link);
                }
            }

            // Handle episodeProgress table - clear and import
            if (data.episodeProgress && Array.isArray(data.episodeProgress)) {
                await this.episodeProgress.clear();
                for (const progress of data.episodeProgress) {
                    await this.episodeProgress.put(progress);
                }
            }
        });

        const showsCount = data.cachedItems?.length || 0;
        const myListCount = data.myList?.length || 0;
        const linksCount = data.mediaLinks?.length || 0;
        const progressCount = data.episodeProgress?.length || 0;

        console.log(
            `[DB] Import completed: ${showsCount} shows, ${myListCount} myList items, ${linksCount} links, ${progressCount} progress items`
        );
    }
}

export const db = new QuixDB();
