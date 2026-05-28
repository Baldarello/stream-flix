/**
 * @fileoverview Feature Middleware - Library View Handler
 * 
 * This middleware handles the library management view,
 * displaying the library management interface.
 */

import React from 'react';
import LibraryManagementView from '../../components/library/LibraryManagementView.jsx';
import { MainLayout } from '../../features/shared/MainLayout.jsx';

/**
 * Library Middleware
 * 
 * Checks if the current view is 'Libreria' and displays
 * the LibraryManagementView component.
 * Wraps content in MainLayout which includes Header, Footer, DetailView, and modals.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with currentActiveView
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Library view or null to continue chain
 */
export const LibraryMiddleware = ({ stores, children }) => {
    const { currentActiveView } = stores.mediaStore;

    if (currentActiveView !== 'Libreria') {
        return children;
    }

    return (
        <MainLayout>
            <LibraryManagementView id="library-management-view" />
        </MainLayout>
    );
};
