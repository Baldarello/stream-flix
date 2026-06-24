/**
 * @fileoverview Holographic sweep shader - a moving specular highlight used
 * on cards and panels. The effect is procedural so the SceneCanvas can
 * drive a single plane across the viewport during a Hero -> Detail morph.
 */

export const holoVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const holoFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uProgress; // 0..1
  uniform vec3  uAccent;
  uniform vec3  uWarn;
  uniform float uIntensity;

  void main() {
    vec2 uv = vUv;
    float diagonal = uv.x + uv.y;
    float band = smoothstep(0.0, 0.12, abs(fract(diagonal * 0.5 - uProgress) - 0.5));
    float sweep = 1.0 - band;
    float scan = 0.5 + 0.5 * sin(uv.y * 800.0 + uTime * 4.0);
    vec3 col = uAccent * sweep * uIntensity + uWarn * 0.15 * scan * uIntensity;
    float alpha = sweep * uIntensity * 0.55;
    gl_FragColor = vec4(col, alpha);
  }
`;
