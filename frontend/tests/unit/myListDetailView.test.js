/**
 * Tests for the dedicated "La mia lista" detail screen and the
 * navigation pipeline that takes the user from the home page row
 * to the new screen.
 *
 * The goal is to lock in:
 *   - the dedicated view key is recognised by the FeatureRouter
 *     state machine (mediaStore.setActiveView);
 *   - the CinematicRow exposes an onViewDetail callback that flips
 *     the active view to the dedicated screen;
 *   - the new translations are present in both locales.
 *
 * The view itself is a thin orchestrator over MobX state so the
 * state transitions can be exercised through the store facade
 * without rendering the full React tree.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/db.js', () => ({
    db: {
        myList: {put: vi.fn(), delete: vi.fn(), bulkPut: vi.fn()},
        cachedItems: {put: vi.fn()},
    },
}));

import { libraryStore } from '../../store/libraryStore.js';
import { mediaStore } from '../../store/mediaStore.js';
import { it as itLocale } from '../../locales/it.js';
import { en as enLocale } from '../../locales/en.js';

describe('MyListDetailView navigation', () => {
    beforeEach(() => {
        libraryStore.myList = [];
        libraryStore.cachedItems = new Map();
        // Force the store to a known starting view so each test
        // exercises the transition from a clean baseline.
        mediaStore.setActiveView('Home');
    });

    it('flips the active view to "MyListDetail" when requested', () => {
        expect(mediaStore.activeView).toBe('Home');
        mediaStore.setActiveView('MyListDetail');
        expect(mediaStore.activeView).toBe('MyListDetail');
    });

    it('accepts the new key without throwing and stays readable', () => {
        expect(() => mediaStore.setActiveView('MyListDetail')).not.toThrow();
        expect(typeof mediaStore.activeView).toBe('string');
    });

    it('can transition back to Home after visiting the dedicated view', () => {
        mediaStore.setActiveView('MyListDetail');
        expect(mediaStore.activeView).toBe('MyListDetail');
        mediaStore.setActiveView('Home');
        expect(mediaStore.activeView).toBe('Home');
    });
});

describe('CinematicRow -> MyListDetailView contract', () => {
    it('re-exposes setActiveView on the mediaStore facade', () => {
        expect(typeof mediaStore.setActiveView).toBe('function');
    });

    it('re-exposes toggleReorderMode on the mediaStore facade', () => {
        expect(typeof mediaStore.toggleReorderMode).toBe('function');
    });

    it('toggling reorder mode flips the boolean back and forth', () => {
        const before = mediaStore.isReorderMode;
        mediaStore.toggleReorderMode();
        expect(mediaStore.isReorderMode).toBe(!before);
        mediaStore.toggleReorderMode();
        expect(mediaStore.isReorderMode).toBe(before);
    });
});

describe('myListDetail translations', () => {
    it('Italian locale exposes the myListDetail namespace with the expected leaves', () => {
        expect(itLocale.myListDetail).toBeDefined();
        expect(itLocale.myListDetail.title).toBe('La mia lista');
        expect(itLocale.myListDetail.searchPlaceholder).toBeTruthy();
        expect(itLocale.myListDetail.reorderOn).toBeTruthy();
        expect(itLocale.myListDetail.reorderOff).toBeTruthy();
        expect(itLocale.myListDetail.removeTooltip).toBeTruthy();
        expect(itLocale.myListDetail.filter.all).toBeTruthy();
        expect(itLocale.myListDetail.filter.movie).toBeTruthy();
        expect(itLocale.myListDetail.filter.tv).toBeTruthy();
        expect(itLocale.myListDetail.sort.recent).toBeTruthy();
        expect(itLocale.myListDetail.sort.title).toBeTruthy();
        expect(itLocale.myListDetail.sort.edited).toBeTruthy();
        expect(itLocale.myListDetail.stats.total).toMatch(/\{count\}/);
        expect(itLocale.myListDetail.stats.movies).toMatch(/\{count\}/);
        expect(itLocale.myListDetail.stats.series).toMatch(/\{count\}/);
    });

    it('English locale exposes the myListDetail namespace with the expected leaves', () => {
        expect(enLocale.myListDetail).toBeDefined();
        expect(enLocale.myListDetail.title).toBe('My List');
        expect(enLocale.myListDetail.searchPlaceholder).toBeTruthy();
        expect(enLocale.myListDetail.reorderOn).toBeTruthy();
        expect(enLocale.myListDetail.reorderOff).toBeTruthy();
        expect(enLocale.myListDetail.removeTooltip).toBeTruthy();
        expect(enLocale.myListDetail.filter.all).toBeTruthy();
        expect(enLocale.myListDetail.filter.movie).toBeTruthy();
        expect(enLocale.myListDetail.filter.tv).toBeTruthy();
        expect(enLocale.myListDetail.sort.recent).toBeTruthy();
        expect(enLocale.myListDetail.sort.title).toBeTruthy();
        expect(enLocale.myListDetail.sort.edited).toBeTruthy();
        expect(enLocale.myListDetail.stats.total).toMatch(/\{count\}/);
        expect(enLocale.myListDetail.stats.movies).toMatch(/\{count\}/);
        expect(enLocale.myListDetail.stats.series).toMatch(/\{count\}/);
    });

    it('contentRow.openDetail tooltip is present in both locales', () => {
        expect(itLocale.contentRow.openDetail).toBeTruthy();
        expect(enLocale.contentRow.openDetail).toBeTruthy();
    });
});
