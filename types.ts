export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string; // URL to an image
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