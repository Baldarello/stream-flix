/**
 * PlaybackStore
 *
 * Owns the active playback session: what is playing, what show
 * the player is currently bound to, and the historical
 * "playbackOriginItem" used to restore the previous detail view
 * when the user closes the player.
 *
 * The actual video element lives inside VideoPlayer.jsx; this
 * store only tracks the data the rest of the UI needs to render
 * the hero, the continue-watching row, and the back navigation.
 */
import { makeAutoObservable, runInAction } from 'mobx';
import { libraryStore } from './libraryStore.js';

class PlaybackStore {
    isPlaying = false;
    nowPlayingItem = null;
    nowPlayingShowDetails = null;
    playbackOriginItem = null;
    selectedItem = null;
    isDetailLoading = false;

    constructor() {
        makeAutoObservable(this);
    }

    get currentShow() {
        return this.nowPlayingShowDetails;
    }

    get currentSeasonEpisodes() {
        if (!this.nowPlayingItem || !('season_number' in this.nowPlayingItem) || !this.nowPlayingShowDetails?.seasons) {
            return [];
        }
        const season = this.nowPlayingShowDetails.seasons.find((s) => s.season_number === this.nowPlayingItem.season_number);
        return season?.episodes || [];
    }

    get nextEpisode() {
        if (!this.nowPlayingItem || !('episode_number' in this.nowPlayingItem)) return null;
        const currentEpisodeIndex = this.currentSeasonEpisodes.findIndex((ep) => ep.id === this.nowPlayingItem.id);
        if (currentEpisodeIndex > -1 && currentEpisodeIndex < this.currentSeasonEpisodes.length - 1) {
            return this.currentSeasonEpisodes[currentEpisodeIndex + 1];
        }
        return null;
    }

    setNowPlaying(item, showDetails) {
        runInAction(() => {
            this.nowPlayingItem = item;
            this.nowPlayingShowDetails = showDetails ?? null;
            this.isPlaying = true;
        });
    }

    setSelectedItem(item) {
        this.selectedItem = item;
    }

    setDetailLoading(flag) {
        this.isDetailLoading = flag;
    }

    setPlaybackOriginItem(item) {
        this.playbackOriginItem = item;
    }

    _closeDetail() {
        this.selectedItem = null;
    }

    closeDetail() {
        this._closeDetail();
    }

    stopPlayback() {
        this.nowPlayingItem = null;
        this.nowPlayingShowDetails = null;
        this.isPlaying = false;
        if (this.playbackOriginItem) {
            this.selectedItem = this.playbackOriginItem;
            this.playbackOriginItem = null;
        }
    }

    findEpisodeInLibrary(episodeId) {
        return libraryStore.findEpisodeById(episodeId);
    }
}

export const playbackStore = new PlaybackStore();
