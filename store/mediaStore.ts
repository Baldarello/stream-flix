import { makeAutoObservable, runInAction } from 'mobx';
import type { MediaItem } from '../types';
import { getTrending, getLatestMovies, getTopRatedSeries, getPopularAnime } from '../services/tmdbService';

class MediaStore {
  trending: MediaItem[] = [];
  latestMovies: MediaItem[] = [];
  topSeries: MediaItem[] = [];
  popularAnime: MediaItem[] = [];
  loading = true;
  error: string | null = null;
  selectedItem: MediaItem | null = null;
  myList: number[] = [];

  constructor() {
    makeAutoObservable(this);
    this.loadMyListFromStorage();
  }

  loadMyListFromStorage() {
    const storedList = localStorage.getItem('myList');
    if (storedList) {
      this.myList = JSON.parse(storedList);
    }
  }

  saveMyListToStorage() {
    localStorage.setItem('myList', JSON.stringify(this.myList));
  }
  
  toggleMyList = (item: MediaItem) => {
    const itemId = item.id;
    if (this.myList.includes(itemId)) {
      this.myList = this.myList.filter(id => id !== itemId);
    } else {
      this.myList.push(itemId);
    }
    this.saveMyListToStorage();
  }

  selectMedia = (item: MediaItem) => {
    this.selectedItem = item;
    window.scrollTo(0, 0);
  }

  closeDetail = () => {
    this.selectedItem = null;
  }
  
  get heroContent(): MediaItem | undefined {
    return this.trending[0];
  }

  get allItems(): MediaItem[] {
     const all = [...this.trending, ...this.latestMovies, ...this.topSeries, ...this.popularAnime];
     return Array.from(new Map(all.map(item => [item.id, item])).values());
  }

  get myListItems(): MediaItem[] {
    return this.allItems.filter(item => this.myList.includes(item.id));
  }

  fetchAllData = async () => {
    this.loading = true;
    this.error = null;
    try {
      const [
        trendingData,
        latestMoviesData,
        topSeriesData,
        popularAnimeData,
      ] = await Promise.all([
        getTrending(),
        getLatestMovies(),
        getTopRatedSeries(),
        getPopularAnime(),
      ]);
      
      runInAction(() => {
        this.trending = trendingData;
        this.latestMovies = latestMoviesData;
        this.topSeries = topSeriesData;
        this.popularAnime = popularAnimeData;
      });

    } catch (err) {
       runInAction(() => {
         this.error = 'Failed to fetch data. Please try again later.';
         console.error(err);
       });
    } finally {
       runInAction(() => {
         this.loading = false;
       });
    }
  }
}

export const mediaStore = new MediaStore();
