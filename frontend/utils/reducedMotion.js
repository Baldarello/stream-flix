/**
 * @fileoverview Reduced motion convenience re-export.
 *
 * The project traditionally has helper modules under `frontend/utils/`. This
 * file re-exports the reduced-motion helpers from the motion grammar so
 * utility-aware consumers (or future migration paths) have a single import
 * location.
 */

export { reducedMotion, onReducedMotionChange, motionEnabled } from '../motion/grammar.js';
