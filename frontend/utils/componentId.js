/**
 * @fileoverview componentId - Stable per-instance component IDs.
 *
 * Returns a stable id like `${prefix}-${useId()}` memoized per component instance.
 */

import { useId } from 'react';

/**
 * Returns a stable id for a component instance.
 *
 * @param {string} prefix - The id prefix (e.g. 'skeleton', 'button')
 * @returns {string} A stable id like 'skeleton-fallback1'
 */
export const componentId = (prefix) => {
    const id = useId();
    return `${prefix}-${id}`;
};

export default componentId;
