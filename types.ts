export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string; // URL to an image
  video_url?: string;
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

export type PlayableItem = MediaItem | (Episode & {
    show_id: number;
    show_title: string;
    backdrop_path: string;
    season_number: number;
});

export interface ViewingHistoryItem {
  showId: number;
  episodeId: number;
  watchedAt: number; // timestamp
}