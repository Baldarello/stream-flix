/**
 * @fileoverview Hero - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy ken-burns splash
 * with `CinematicHero`. This file remains as a thin re-export so feature
 * folders that still import `Hero` continue to work during the migration.
 *
 * New code should import `CinematicHero` directly.
 */

export { CinematicHero as Hero } from './CinematicHero.jsx';
export { CinematicHero } from './CinematicHero.jsx';
