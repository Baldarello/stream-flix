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

        this.version(4).stores({
            episodeLinks: '++id, episodeId',
        }).upgrade(tx => {
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

        this.version(7).stores({
            mediaLinks: '++id, mediaId',
            episodeLinks: null,
        }).upgrade(async (tx) => {
            const episodeLinks = await tx.table('episodeLinks').toArray();
            if (episodeLinks.length > 0) {
                const mediaLinksToMigrate = episodeLinks.map(link => ({
                    mediaId: link.episodeId,
                    url: link.url,
                    label: link.label || new URL(link.url).hostname,
                }));
                await tx.table('mediaLinks').bulkAdd(mediaLinksToMigrate);
            }
        });

        this.version(8).stores({
            myList: '&id, order',
        }).upgrade(async (tx) => {
            const oldMyList = await tx.table('myList').toArray();
            if (oldMyList.length > 0 && typeof oldMyList[0].order === 'undefined') {
                const newMyList = oldMyList.map((item, index) => ({
                    id: item.id,
                    order: index
                }));
                await tx.table('myList').clear();
                await tx.table('myList').bulkAdd(newMyList);
            }
        });

        this.version(9).stores({
            selectedSeasons: '&showId'
        });

        this.version(10).stores({
            showFilterPreferences: '&showId'
        });

        this.version(11).stores({
            knownSlaves: '&id, lastSeen'
        });

        this.version(12).stores({
            episodeProgress: '&episodeId, lastWatchedAt'
        });

        this.version(13).stores({
            mediaLinks: '++id, mediaId, isValid'
        });


    }

    /**
     * Handles database changes and syncs to MobX stores
     * @param {DbChange[]} changes
     */
    handleDbChanges(changes) {
        for (const change of changes) {
            if (change.type === 1) { // CREATE
                console.log(`[DB] Created: ${change.table}`, change.obj);
            } else if (change.type === 2) { // UPDATE
                console.log(`[DB] Updated: ${change.table}`, change.obj);
            } else if (change.type === 3) { // DELETE
                console.log(`[DB] Deleted: ${change.table}`, change.key);
            }
        }
    }

    /**
     * Import data from a SharedLibraryData object
     * @param {Object} data
     */
    async importData(data) {
        if (!data || !data.shows || !Array.isArray(data.shows)) {
            throw new Error('Invalid import data format');
        }

        const shows = data.shows;
        const now = Date.now();

        await this.transaction('rw', this.cachedItems, this.mediaLinks, async () => {
            for (const show of shows) {
                // First, save the show (assuming shows have an 'id' property from TMDB)
                // Note: In a real implementation, you might need to fetch show details first
                const showData = show;
                await this.cachedItems.put(showData);

                // Then save all the links for this show
                if (showData.links && showData.links.length > 0) {
                    const linksToAdd = showData.links.map(link => ({
                        ...link,
                        mediaId: showData.tmdbId,
                    }));
                    await this.mediaLinks.bulkPut(linksToAdd);
                }
            }
        });

        console.log(`[DB] Import completed: ${shows.length} shows processed`);
    }
}

export const db = new QuixDB();
