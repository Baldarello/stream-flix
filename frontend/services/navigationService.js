/**
 * @fileoverview Navigation Service - Provides URL navigation for non-React code
 *
 * This service allows MobX stores to trigger URL changes that react-router
 * will respond to. It works by storing navigate functions that are set
 * by React components that have access to react-router's useNavigate hook.
 *
 * Usage:
 * - Call `setNavigate(fn)` in a component that has `useNavigate` from react-router
 * - Stores call `navigationService.navigate(path)` to change URL
 * - This causes react-router to re-render with the new URL
 */

let navigateFn = null;

/**
 * Set the navigate function from react-router's useNavigate hook.
 * Should be called once at app initialization from a component that has access to the router.
 *
 * @param {function} fn - The navigate function from useNavigate
 */
export const setNavigate = (fn) => {
    navigateFn = fn;
};

/**
 * Navigate to a path using react-router.
 * If navigate hasn't been set yet, falls back to window.location.href.
 *
 * @param {string} path - The path to navigate to
 * @param {object} options - Navigation options
 * @param {boolean} options.replace - If true, replaces current history entry
 */
export const navigateTo = (path, { replace = false } = {}) => {
    if (navigateFn) {
        navigateFn(path, { replace });
    } else {
        // Fallback if navigation service not initialized
        console.warn('Navigation service not initialized, using window.location');
        if (replace) {
            window.history.replaceState({}, document.title, path);
        } else {
            window.location.href = path;
        }
    }
};

// Route constants for consistency
export const Routes = {
    HOME: '/',
    SEARCH: '/search',
    PREFERENCES: '/preferences',
    PLAYER: '/player',
    MASTER: '/master',
    SLAVE: '/slave',
    PAIRING: '/pairing',
    QR: '/qr',
};
