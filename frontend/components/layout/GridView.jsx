/**
 * @fileoverview GridView - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy grid with
 * `CinematicGrid`. This file remains as a thin re-export so any feature
 * folder that still imports `GridView` continues to work.
 *
 * New code should import `CinematicGrid` directly.
 */

export { CinematicGrid as default, CinematicGrid } from './CinematicGrid.jsx';
export { CinematicGrid as GridView } from './CinematicGrid.jsx';
