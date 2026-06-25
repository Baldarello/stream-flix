/**
 * SearchStore
 *
 * Owns the search query, the debounced results, and the active
 * flag. Side-effect: the debounce timer is held in a private
 * non-observable field so MobX does not try to track it.
 */
import {makeAutoObservable, runInAction} from 'mobx';
import {searchShow} from '../services/apiCall';

class SearchStore {
    query = '';
    results = [];
    isActive = false;
    isSearching = false;
    /** @type {number | null} Non-observable debounce handle. */
    _debounceTimer = null;

    constructor() {
        makeAutoObservable(this, { _debounceTimer: false });
    }

    toggle(isActive) {
        this.isActive = isActive;
        if (!isActive) {
            this.query = '';
            this.results = [];
        }
    }

    setQuery(query) {
        this.query = query;
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = window.setTimeout(async () => {
            if (this.query.trim()) {
                runInAction(() => {
                    this.isSearching = true;
                });
                const results = await searchShow(this.query);
                runInAction(() => {
                    this.results = results;
                    this.isSearching = false;
                });
            } else {
                runInAction(() => {
                    this.results = [];
                });
            }
        }, 300);
    }
}

export const searchStore = new SearchStore();
