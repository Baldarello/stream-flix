/**
 * @fileoverview Grid Feature - Grid View Component
 * 
 * This component displays content in a grid layout.
 * Used for Series, Movies, Anime, and My List views.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import GridView from '../../components/layout/GridView.jsx';

/**
 * Grid View Feature Component
 * 
 * A simple wrapper around the GridView component that accepts
 * title and items as props for flexible reuse.
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display above the grid
 * @param {Array} props.items - Array of media items to display
 * @returns {React.ReactElement} Grid view component
 */
export const GridViewFeature = observer(({ title, items }) => {
    return (
        <GridView
            id="grid-view-feature"
            title={title}
            items={items}
        />
    );
});

GridViewFeature.displayName = 'GridViewFeature';
