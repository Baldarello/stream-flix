/**
 * @fileoverview ContentRow - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy horizontal row
 * with `CinematicRow`. This file remains as a thin re-export so any
 * feature folder that still imports `ContentRow` continues to work.
 *
 * New code should import `CinematicRow` directly.
 */

export { CinematicRow as ContentRow } from './CinematicRow.jsx';
export { CinematicRow } from './CinematicRow.jsx';
