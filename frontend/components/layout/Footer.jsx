/**
 * @fileoverview Footer - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy footer with
 * `CinematicFooter`. This file remains as a thin re-export so any
 * feature folder that still imports `Footer` continues to work.
 *
 * New code should import `CinematicFooter` directly.
 */

export { CinematicFooter as Footer } from './CinematicFooter.jsx';
export { CinematicFooter } from './CinematicFooter.jsx';
