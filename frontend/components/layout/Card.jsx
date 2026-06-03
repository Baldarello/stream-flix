/**
 * @fileoverview Card - Deprecated re-export shim.
 *
 * The cinematic-futuristic rework replaces the legacy card with `HoloCard`.
 * This file remains as a thin re-export so feature folders that still
 * import `Card` continue to work during the migration.
 *
 * New code should import `HoloCard` directly.
 */

export { HoloCard as Card } from './HoloCard.jsx';
export { HoloCard } from './HoloCard.jsx';
