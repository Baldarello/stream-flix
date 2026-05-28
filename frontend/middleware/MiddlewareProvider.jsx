/**
 * @fileoverview Middleware Provider Component
 * 
 * This component provides the middleware chain context to the application.
 * It wraps the middleware chain with the necessary store context.
 */

import React, { createContext, useContext } from 'react';
import { mediaStore } from '../store/mediaStore.js';
import { remoteStore } from '../store/remoteStore.js';
import { middlewareChain } from './index.js';

/**
 * @typedef {Object} StoreContext
 * @property {Object} mediaStore - Media store instance
 * @property {Object} remoteStore - Remote store instance
 */

const StoreContext = createContext({
    mediaStore,
    remoteStore,
});

/**
 * Hook to access the stores context
 * 
 * @returns {StoreContext} Stores context with mediaStore and remoteStore
 */
export const useStores = () => useContext(StoreContext);

/**
 * Middleware Provider Component
 * 
 * Provides the middleware chain with access to application stores.
 * This component renders the middleware chain and passes stores to it.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Middleware provider component
 */
export const MiddlewareProvider = ({ children }) => {
    const stores = {
        mediaStore,
        remoteStore,
    };

    // The middleware chain evaluates each middleware in order
    // and returns the first matching component (or children if none match)
    const content = middlewareChain({ stores, children });

    return (
        <StoreContext.Provider value={stores}>
            {content}
        </StoreContext.Provider>
    );
};

MiddlewareProvider.displayName = 'MiddlewareProvider';
