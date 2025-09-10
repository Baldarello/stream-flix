import axios from 'axios';
import type { MediaItem, Season, Episode } from '../types';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
// Assuming this is available in the execution environment.
const API_KEY =  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQxNzBlYTMxLTk0MGItNGRhZS05MWRjLWYxODZkY2FhMzUzZiIsInByb2R1Y3RJZCI6IjhhYzRkZmRhLWUwM2EtNGYzMC05MTA2LTViYTJjYjA0ZDEzZiIsInNlcnZpY2VJZCI6MywicHJvamVjdFNlZWRJZCI6IjQxNzBlYTMxLTk0MGItNGRhZS05MWRjLWYxODZkY2FhMzUzZiIsImlhdCI6MTcyMjI0NjQyNX0.Mo403gt40NyS3F1ynsEj0CVWkk46YIijJSuZO3NFb3g";
const API_BASE_URL = 'https://production-api.tnl.one/';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const BASE_PATH="service/tmdb/"

// FIX: Hardcoded API key removed. The API key should be provided via environment variables.
// const API_KEY_TMDB =



const apiClient = axios.create({
  baseURL: API_BASE_URL,
});




// 2. Log della richiesta nell api
apiClient.interceptors.request.use(async request => {


    request.headers["Access-Control-Allow-Origin"] = "*";
    request.headers["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
    request.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,PATCH,OPTIONS";
    if ((request.headers["Authorization"] === undefined || request.headers["Authorization"] === null || request.headers["Authorization"] === "")) {
        // FIX: Use API_KEY from environment variables instead of a hardcoded key.
        request.headers["Authorization"] = API_KEY;
    }

    return request;
});



const buildImageURL = (path: string | null, size: string = 'original'): string => {
  return path ? `${IMAGE_BASE_URL}${size}${path}` : '';
};

const tmdbToMediaItem = (item: any): MediaItem => ({
  id: item.id,
  title: item.title || item.name,
  name: item.name,
  overview: item.overview,
  poster_path: buildImageURL(item.poster_path, 'w500'),
  backdrop_path: buildImageURL(item.backdrop_path),
  vote_average: item.vote_average,
  release_date: item.release_date,
  first_air_date: item.first_air_date,
  media_type: item.media_type || (item.title ? 'movie' : 'tv'),
});


/**
 * Fetches trending movies and TV shows for the week.
 */
export const getTrending = async (): Promise<MediaItem[]> => {
  const response = await apiClient.get(`${BASE_PATH}3/trending/all/week`);
  return response.data.results.map(tmdbToMediaItem);
};


/**
 * Fetches movies that are currently playing in theaters.
 */
export const getLatestMovies = async (): Promise<MediaItem[]> => {
    const response = await apiClient.get(`${BASE_PATH}3/movie/now_playing`);
    return response.data.results.map(tmdbToMediaItem);
}

/**
 * Fetches the top-rated TV series.
 */
export const getTopRatedSeries = async (): Promise<MediaItem[]> => {
    const response = await apiClient.get(`${BASE_PATH}3/tv/top_rated`);
    return response.data.results.map(tmdbToMediaItem);
}

/**
 * Fetches popular anime series.
 */
export const getPopularAnime = async (): Promise<MediaItem[]> => {
    const response = await apiClient.get(`${BASE_PATH}3/discover/tv`, { params: { with_genres: 16, sort_by: 'popularity.desc' } });
    return response.data.results.map(tmdbToMediaItem);
}


/**
 * Fetches detailed information for a specific TV series.
 */
export const getSeriesDetails = async (seriesId: number): Promise<MediaItem> => {
  const response = await apiClient.get(`${BASE_PATH}3/tv/${seriesId}`);
  const seriesData = response.data;

  const details: MediaItem = {
      ...tmdbToMediaItem(seriesData),
      seasons: seriesData.seasons?.map((season: any): Season => ({
          id: season.id,
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episode_count,
          episodes: [], // Episodes for each season must be fetched separately
      })) || [],
  };
  return details;
};

/**
 * Fetches all episodes for a specific season of a TV series.
 */
export const getSeriesEpisodes = async (seriesId: number, seasonNumber: number): Promise<Episode[]> => {
  const response = await apiClient.get(`${BASE_PATH}3/tv/${seriesId}/season/${seasonNumber}`);
  return response.data.episodes.map((ep: any): Episode => {
    // Mocking intro times for demonstration purposes of the "Skip Intro" feature
    const hasIntro = ep.episode_number > 1; // Assume pilot doesn't have a skippable intro
    return {
      id: ep.id,
      episode_number: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      still_path: buildImageURL(ep.still_path, 'w300'),
      intro_start_s: hasIntro ? 15 : undefined,
    };
  });
};

/**
 * Fetches images for a TV series.
 */
export const getSeriesImages = async (seriesId: number): Promise<{ backdrops: string[], posters: string[] }> => {
  const response = await apiClient.get(`${BASE_PATH}3/tv/${seriesId}/images`);
  const backdrops = response.data.backdrops.map((img: any) => buildImageURL(img.file_path));
  const posters = response.data.posters.map((img: any) => buildImageURL(img.file_path));
  return { backdrops, posters };
};

/**
 * Searches for a TV show by a query string.
 */
export const searchShow = async (query: string): Promise<MediaItem[]> => {
  const response = await apiClient.get(`${BASE_PATH}3/search/tv`, { params: { query } });
  return response.data.results.map(tmdbToMediaItem);
};
