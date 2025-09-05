import type { MediaItem, Season, Episode } from '../types';

const generateMockEpisodes = (seasonNumber: number, count: number): Episode[] => {
  const episodes: Episode[] = [];
  for (let i = 1; i <= count; i++) {
    episodes.push({
      id: Date.now() + seasonNumber * 100 + i,
      episode_number: i,
      name: `Episodio ${i}`,
      overview: `Questo è il riassunto della Stagione ${seasonNumber}, Episodio ${i}. Qui accadono cose emozionanti.`,
      still_path: `https://picsum.photos/id/${500 + seasonNumber * 10 + i}/300/170`,
    });
  }
  return episodes;
};

const generateMockSeasons = (count: number): Season[] => {
  const seasons: Season[] = [];
  for (let i = 1; i <= count; i++) {
    const episodeCount = Math.floor(Math.random() * 8) + 8; // 8-15 episodes
    seasons.push({
      id: Date.now() + i,
      season_number: i,
      name: `Stagione ${i}`,
      episode_count: episodeCount,
      episodes: generateMockEpisodes(i, episodeCount),
    });
  }
  return seasons;
};

// Using picsum.photos for random placeholder images.
const generateMockData = (count: number, type: 'movie' | 'tv'): MediaItem[] => {
  const data: MediaItem[] = [];
  for (let i = 1; i <= count; i++) {
    const id = Date.now() + i;
    const isTv = type === 'tv';
    const item: MediaItem = {
      id: id,
      title: !isTv ? `Awesome Movie ${i}` : `Amazing Series ${i}`,
      name: isTv ? `Amazing Series ${i}` : undefined,
      overview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      poster_path: `https://picsum.photos/id/${100 + i}/500/750`,
      backdrop_path: `https://picsum.photos/id/${200 + i}/1280/720`,
      vote_average: parseFloat((Math.random() * (9.8 - 7.0) + 7.0).toFixed(1)),
      release_date: !isTv ? '2024-07-20' : undefined,
      first_air_date: isTv ? '2024-07-20' : undefined,
      media_type: type,
      seasons: isTv ? generateMockSeasons(Math.floor(Math.random() * 3) + 2) : undefined, // 2-4 seasons for TV shows
    };
    data.push(item);
  }
  return data;
};


const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getTrending = async (): Promise<MediaItem[]> => {
  await mockDelay(500);
  return generateMockData(20, 'movie');
};

export const getLatestMovies = async (): Promise<MediaItem[]> => {
  await mockDelay(500);
  return generateMockData(20, 'movie').reverse();
};

export const getTopRatedSeries = async (): Promise<MediaItem[]> => {
  await mockDelay(500);
  return generateMockData(20, 'tv');
};

export const getPopularAnime = async (): Promise<MediaItem[]> => {
  await mockDelay(500);
  const animeData = generateMockData(20, 'tv');
  animeData.forEach((item, index) => {
    item.title = `Popular Anime ${index + 1}`;
    item.name = `Popular Anime ${index + 1}`;
    item.poster_path = `https://picsum.photos/id/${300 + index}/500/750`;
    item.backdrop_path = `https://picsum.photos/id/${400 + index}/1280/720`;
  });
  return animeData;
};