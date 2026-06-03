/**
 * Smoke tests for the new store architecture. The goal is just to
 * verify that the new sub-stores can be imported and that the
 * `mediaStore` facade exposes the same public surface that the
 * rest of the app relies on.
 *
 * Heavy logic tests would mock Dexie/MobX, which is overkill for
 * this initial pass – the goal is to catch import errors and
 * regressions in the public surface.
 */
import { describe, it, expect } from 'vitest';

import { mediaStore } from '../../store/mediaStore.js';
import { catalogStore } from '../../store/catalogStore.js';
import { searchStore } from '../../store/searchStore.js';
import { libraryStore } from '../../store/libraryStore.js';
import { preferencesStore } from '../../store/preferencesStore.js';
import { uiStore } from '../../store/uiStore.js';
import { playbackStore } from '../../store/playbackStore.js';

describe('store architecture', () => {
    it('exposes the five thematic sub-stores as singletons', () => {
        expect(catalogStore).toBeDefined();
        expect(searchStore).toBeDefined();
        expect(libraryStore).toBeDefined();
        expect(preferencesStore).toBeDefined();
        expect(uiStore).toBeDefined();
        expect(playbackStore).toBeDefined();
    });

    it('mediaStore facade re-exposes the most-used sub-store fields', () => {
        // Catalog
        expect(mediaStore.trending).toBe(catalogStore.trending);
        expect(mediaStore.latestMovies).toBe(catalogStore.latestMovies);
        expect(mediaStore.topSeries).toBe(catalogStore.topSeries);
        // Library
        expect(mediaStore.myList).toBe(libraryStore.myList);
        expect(mediaStore.mediaLinks).toBe(libraryStore.mediaLinks);
        // UI
        expect(mediaStore.snackbarMessage).toBe(uiStore.snackbarMessage);
        expect(mediaStore.notifications).toBe(uiStore.notifications);
        // Playback
        expect(mediaStore.nowPlayingItem).toBe(playbackStore.nowPlayingItem);
    });

    it('mediaStore facade exposes the language change event source', () => {
        expect(mediaStore.events).toBeDefined();
        expect(typeof mediaStore.events.addEventListener).toBe('function');
        expect(typeof mediaStore.events.dispatchEvent).toBe('function');
    });

    it('uiStore showSnackbar/hideSnackbar round-trip', () => {
        uiStore.showSnackbar('hello', 'info', false);
        expect(uiStore.snackbarMessage).toEqual({ message: 'hello', severity: 'info', isTranslationKey: false, translationValues: undefined });
        uiStore.hideSnackbar();
        expect(uiStore.snackbarMessage).toBeNull();
    });
});
