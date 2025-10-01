import 'dexie-observable/api';
// FIX: Import the 'DbEvents' type from dexie to correctly type the event handling.
import Dexie, { type Table, type DbEvents } from 'dexie';
import type { ViewingHistoryItem, MediaItem, MediaLink, EpisodeProgress, PreferredSource, ShowFilterPreference } from '../types';
import dexieObservable from 'dexie-observable';

// Define the structure of the data we're storing
export interface MyListItem {
  id: number;
  order?: number; // Order is now optional for backward compatibility during migration
}
export interface ShowIntroDuration {
    id: number; // show id
    duration: number;
}
export interface Preference {
    key: string;
    value: any;
}
export interface SelectedSeason {
  showId: number;
  seasonNumber: number;
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

// FIX: Define a local interface for database changes from dexie-observable
// to provide strong typing for the 'changes' event.
interface DbChange {
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
  mediaLinks!: Table<MediaLink, number>;
  showIntroDurations!: Table<ShowIntroDuration, number>;
  preferences!: Table<Preference, string>;
  revisions!: Table<Revision, number>; // NEW TABLE
  episodeProgress!: Table<EpisodeProgress, number>;
  preferredSources!: Table<PreferredSource, number>;
  selectedSeasons!: Table<SelectedSeason, number>;
  showFilterPreferences!: Table<ShowFilterPreference, number>;


  constructor() {
    super('quixDB', { addons: [dexieObservable] }); // Register addon
    
    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(1).stores({
      myList: '&id',
      viewingHistory: '++id, episodeId, watchedAt', 
      cachedItems: '&id',
      episodeLinks: '&id', // This was the old primary key schema
      showIntroDurations: '&id',
    });
    
    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(2).stores({
      preferences: '&key', // New table for user preferences
    });

    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(3).stores({
      revisions: '++id, timestamp',
    });

    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(4).stores({
      episodeLinks: '++id, episodeId', // New schema with auto-incrementing PK and index on episodeId
    }).upgrade(tx => {
      // Since we are changing the schema in a breaking way (from string URL to object),
      // it's safest to just clear the old table.
      // The user will have to re-link their episodes.
      return tx.table('episodeLinks').clear();
    });

    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(5).stores({
        episodeProgress: '&episodeId'
    });

    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(6).stores({
        preferredSources: '&showId'
    });
    
    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    (this as Dexie).version(7).stores({
        mediaLinks: '++id, mediaId',
        episodeLinks: null, // Remove old table
    }).upgrade(async tx => {
        // Migrate data from episodeLinks to mediaLinks
        const episodeLinks = await tx.table('episodeLinks').toArray();
        if (episodeLinks.length > 0) {
            const mediaLinksToMigrate = episodeLinks.map(link => ({
                // id is auto-incrementing now, so we don't set it
                mediaId: link.episodeId,
                url: link.url,
                label: link.label || new URL(link.url).hostname,
            }));
            await tx.table('mediaLinks').bulkAdd(mediaLinksToMigrate);
        }
    });

    (this as Dexie).version(8).stores({
        myList: '&id, order', // Add order index
    }).upgrade(async tx => {
        // This upgrade ensures existing items in 'myList' get an order property.
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

    (this as Dexie).version(9).stores({
        selectedSeasons: '&showId'
    });

    (this as Dexie).version(10).stores({
        showFilterPreferences: '&showId'
    });
  }
  
  async importData(data: any) {
    const expectedTables = ['myList', 'viewingHistory', 'cachedItems', 'mediaLinks', 'showIntroDurations', 'preferences', 'revisions', 'episodeProgress', 'preferredSources', 'selectedSeasons', 'showFilterPreferences'];
    const tablesInData = data ? Object.keys(data) : [];
    
    if (!tablesInData.length || !tablesInData.some(table => expectedTables.includes(table))) {
      throw new Error("Backup file is missing required data tables or is empty.");
    }
    
    // FIX: Cast to Dexie to resolve type error where extended class methods are not found.
    await (this as Dexie).transaction('rw', (this as Dexie).tables, async () => {
        // Clear all existing data
        for (const table of expectedTables) {
            // Dexie's Table types are not easily indexable by string, so we cast to any.
            if ((this as any)[table] && data[table]) {
              await (this as any)[table].clear();
            }
        }

        // Import new data
        for (const tableName of expectedTables) {
            const tableData = data[tableName];
            if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                if ((this as any)[tableName]) {
                  await (this as any)[tableName].bulkAdd(tableData);
                }
            }
        }
    });
  }
}

// FIX: Removed the problematic interface augmentation for QuixDB.
// It caused a type conflict with the base Dexie class's 'on' property.
// The correct way to handle the 'changes' event from dexie-observable is to cast
// the 'on' property on the instance, as shown below.

export const db = new QuixDB();

// Listen for database changes to log revisions and trigger automatic backups
// FIX: Cast `db` to `Dexie` before accessing the 'on' property to resolve type error.
// This resolves the type error without conflicting with the base class definition.
// FIX: Use the imported 'DbEvents' type for the cast instead of 'Dexie.Events', which refers to a value (the static class property) and not a type.
((db as Dexie).on as DbEvents & { (event: 'changes', subscriber: (changes: DbChange[]) => void): void; })('changes', (changes: DbChange[]) => {
    // Filter out changes we don't want to track or that would cause loops
    const relevantChanges = changes.filter(change => 
        change.table !== 'revisions' && 
        change.table !== 'preferences' // Don't trigger a backup when just updating the sync timestamp
    );

    if (relevantChanges.length > 0) {
        const revisionsToLog: Revision[] = relevantChanges
            .filter(change => change.table !== 'episodeProgress' && change.table !== 'preferredSources' && change.table !== 'selectedSeasons')
            .map(change => ({
                timestamp: Date.now(),
                table: change.table,
                key: change.key,
                type: change.type as 1 | 2 | 3,
                obj: 'obj' in change ? change.obj : undefined,
                oldObj: 'oldObj' in change ? change.oldObj : undefined,
            }));
        
        if (revisionsToLog.length > 0) {
            db.revisions.bulkAdd(revisionsToLog).catch(err => {
                console.error('Failed to log database revisions:', err);
            });
        }
        
        // Trigger a debounced backup to avoid excessive writes on rapid changes
        // Using a dynamic import() here to break a potential module dependency cycle (db -> mediaStore -> db)
        import('../store/mediaStore').then(({ mediaStore }) => {
            mediaStore.triggerDebouncedBackup();
        });
    }
});