/**
 * Vitest setup file. Runs before every test file.
 * - Provides a fetch stub (jsdom does not implement it by default).
 * - Polyfills TextEncoder/TextDecoder for libraries that expect them.
 */
import { TextEncoder, TextDecoder } from 'node:util';

if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
    globalThis.TextDecoder = TextDecoder;
}

// Minimal fetch stub so importing modules that reference fetch at top-level
// does not throw in jsdom.
if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = async () => {
        throw new Error('fetch is not implemented in the test environment; mock it explicitly.');
    };
}
