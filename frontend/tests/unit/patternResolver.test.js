/**
 * Tests for the link-pattern resolver. Validates that [@EP], padding,
 * start/end ranges and startNum/endNum all behave as documented in
 * AddLinkTabs.
 */
import { describe, expect, it } from 'vitest';
import { expandPattern } from '../../utils/patternResolver.js';

describe('expandPattern', () => {
    it('substitutes [@EP] with a zero-padded number', () => {
        const out = expandPattern({
            pattern: 'https://cdn.example.com/ep[@EP].mp4',
            padding: 2,
            start: 1,
            end: 3,
        });
        expect(out).toEqual([
            'https://cdn.example.com/ep01.mp4',
            'https://cdn.example.com/ep02.mp4',
            'https://cdn.example.com/ep03.mp4',
        ]);
    });

    it('honors a custom startNum range', () => {
        const out = expandPattern({
            pattern: 'https://cdn.example.com/ep[@EP].mp4',
            padding: 3,
            start: 1,
            end: 2,
            startNum: 100,
            endNum: 101,
        });
        expect(out).toEqual(['https://cdn.example.com/ep100.mp4', 'https://cdn.example.com/ep101.mp4']);
    });

    it('returns an empty array for invalid ranges', () => {
        expect(expandPattern({ pattern: 'https://x/[@EP]', padding: 2, start: 5, end: 3 })).toEqual([]);
    });

    it('returns an empty array when the pattern lacks the placeholder', () => {
        expect(expandPattern({ pattern: 'https://x/static.mp4', padding: 2, start: 1, end: 2 })).toEqual([]);
    });
});
