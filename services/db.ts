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

// Add an optional 'id' for Dexie's auto-incrementing primary key
export type StorableViewingHistoryItem = ViewingHistoryItem & { id?: number };

export class QuixDB extends Dexie {
  myList!: Table<MyListItem, number>;
  viewingHistory!: Table<StorableViewingHistoryItem, number>;
  cachedItems!: Table<MediaItem, number>;
  episodeLinks!: Table<EpisodeLink, number>;
  showIntroDurations!: Table<ShowIntroDuration, number>;

  constructor() {
    super('quixDB');
    // FIX: Moved schema definition into the constructor, which is the standard
    // and recommended way to declare schemas when subclassing Dexie. This
    // resolves the TypeScript error where `.version` was not found on the instance.
    this.version(1).stores({
      myList: '&id', // Primary key is the media item ID
      // Auto-incrementing primary key 'id', and index on 'episodeId' and 'watchedAt'
      viewingHistory: '++id, episodeId, watchedAt', 
      cachedItems: '&id', // Primary key is the media item ID
      episodeLinks: '&id', // Primary key is episode ID
      showIntroDurations: '&id', // Primary key is show ID
    });
  }
}

export const db = new QuixDB();
