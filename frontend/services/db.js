import 'dexie-observable/api';
import Dexie from 'dexie';
import dexieObservable from 'dexie-observable';

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
        super('quixDB', {addons: [dexieObservable]});

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

        // LiveQuery subscription
        this.on('liveQuery', (event, subscriber) => {
            const subscriberFunc = (changes) => {
                // Handle Dexie v4/v5 change format
                const processedChanges = changes.map ? changes : [];
                if (processedChanges.length > 0) {
                    this.handleDbChanges(processedChanges);
                }
            };
            subscriber(subscriberFunc);
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
