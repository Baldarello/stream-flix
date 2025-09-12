import 'dexie-observable/api';
import Dexie, { type Table } from 'dexie';
import type { ViewingHistoryItem, MediaItem } from '../types';
import dexieObservable from 'dexie-observable';
// FIX: Importing 'dexie-observable/api' is required for TypeScript to correctly
// augment the Dexie class with the addon's methods like on(). This resolves
// all reported type errors related to version() and on().

// Define the structure of the data we're storing
export interface MyListItem {
  id: number;
}
export interface EpisodeLink {
    id: number; // episode id
    url: string;
}
export interface ShowIntroDuration {
    id: number; // show id
    duration: number;
}
export interface Preference {
    key: string;
    value: any;
}

// Add an optional 'id' for Dexie's auto-incrementing primary key
export type StorableViewingHistoryItem = ViewingHistoryItem & { id?: number };

// NEW: Interface for revision tracking
// We'll augment the IDatabaseChange with a timestamp for our own tracking.
export interface Revision {
    id?: number; // Auto-incremented primary key
    timestamp: number;
    table: string;
    key: any;
    type: 1 | 2 | 3; // 1:create, 2:update, 3:delete
    obj?: any;
    oldObj?: any;
}


export class QuixDB extends Dexie {
  myList!: Table<MyListItem, number>;
  viewingHistory!: Table<StorableViewingHistoryItem, number>;
  cachedItems!: Table<MediaItem, number>;
  episodeLinks!: Table<EpisodeLink, number>;
  showIntroDurations!: Table<ShowIntroDuration, number>;
  preferences!: Table<Preference, string>;
  revisions!: Table<Revision, number>; // NEW TABLE

  constructor() {
    super('quixDB', { addons: [dexieObservable] }); // Register addon
    
    this.version(1).stores({
      myList: '&id',
      viewingHistory: '++id, episodeId, watchedAt', 
      cachedItems: '&id',
      episodeLinks: '&id',
      showIntroDurations: '&id',
    });
    
    this.version(2).stores({
      preferences: '&key', // New table for user preferences
    });

    this.version(3).stores({
      revisions: '++id, timestamp',
    });
  }
  
  async importData(data: any) {
    const expectedTables = ['myList', 'viewingHistory', 'cachedItems', 'episodeLinks', 'showIntroDurations', 'preferences', 'revisions'];
    const tablesInData = data ? Object.keys(data) : [];
    
    if (!tablesInData.length || !expectedTables.every(table => tablesInData.includes(table))) {
      throw new Error("Backup file is missing required data tables or is empty.");
    }
    
    // FIX: The transaction method expects an array of tables when multiple tables are involved,
    // rather than listing them as separate arguments. This resolves the argument count error.
    await this.transaction('rw', [this.myList, this.viewingHistory, this.cachedItems, this.episodeLinks, this.showIntroDurations, this.preferences, this.revisions], async () => {
        // Clear all existing data
        for (const table of expectedTables) {
            // Dexie's Table types are not easily indexable by string, so we cast to any.
            await (this as any)[table].clear();
        }

        // Import new data
        for (const tableName of expectedTables) {
            const tableData = data[tableName];
            if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                await (this as any)[tableName].bulkAdd(tableData);
            }
        }
    });
  }
}

export const db = new QuixDB();

// NEW: Listen for database changes and log them as revisions
// FIX: Changed to use the documented `db.on('changes', ...)` syntax for `dexie-observable` to resolve the TypeScript error.
db.on('changes', (changes) => {
    const revisionsToLog: Revision[] = changes
        // Don't log changes to the revisions table itself to avoid an infinite loop
        .filter(change => change.table !== 'revisions')
        .map(change => ({
            timestamp: Date.now(),
            table: change.table,
            key: change.key,
            type: change.type as 1 | 2 | 3,
            // FIX: Conditionally access `obj` and `oldObj`. These properties exist on different types
            // within the IDatabaseChange union, and the `in` operator acts as a type guard.
            obj: 'obj' in change ? change.obj : undefined,
            oldObj: 'oldObj' in change ? change.oldObj : undefined,
        }));
    
    if (revisionsToLog.length > 0) {
        db.revisions.bulkAdd(revisionsToLog).catch(err => {
            console.error('Failed to log database revisions:', err);
        });
    }
});