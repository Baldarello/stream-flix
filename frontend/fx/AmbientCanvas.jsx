/**
 * @fileoverview AmbientCanvas - permanent full-viewport WebGL background.
 *
 * Mounts a single Three.js orthographic plane that renders the starfield
 * shader behind all app content. Pauses its rAF loop on `visibilitychange`
 * and on `prefers-reduced-motion: reduce`. When WebGL is unavailable the
 * component renders nothing; the CSS `--cinematic-grad` defined in
 * `cinematic.css` shows through the body.
 *
 * Exposes an imperative ref API `setPalette({ accent, base })` and
 * `setAmplitude(0..1)` for callers (e.g. the floating dock, the hero).
 * The component itself is `observer`-aware so MobX changes in
 * `mediaStore.nowPlayingItem` and `mediaStore.activeView` can subtly shift
 * the palette without forcing a re-render of the React tree.
 */

import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {autorun} from 'mobx';
import * as THREE from 'three';
import {starfieldFragment, starfieldVertex} from './shaders/starfield.glsl.js';
import {lightleakFragment, lightleakVertex} from './shaders/lightleak.glsl.js';
import {getWebGLSupport} from '../utils/webglDetect.js';
import {reducedMotion} from '../utils/reducedMotion.js';
import {mediaStore} from '../store/mediaStore.js';

const DEFAULT_PALETTE = {
    accent: new THREE.Color('#4cd2ff'),
    warn: new THREE.Color('#ff5e9b'),
    base: new THREE.Color('#05060d')
};

const AmbientCanvas = observer(forwardRef((props, ref) => {
    const hostRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef({
        renderer: null,
        scene: null,
        camera: null,
        starMaterial: null,
        lightleakMaterial: null,
        rafId: 0,
        amplitude: 0.85,
        palette: { ...DEFAULT_PALETTE },
        disposed: false,
        lastFrameAt: 0
    });

    useImperativeHandle(ref, () => ({
        setPalette: (partial) => {
            const next = { ...stateRef.current.palette };
            if (partial && partial.accent) {
                next.accent = new THREE.Color(partial.accent);
            }
            if (partial && partial.base) {
                next.base = new THREE.Color(partial.base);
            }
            stateRef.current.palette = next;
            const { starMaterial, lightleakMaterial } = stateRef.current;
            if (starMaterial) {
                starMaterial.uniforms.uAccent.value.copy(next.accent);
                starMaterial.uniforms.uBase.value.copy(next.base);
            }
            if (lightleakMaterial) {
                lightleakMaterial.uniforms.uColorA.value.copy(next.accent);
                lightleakMaterial.uniforms.uColorB.value.copy(next.warn);
            }
        },
        setAmplitude: (v) => {
            const clamped = Math.max(0, Math.min(1, Number(v) || 0));
            stateRef.current.amplitude = clamped;
            if (stateRef.current.starMaterial) {
                stateRef.current.starMaterial.uniforms.uAmplitude.value = clamped;
            }
            if (stateRef.current.lightleakMaterial) {
                stateRef.current.lightleakMaterial.uniforms.uOpacity.value = 0.18 * clamped;
            }
        },
        dispose: () => {
            disposeScene(stateRef.current);
        }
    }), []);

    useEffect(() => {
        if (reducedMotion()) {
            // Honor reduced motion: do not mount the canvas.
            return undefined;
        }
        const support = getWebGLSupport();
        if (!support.supported) {
            // Render the CSS fallback host.
            if (hostRef.current) {
                const fallback = document.createElement('div');
                fallback.id = 'fx-ambient-fallback';
                hostRef.current.appendChild(fallback);
            }
            return undefined;
        }

        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const host = hostRef.current;

        const state = stateRef.current;
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: true,
            powerPreference: 'low-power'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * 0.75);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const starMaterial = new THREE.ShaderMaterial({
            vertexShader: starfieldVertex,
            fragmentShader: starfieldFragment,
            transparent: false,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(1, 1) },
                uAccent: { value: state.palette.accent.clone() },
                uBase: { value: state.palette.base.clone() },
                uAmplitude: { value: state.amplitude },
                uPixelRatio: { value: renderer.getPixelRatio() }
            }
        });

        const lightleakMaterial = new THREE.ShaderMaterial({
            vertexShader: lightleakVertex,
            fragmentShader: lightleakFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            uniforms: {
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uColorA: { value: state.palette.accent.clone() },
                uColorB: { value: state.palette.warn.clone() },
                uOpacity: { value: 0.18 }
            }
        });

        const quad = new THREE.PlaneGeometry(2, 2);
        const starMesh = new THREE.Mesh(quad, starMaterial);
        scene.add(starMesh);
        const leakMesh = new THREE.Mesh(quad, lightleakMaterial);
        scene.add(leakMesh);

        state.renderer = renderer;
        state.scene = scene;
        state.camera = camera;
        state.starMaterial = starMaterial;
        state.lightleakMaterial = lightleakMaterial;

        const resize = () => {
            const w = host.clientWidth || window.innerWidth;
            const h = host.clientHeight || window.innerHeight;
            renderer.setSize(w, h, false);
            starMaterial.uniforms.uResolution.value.set(w, h);
        };
        resize();
        window.addEventListener('resize', resize);

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                document.body.classList.add('fx-paused');
                cancelAnimationFrame(state.rafId);
            } else {
                document.body.classList.remove('fx-paused');
                state.lastFrameAt = performance.now();
                state.rafId = requestAnimationFrame(loop);
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        const loop = (now) => {
            if (state.disposed) return;
            const t = (now || performance.now()) * 0.001;
            starMaterial.uniforms.uTime.value = t;
            lightleakMaterial.uniforms.uTime.value = t;
            // Keep the leak in sync with the starfield amplitude.
            lightleakMaterial.uniforms.uOpacity.value = 0.18 * state.amplitude;
            renderer.render(scene, camera);
            state.rafId = requestAnimationFrame(loop);
        };
        state.rafId = requestAnimationFrame(loop);

        // MobX autorun: react to mediaStore changes for palette/amplitude.
        const stopAutorun = autorun(() => {
            const item = mediaStore.nowPlayingItem;
            const view = mediaStore.activeView;
            const amp = item ? 1.0 : 0.7;
            state.amplitude = amp;
            if (state.starMaterial) {
                state.starMaterial.uniforms.uAmplitude.value = amp;
            }
            if (state.lightleakMaterial) {
                state.lightleakMaterial.uniforms.uOpacity.value = 0.18 * amp;
            }
            // View-keyed palette hint - keep the accent cyan by default and
            // tilt the base a touch warmer/cooler based on the active view
            // so the ambient layer feels contextual.
            if (state.starMaterial) {
                const base = new THREE.Color('#05060d');
                if (view === 'Film') base.lerp(new THREE.Color('#0d0a18'), 0.25);
                else if (view === 'Serie TV') base.lerp(new THREE.Color('#080d1c'), 0.25);
                else if (view === 'Anime') base.lerp(new THREE.Color('#0e0a1a'), 0.25);
                state.starMaterial.uniforms.uBase.value.copy(base);
            }
        });

        return () => {
            state.disposed = true;
            cancelAnimationFrame(state.rafId);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
            stopAutorun();
            disposeScene(state);
        };
    }, []);

    return (
        <div ref={hostRef} id="fx-ambient-host" className="fx-canvas-host" aria-hidden>
            <canvas ref={canvasRef} id="fx-ambient-canvas" />
        </div>
    );
}));

AmbientCanvas.displayName = 'AmbientCanvas';

const disposeScene = (state) => {
    if (!state) return;
    state.disposed = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.starMaterial) state.starMaterial.dispose();
    if (state.lightleakMaterial) state.lightleakMaterial.dispose();
    if (state.scene) {
        state.scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
        });
    }
    if (state.renderer) {
        try { state.renderer.dispose(); } catch (_e) { /* ignore */ }
    }
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    state.starMaterial = null;
    state.lightleakMaterial = null;
};

export { AmbientCanvas };
