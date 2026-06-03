/**
 * Sanity tests for the i18n locale files: both Italian and English
 * must expose the same top-level namespaces so translators can't
 * silently drop a key in one language.
 */
import { describe, it, expect } from 'vitest';
import { it as itLocale } from '../../locales/it.js';
import { en as enLocale } from '../../locales/en.js';

function flattenKeys(obj, prefix = '') {
    return Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) return flattenKeys(v, key);
        return [key];
    });
}

describe('i18n locales', () => {
    it('Italian locale is a non-empty object', () => {
        expect(typeof itLocale).toBe('object');
        expect(Object.keys(itLocale).length).toBeGreaterThan(0);
    });

    it('English locale is a non-empty object', () => {
        expect(typeof enLocale).toBe('object');
        expect(Object.keys(enLocale).length).toBeGreaterThan(0);
    });

    it('Italian and English expose the same leaf keys', () => {
        const itKeys = new Set(flattenKeys(itLocale));
        const enKeys = new Set(flattenKeys(enLocale));
        const missingInEn = [...itKeys].filter((k) => !enKeys.has(k));
        const missingInIt = [...enKeys].filter((k) => !itKeys.has(k));
        expect(missingInEn).toEqual([]);
        expect(missingInIt).toEqual([]);
    });

    it('linkEpisodesModal namespace exists in both locales', () => {
        expect(itLocale.linkEpisodesModal).toBeDefined();
        expect(enLocale.linkEpisodesModal).toBeDefined();
    });
});
