export interface EpisodeLink {
    id?: number; // Auto-incrementing primary key from Dexie
    episodeId: number;
    url: string;
    label: string;
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string; // URL to an image
  video_url?: string; // The first available URL for convenience
  video_urls?: EpisodeLink[]; // Array of all available links
  intro_start_s?: number; // Start time of intro in seconds
  intro_end_s?: number;   // End time of intro in seconds
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: number;
  title: string; // For movies
  name?: string; // For TV series/anime
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string; // For movies
  first_air_date?: string; // For TV series
  media_type: 'movie' | 'tv';
  seasons?: Season[];
}

export type PlayableItem = (MediaItem | (Episode & {
    show_id: number;
    show_title: string;
    backdrop_path: string;
    season_number: number;
})) & { startTime?: number };

export interface ViewingHistoryItem {
  showId: number;
  episodeId: number;
  watchedAt: number; // timestamp
}

export interface EpisodeProgress {
  episodeId: number; // Primary key
  currentTime: number;
  duration: number;
  watched: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  image?: string; // base64 encoded image
  timestamp: number;
}

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
    accessToken: string;
}

// Types for Library Sharing
export interface SharedEpisodeLink {
  seasonNumber: number;
  episodeNumber: number;
  url: string;
  label: string;
}

export interface SharedShowData {
  tmdbId: number;
  links: SharedEpisodeLink[];
}

export interface SharedLibraryData {
  version: 1;
  shows: SharedShowData[];
}

// Interface for database revision tracking
export interface Revision {
    id?: number; // Auto-incremented primary key
    timestamp: number;
    table: string;
    key: any;
    type: 1 | 2 | 3; // 1:create, 2:update, 3:delete
    obj?: any;
    oldObj?: any;
    // Client-side properties for UI display
    description?: string;
    icon?: 'add' | 'update' | 'delete' | 'unknown';
}

export interface PreferredSource {
  showId: number; // Primary key
  origin: string; // e.g., "https://srv18-acqua.sweetpixel.org"
}
