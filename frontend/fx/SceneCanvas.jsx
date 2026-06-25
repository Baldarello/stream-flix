/**
 * @fileoverview SceneCanvas - transient WebGL overlay used for hero/detail
 * morphs and the transition portal flash.
 *
 * Mounts only when the transition portal needs a visual punch (Hero ->
 * Detail, Detail -> Player, etc.). The portal owns the lifecycle: it
 * renders <SceneCanvas/>, calls `playMorph({ fromKey, toKey })`, awaits
 * the timeline, then unmounts the canvas.
 *
 * The component is feature-detected and CSS-only when WebGL is missing or
 * `prefers-reduced-motion: reduce` is set.
 */

import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import * as THREE from 'three';
import {holoFragment, holoVertex} from './shaders/holo.glsl.js';
import {lightleakFragment, lightleakVertex} from './shaders/lightleak.glsl.js';
import {getWebGLSupport} from '../utils/webglDetect.js';
import {reducedMotion} from '../utils/reducedMotion.js';
import {durations} from '../motion/grammar.js';

const DEFAULT_INTENSITY = 0.0;

const SceneCanvas = forwardRef((props, ref) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        renderer: null,
        scene: null,
        camera: null,
        holoMaterial: null,
        leakMaterial: null,
        rafId: 0,
        intensity: DEFAULT_INTENSITY,
        progress: 0,
        disposed: false
    });

    useImperativeHandle(ref, () => ({
        setPalette: (partial) => {
            const { holoMaterial, leakMaterial } = stateRef.current;
            if (holoMaterial) {
                if (partial && partial.accent) holoMaterial.uniforms.uAccent.value.set(partial.accent);
                if (partial && partial.warn) holoMaterial.uniforms.uWarn.value.set(partial.warn);
            }
            if (leakMaterial) {
                if (partial && partial.accent) leakMaterial.uniforms.uColorA.value.set(partial.accent);
                if (partial && partial.warn) leakMaterial.uniforms.uColorB.value.set(partial.warn);
            }
        },
        playMorph: ({ intensity = 0.85, durationMs = 700 } = {}) => {
            return new Promise((resolve) => {
                if (reducedMotion() || !getWebGLSupport().supported) {
                    resolve();
                    return;
                }
                const state = stateRef.current;
                if (!state.holoMaterial || !state.leakMaterial) {
                    resolve();
                    return;
                }
                const start = performance.now();
                const dur = Math.max(120, durationMs);
                const animate = (now) => {
                    if (state.disposed) {
                        resolve();
                        return;
                    }
                    const t = Math.min(1, (now - start) / dur);
                    state.progress = t;
                    state.holoMaterial.uniforms.uProgress.value = t;
                    state.holoMaterial.uniforms.uIntensity.value = intensity * (1 - Math.abs(0.5 - t) * 2);
                    state.leakMaterial.uniforms.uProgress.value = t;
                    state.leakMaterial.uniforms.uOpacity.value = 0.4 * intensity * (1 - Math.abs(0.5 - t) * 2);
                    state.holoMaterial.uniforms.uTime.value = (now || performance.now()) * 0.001;
                    state.leakMaterial.uniforms.uTime.value = (now || performance.now()) * 0.001;
                    if (state.renderer && state.scene && state.camera) {
                        state.renderer.render(state.scene, state.camera);
                    }
                    if (t < 1) {
                        state.rafId = requestAnimationFrame(animate);
                    } else {
                        state.intensity = 0;
                        state.holoMaterial.uniforms.uIntensity.value = 0;
                        state.leakMaterial.uniforms.uOpacity.value = 0;
                        resolve();
                    }
                };
                state.rafId = requestAnimationFrame(animate);
            });
        },
        dispose: () => {
            disposeScene(stateRef.current);
        }
    }), []);

    useEffect(() => {
        if (reducedMotion()) return undefined;
        const support = getWebGLSupport();
        if (!support.supported) return undefined;
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

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

        const holoMaterial = new THREE.ShaderMaterial({
            vertexShader: holoVertex,
            fragmentShader: holoFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            uniforms: {
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uAccent: { value: new THREE.Color('#4cd2ff') },
                uWarn: { value: new THREE.Color('#ff5e9b') },
                uIntensity: { value: 0 }
            }
        });
        const leakMaterial = new THREE.ShaderMaterial({
            vertexShader: lightleakVertex,
            fragmentShader: lightleakFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            uniforms: {
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uColorA: { value: new THREE.Color('#4cd2ff') },
                uColorB: { value: new THREE.Color('#ff5e9b') },
                uOpacity: { value: 0 }
            }
        });

        const quad = new THREE.PlaneGeometry(2, 2);
        const holoMesh = new THREE.Mesh(quad, holoMaterial);
        const leakMesh = new THREE.Mesh(quad, leakMaterial);
        scene.add(leakMesh);
        scene.add(holoMesh);

        state.renderer = renderer;
        state.scene = scene;
        state.camera = camera;
        state.holoMaterial = holoMaterial;
        state.leakMaterial = leakMaterial;

        const resize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            renderer.setSize(w, h, false);
        };
        resize();
        window.addEventListener('resize', resize);

        return () => {
            state.disposed = true;
            cancelAnimationFrame(state.rafId);
            window.removeEventListener('resize', resize);
            disposeScene(state);
        };
    }, []);

    return (
        <div className="fx-canvas-host" aria-hidden>
            <canvas ref={canvasRef} id="fx-scene-canvas" />
        </div>
    );
});

SceneCanvas.displayName = 'SceneCanvas';

const disposeScene = (state) => {
    if (!state) return;
    state.disposed = true;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.holoMaterial) state.holoMaterial.dispose();
    if (state.leakMaterial) state.leakMaterial.dispose();
    if (state.scene) state.scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); });
    if (state.renderer) {
        try { state.renderer.dispose(); } catch (_e) { /* ignore */ }
    }
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    state.holoMaterial = null;
    state.leakMaterial = null;
};

export { SceneCanvas };
export const SCENE_DEFAULT_DURATION = durations.cinematic * 1000;
