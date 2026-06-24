/**
 * @fileoverview Starfield shader - slow parallax particle field rendered on
 * a full-viewport plane. Uses a deterministic hash for stable stars across
 * frames and a depth-based opacity gradient.
 */

export const starfieldVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const starfieldFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec3  uAccent;
  uniform vec3  uBase;
  uniform float uAmplitude;
  uniform float uPixelRatio;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec3 starLayer(vec2 uv, float scale, float speed, float density, float brightness) {
    vec2 gv = uv * scale;
    vec2 id = floor(gv);
    vec2 f  = fract(gv) - 0.5;
    float h = hash21(id);
    vec2 offset = vec2(hash21(id + 7.13), hash21(id + 3.71)) - 0.5;
    float twinkle = 0.5 + 0.5 * sin(uTime * speed + h * 6.2831);
    float d = length(f - offset);
    float star = smoothstep(0.18, 0.0, d) * twinkle;
    float keep = step(0.985, h);
    return uAccent * star * keep * brightness * density;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 auv = uv * aspect;

    float drift = uTime * 0.005;
    vec2 base = auv + vec2(drift, drift * 0.3);

    vec3 col = uBase;
    col += starLayer(base * 1.0,  80.0, 1.1, 0.45, 1.0) * uAmplitude;
    col += starLayer(base * 1.3,  45.0, 0.7, 0.55, 0.85) * uAmplitude;
    col += starLayer(base * 1.8,  22.0, 0.4, 0.65, 0.6) * uAmplitude;

    // Subtle radial vignette so the center of the page reads as the focus.
    float d = length(uv - 0.5);
    float vignette = smoothstep(0.95, 0.25, d);
    col *= mix(0.55, 1.0, vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`;
