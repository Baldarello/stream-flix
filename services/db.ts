import Dexie, { type Table } from 'dexie';
import type { ViewingHistoryItem, MediaItem } from '../types';

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

export class QuixDB extends Dexie {
  myList!: Table<MyListItem, number>;
  viewingHistory!: Table<StorableViewingHistoryItem, number>;
  cachedItems!: Table<MediaItem, number>;
  episodeLinks!: Table<EpisodeLink, number>;
  showIntroDurations!: Table<ShowIntroDuration, number>;
  preferences!: Table<Preference, string>;

  constructor() {
    super('quixDB');
    
    // FIX: Cast 'this' to Dexie to resolve TypeScript error where the 'version' method is not found on the extended class type.
    (this as Dexie).version(1).stores({
      myList: '&id',
      viewingHistory: '++id, episodeId, watchedAt', 
      cachedItems: '&id',
      episodeLinks: '&id',
      showIntroDurations: '&id',
    });
    
    // FIX: Cast 'this' to Dexie to resolve TypeScript error where the 'version' method is not found on the extended class type.
    (this as Dexie).version(2).stores({
      myList: '&id',
      viewingHistory: '++id, episodeId, watchedAt', 
      cachedItems: '&id',
      episodeLinks: '&id',
      showIntroDurations: '&id',
      preferences: '&key', // New table for user preferences
    });
  }
}

export const db = new QuixDB();
