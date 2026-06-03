/**
 * @fileoverview Header - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy top AppBar with
 * `FloatingDock` (a morphing floating glass surface). This file remains as
 * a thin re-export so any feature folder that still imports `Header`
 * continues to work without modification during the migration window.
 *
 * New code should import `FloatingDock` directly.
 */

export { FloatingDock as Header } from './FloatingDock.jsx';
export { FloatingDock } from './FloatingDock.jsx';
