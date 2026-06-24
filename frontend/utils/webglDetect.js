/**
 * @fileoverview WebGL feature detection.
 *
 * Detects whether the host browser can render a basic WebGL2 (preferred) or
 * WebGL1 context, and provides a single `getWebGLSupport` API that returns
 * a normalized result. The result is memoized so repeated calls during
 * mount/unmount cycles do not re-probe the GPU.
 *
 * Consumers (AmbientCanvas, SceneCanvas) call `getWebGLSupport()` to decide
 * whether to mount the WebGL layer or fall back to a CSS gradient + 2D
 * particle canvas.
 */

let cached = null;

const probeContext = (canvas, type) => {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    try {
        const ctx = canvas.getContext(type, { failIfMajorPerformanceCaveat: false });
        if (ctx) return ctx;
    } catch (_e) {
        // Ignore - getContext can throw on locked contexts.
    }
    return null;
};

/**
 * Returns a normalized object describing the host's WebGL capabilities.
 * Shape: { supported: boolean, version: 0 | 1 | 2, reason?: string }
 */
export const getWebGLSupport = () => {
    if (cached) return cached;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        cached = { supported: false, version: 0, reason: 'no-window' };
        return cached;
    }
    const canvas = document.createElement('canvas');
    const gl2 = probeContext(canvas, 'webgl2');
    if (gl2) {
        const lose = gl2.getExtension && gl2.getExtension('WEBGL_lose_context');
        if (lose && typeof lose.loseContext === 'function') {
            try { lose.loseContext(); } catch (_e) { /* ignore */ }
        }
        cached = { supported: true, version: 2 };
        return cached;
    }
    const gl1 = probeContext(canvas, 'webgl') || probeContext(canvas, 'experimental-webgl');
    if (gl1) {
        const lose = gl1.getExtension && gl1.getExtension('WEBGL_lose_context');
        if (lose && typeof lose.loseContext === 'function') {
            try { lose.loseContext(); } catch (_e) { /* ignore */ }
        }
        cached = { supported: true, version: 1 };
        return cached;
    }
    cached = { supported: false, version: 0, reason: 'no-webgl' };
    return cached;
};

/**
 * Convenience: returns true when WebGL2 is available.
 */
export const hasWebGL2 = () => getWebGLSupport().version === 2;
