/**
 * @fileoverview Light leak shader - slow drifting radial bloom overlay.
 * Used as a transient layer during the SceneCanvas morph (Hero -> Detail)
 * and as a low-frequency layer on top of the starfield.
 */

export const lightleakVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const lightleakFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uProgress; // 0..1 timeline progress
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uOpacity;

  void main() {
    vec2 uv = vUv;
    vec2 d1 = uv - vec2(0.25 + 0.18 * sin(uTime * 0.4), 0.30 + 0.10 * cos(uTime * 0.3));
    vec2 d2 = uv - vec2(0.78 + 0.10 * cos(uTime * 0.27), 0.72 + 0.13 * sin(uTime * 0.5));

    float r1 = length(d1) * 1.2;
    float r2 = length(d2) * 1.4;

    float a1 = exp(-r1 * r1 * 1.4);
    float a2 = exp(-r2 * r2 * 1.6);

    vec3 col = uColorA * a1 + uColorB * a2;
    float alpha = (a1 + a2) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;
