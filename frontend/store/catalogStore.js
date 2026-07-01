/**
 * CatalogStore
 *
 * Holds the home-page content: trending, latest movies, top series
 * and popular anime. Pure data: no UI, no I/O orchestration, no
 * per-item state.
 *
 * Cross-store dependencies:
 *   - `libraryStore` (read): contributes `myListItems` and
 *     `continueWatchingItems` to the home-page rows.
 */
import { makeAutoObservable, runInAction } from 'mobx';
import { getLatestMovies, getPopularAnime, getTopRatedSeries, getTrending } from '../services/apiCall';
import { db } from '../services/db';
import { libraryStore } from './libraryStore.js';

class CatalogStore {
    trending = [];
    latestMovies = [];
    topSeries = [];
    popularAnime = [];
    loading = true;
    error = null;

    constructor() {
        makeAutoObservable(this, {
            /* no overrides */
        });
    }

    get heroContent() {
        // Priority 1: first item from the user's personal list.
        if (libraryStore.myListItems.length > 0) {
            return libraryStore.myListItems[0];
        }
        // Priority 2: top series, then trending.
        return this.topSeries.length > 0 ? this.topSeries[0] : this.trending[0];
    }

    get allMovies() {
        return [...this.latestMovies].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    }

    get homePageRows() {
        const rows = [];
        if (libraryStore.continueWatchingItems.length > 0) {
            rows.push({ titleKey: 'misc.continueWatching', items: libraryStore.continueWatchingItems });
        }
        if (libraryStore.myListItems.length > 0) {
            rows.push({ titleKey: 'misc.myList', items: libraryStore.myListItems });
        }
        rows.push({ titleKey: 'misc.popularSeries', items: this.topSeries });
        rows.push({ titleKey: 'misc.topRated', items: this.trending });
        rows.push({ titleKey: 'misc.latestReleases', items: this.latestMovies });
        rows.push({ titleKey: 'misc.mustWatchAnime', items: this.popularAnime });
        return rows;
    }

    async fetchAllData() {
        this.loading = true;
        try {
            const [trending, latestMovies, topSeries, popularAnime] = await Promise.all([
                getTrending(),
                getLatestMovies(),
                getTopRatedSeries(),
                getPopularAnime(),
            ]);
            runInAction(() => {
                this.trending = trending;
                this.latestMovies = latestMovies;
                this.topSeries = topSeries;
                this.popularAnime = popularAnime;
                [...trending, ...latestMovies, ...topSeries, ...popularAnime].forEach((item) => {
                    if (!libraryStore.cachedItems.has(item.id)) {
                        libraryStore.cachedItems.set(item.id, item);
                        db.cachedItems.put(item).catch(console.error);
                    }
                });
                this.loading = false;
            });
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            runInAction(() => {
                this.error = 'Failed to load content.';
                this.loading = false;
            });
        }
    }
}

export const catalogStore = new CatalogStore();
