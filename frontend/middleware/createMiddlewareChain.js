/**
 * @fileoverview Middleware Chain System for StreamFlix App
 * 
 * This module provides a composable middleware chain pattern for handling
 * rendering decisions in the application. Each middleware evaluates conditions
 * and returns a component or null, allowing for clean separation of concerns.
 */

import React from 'react';

/**
 * @typedef {Object} MiddlewareContext
 * @property {Object} stores - Application stores (mediaStore, remoteStore)
 * @property {React.ReactNode} [children] - Child content from previous middleware
 */

/**
 * @typedef {function(MiddlewareContext): React.ReactElement|null} Middleware
 * A middleware function that receives context and returns a component or null.
 * If a middleware returns null, the chain continues to the next middleware.
 * If a middleware returns a component, the chain stops and renders that component.
 */

/**
 * Creates a middleware chain component from an array of middleware functions.
 * 
 * The chain executes each middleware in order until one returns a component.
 * Each middleware receives the stores and the children (output of previous middleware).
 * 
 * @param {Middleware[]} middlewares - Array of middleware functions to compose
 * @returns {React.Component} A combined middleware component
 * 
 * @example
 * const MiddlewareChain = createMiddlewareChain([
 *   LoadingMiddleware,
 *   ErrorMiddleware,
 *   PlaybackMiddleware,
 *   FeatureMiddleware,
 * ]);
 * 
 * // Usage in JSX:
 * <MiddlewareChain stores={stores} />
 */
export function createMiddlewareChain(middlewares) {
    return function MiddlewareChain({ stores, children }) {
        let content = children;

        for (const middleware of middlewares) {
            // Call the middleware function with stores and children
            // Each middleware is a pure function that returns JSX or null
            const result = middleware({ stores, children: content });
            if (result !== null) {
                return result;
            }
        }

        return content;
    };
}

/**
 * Composes multiple middleware functions into a single middleware.
 * This is useful for grouping related middlewares together.
 * 
 * @param {Middleware[]} middlewares - Array of middleware functions to group
 * @returns {Middleware} A single middleware containing all grouped middlewares
 */
export function composeMiddlewareGroup(middlewares) {
    return ({ stores, children }) => {
        let content = children;

        for (const middleware of middlewares) {
            const result = middleware({ stores, children: content });
            if (result !== null) {
                return result;
            }
        }

        return content;
    };
}

/**
 * Creates a simple middleware that only renders when a condition is met.
 * 
 * @param {function(MiddlewareContext): boolean} condition - Function to evaluate
 * @param {function(MiddlewareContext): React.ReactElement} render - Function that returns the component to render
 * @returns {Middleware} A middleware that renders when condition is true
 */
export function createConditionalMiddleware(condition, render) {
    return (context) => {
        if (condition(context)) {
            return render(context);
        }
        return null;
    };
}
