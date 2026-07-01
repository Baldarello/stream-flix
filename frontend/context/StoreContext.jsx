/**
 * @fileoverview Store Context Provider for MobX Stores
 *
 * This module provides a React context for accessing MobX stores
 * (mediaStore and remoteStore) throughout the application.
 * The useStores hook enables reactive components to access stores
 * without prop drilling.
 */

import React, { createContext, useContext } from 'react';
import { mediaStore } from '../store/mediaStore.js';
import { remoteStore } from '../store/remoteStore.js';

/**
 * @typedef {Object} StoreContextValue
 * @property {Object} mediaStore - Media store instance with app state
 * @property {Object} remoteStore - Remote store instance for SmartTV/remote state
 */

/** @type {React.Context<StoreContextValue>} */
export const StoreContext = createContext({
    mediaStore,
    remoteStore,
});

/**
 * Hook to access MobX stores from context.
 *
 * This hook should be used in observer components to access stores
 * reactively. MobX will automatically track dependencies and trigger
 * re-renders when accessed store properties change.
 *
 * @returns {StoreContextValue} Object containing mediaStore and remoteStore
 * @example
 * const { mediaStore, remoteStore } = useStores();
 *
 * // In an observer component:
 * const { nowPlayingItem } = mediaStore;
 */
export const useStores = () => useContext(StoreContext);

/**
 * Store Context Provider Component
 *
 * Wraps the application and provides MobX stores to all child components
 * via the StoreContext.
 *
 * This component is used internally by App.jsx to provide stores.
 * Components should use the useStores hook to access stores instead
 * of using this provider directly.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Context provider element
 */
export const StoreProvider = ({ children }) => {
    return <StoreContext.Provider value={{ mediaStore, remoteStore }}>{children}</StoreContext.Provider>;
};

StoreContext.displayName = 'StoreContext';
useStores.displayName = 'useStores';
StoreProvider.displayName = 'StoreProvider';
