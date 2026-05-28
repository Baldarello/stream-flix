/**
 * @fileoverview Library Feature - Library View Component
 * 
 * This component displays the library management interface
 * for managing media links and library synchronization.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import LibraryManagementView from '../../components/library/LibraryManagementView.jsx';

/**
 * Library View Component
 * 
 * Renders the library management interface.
 * This is a simple wrapper that maintains consistency with the feature module pattern.
 * 
 * @returns {React.ReactElement} Library view component
 */
export const LibraryView = observer(() => {
    return <LibraryManagementView id="library-view" />;
});

LibraryView.displayName = 'LibraryView';
