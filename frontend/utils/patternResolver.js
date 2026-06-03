/**
 * Pattern resolver for episode links.
 *
 * The user-facing pattern (e.g. `https://cdn.example.com/series/S[@S]/E[@EP].mp4`)
 * is expanded into a concrete list of URLs by substituting the `[@EP]`
 * placeholder with a zero-padded number in the `[start..end]` range.
 *
 * Extracted from AddLinkTabs so the same logic can be reused both in
 * the client and in a future server-side validator, and so it can be
 * unit-tested in isolation.
 *
 * The function is intentionally pure: it does not perform I/O and
 * does not touch the MobX store.
 */

/**
 * @typedef {Object} ExpandPatternOptions
 * @property {string} pattern            URL template containing the `[@EP]` placeholder.
 * @property {number} padding            Number of digits used to pad the episode number.
 * @property {number} start              First episode number to emit (1-based, inclusive).
 * @property {number} end                Last episode number to emit (1-based, inclusive).
 * @property {number} [startNum]         Optional remap of the first emitted number.
 * @property {number} [endNum]           Optional remap of the last emitted number.
 * @property {string} [placeholder='[@EP]'] Placeholder string to look for in the pattern.
 */

const DEFAULT_PLACEHOLDER = '[@EP]';

/**
 * Expand a link pattern into a list of concrete URLs.
 *
 * @param {ExpandPatternOptions} options
 * @returns {string[]} List of URLs, or an empty array if the inputs are invalid.
 */
export function expandPattern(options) {
    const { pattern, padding, start, end, startNum, endNum, placeholder = DEFAULT_PLACEHOLDER } = options || {};

    if (typeof pattern !== 'string' || !pattern.includes(placeholder)) {
        return [];
    }
    if (!Number.isInteger(padding) || padding <= 0) {
        return [];
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
        return [];
    }

    const rangeLength = end - start;
    const offsetStart = Number.isInteger(startNum) ? startNum : start;
    const offsetEnd = Number.isInteger(endNum) ? endNum : end;
    const offsetLength = offsetEnd - offsetStart;

    if (offsetLength !== rangeLength) {
        return [];
    }

    const out = [];
    for (let i = 0; i <= rangeLength; i++) {
        const num = offsetStart + i;
        const padded = String(num).padStart(padding, '0');
        out.push(pattern.split(placeholder).join(padded));
    }
    return out;
}

/**
 * Build a 3-URL preview (start, middle, end) for the visual pattern
 * editor. Returns an empty array if the pattern cannot be resolved.
 *
 * @param {ExpandPatternOptions} options
 * @returns {string[]}
 */
export function previewPattern(options) {
    const urls = expandPattern(options);
    if (urls.length === 0) return [];
    if (urls.length <= 3) return urls;
    return [urls[0], urls[Math.floor(urls.length / 2)], urls[urls.length - 1]];
}
