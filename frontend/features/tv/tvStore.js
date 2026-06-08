import { makeAutoObservable, runInAction } from 'mobx';

/**
 * TvStore - MobX store for TV mode navigation and focus management
 * Handles screen routing, focus registry, and keyboard navigation for Smart TV remote control
 */
class TvStore {
    // Screen state: 'home' | 'myList' | 'pairing' | 'player'
    screen = 'home';

    // Map of focusable elements: id -> { el, row, col, screen }
    focusableElements = new Map();

    // Currently focused element id
    currentFocusId = null;

    // Flag indicating TV mode is active
    isTvMode = true;

    constructor() {
        makeAutoObservable(this, {
            focusableElements: false, // Map is not observable, we manage it manually
        });
    }

    /**
     * Navigate to a different screen
     * @param {string} newScreen - Target screen ('home' | 'myList' | 'pairing' | 'player')
     */
    navigate(newScreen) {
        this.screen = newScreen;
        // Reset focus when changing screens
        this.currentFocusId = null;
    }

    /**
     * Register an element as focusable
     * @param {string} id - Unique identifier for the element
     * @param {HTMLElement} el - DOM element reference
     * @param {number} row - Row position for focus navigation
     * @param {number} col - Column position for focus navigation
     */
    registerFocus(id, el, row, col) {
        if (!id || !el) return;
        
        const screen = this.screen;
        this.focusableElements.set(id, { el, row, col, screen });
        
        // If no focus is set yet and this is the first element or the first in the current screen, focus it
        if (!this.currentFocusId) {
            const firstInScreen = this._getFirstFocusableInScreen(screen);
            if (firstInScreen && firstInScreen.id === id) {
                this.currentFocusId = id;
                this._applyFocus(el);
            }
        }
    }

    /**
     * Unregister an element from focus tracking
     * @param {string} id - Unique identifier for the element
     */
    unregisterFocus(id) {
        if (this.currentFocusId === id) {
            this.currentFocusId = null;
        }
        this.focusableElements.delete(id);
    }

    /**
     * Move focus in the specified direction
     * @param {'up'|'down'|'left'|'right'} direction - Direction to move focus
     */
    focusNext(direction) {
        const current = this._getCurrentFocusData();
        if (!current) {
            // No current focus, find first in current screen
            const first = this._getFirstFocusableInScreen(this.screen);
            if (first) {
                this.currentFocusId = first.id;
                this._applyFocus(first.el);
            }
            return;
        }

        const { row, col } = current;
        let nextId = null;

        switch (direction) {
            case 'right':
                nextId = this._findNextInRow(row, col, 1);
                break;
            case 'left':
                nextId = this._findNextInRow(row, col, -1);
                break;
            case 'down':
                nextId = this._findNextInCol(col, row, 1);
                break;
            case 'up':
                nextId = this._findNextInCol(col, row, -1);
                break;
            default:
                break;
        }

        // If no element found in direction, try wrapping or finding nearest
        if (!nextId) {
            nextId = this._findNearest(row, col, direction);
        }

        if (nextId && nextId !== this.currentFocusId) {
            this.currentFocusId = nextId;
            const nextData = this.focusableElements.get(nextId);
            if (nextData) {
                this._applyFocus(nextData.el);
            }
        }
    }

    /**
     * Focus the current element
     */
    focusCurrent() {
        if (this.currentFocusId) {
            const data = this.focusableElements.get(this.currentFocusId);
            if (data) {
                this._applyFocus(data.el);
            }
        }
    }

    /**
     * Handle Enter key - activate current focus
     */
    handleEnter() {
        const current = this._getCurrentFocusData();
        if (current && current.el) {
            // Simulate click on the focused element
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            current.el.dispatchEvent(clickEvent);
        }
    }

    /**
     * Handle Back key - go back to previous screen or home
     */
    handleBack() {
        if (this.screen === 'home') {
            // Already at home, could exit TV mode if we had that capability
            return;
        }
        this.navigate('home');
    }

    /**
     * Handle Backspace key - close/exit TV mode (returns to browser/TV home)
     */
    handleBackspace() {
        // Navigate to home first
        this.navigate('home');
    }

    /**
     * Get current screen
     */
    getCurrentScreen() {
        return this.screen;
    }

    /**
     * Computed: Get all focusable items for current screen
     */
    get currentFocusableList() {
        const items = [];
        this.focusableElements.forEach((data, id) => {
            if (data.screen === this.screen) {
                items.push({ id, ...data });
            }
        });
        return items.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });
    }

    // Private helper methods

    _getCurrentFocusData() {
        if (!this.currentFocusId) return null;
        return this.focusableElements.get(this.currentFocusId);
    }

    _getFirstFocusableInScreen(screen) {
        let first = null;
        let minRow = Infinity;
        let minCol = Infinity;

        this.focusableElements.forEach((data, id) => {
            if (data.screen === screen) {
                if (data.row < minRow || (data.row === minRow && data.col < minCol)) {
                    minRow = data.row;
                    minCol = data.col;
                    first = { id, ...data };
                }
            }
        });

        return first;
    }

    _findNextInRow(row, col, direction) {
        const itemsInRow = [];
        this.focusableElements.forEach((data, id) => {
            if (data.screen === this.screen && data.row === row) {
                itemsInRow.push({ id, ...data });
            }
        });

        itemsInRow.sort((a, b) => (a.col - b.col) * direction);

        for (const item of itemsInRow) {
            if ((direction > 0 && item.col > col) || (direction < 0 && item.col < col)) {
                return item.id;
            }
        }

        // Wrap around to first/last in row
        if (itemsInRow.length > 0) {
            return direction > 0 ? itemsInRow[0].id : itemsInRow[itemsInRow.length - 1].id;
        }

        return null;
    }

    _findNextInCol(col, row, direction) {
        const itemsInCol = [];
        this.focusableElements.forEach((data, id) => {
            if (data.screen === this.screen && data.col === col) {
                itemsInCol.push({ id, ...data });
            }
        });

        itemsInCol.sort((a, b) => (a.row - b.row) * direction);

        for (const item of itemsInCol) {
            if ((direction > 0 && item.row > row) || (direction < 0 && item.row < row)) {
                return item.id;
            }
        }

        // Wrap around to first/last in col
        if (itemsInCol.length > 0) {
            return direction > 0 ? itemsInCol[0].id : itemsInCol[itemsInCol.length - 1].id;
        }

        return null;
    }

    _findNearest(row, col, direction) {
        let nearest = null;
        let minDistance = Infinity;

        this.focusableElements.forEach((data, id) => {
            if (data.screen === this.screen && id !== this.currentFocusId) {
                const dRow = data.row - row;
                const dCol = data.col - col;
                
                // Check if the element is in the right direction
                let isInDirection = false;
                switch (direction) {
                    case 'right':
                        isInDirection = dCol > 0 && Math.abs(dRow) <= Math.abs(dCol);
                        break;
                    case 'left':
                        isInDirection = dCol < 0 && Math.abs(dRow) <= Math.abs(dCol);
                        break;
                    case 'down':
                        isInDirection = dRow > 0 && Math.abs(dCol) <= Math.abs(dRow);
                        break;
                    case 'up':
                        isInDirection = dRow < 0 && Math.abs(dCol) <= Math.abs(dRow);
                        break;
                }

                if (isInDirection) {
                    const distance = Math.sqrt(dRow * dRow + dCol * dCol);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = id;
                    }
                }
            }
        });

        return nearest;
    }

    _applyFocus(el) {
        if (!el) return;
        
        // Use requestAnimationFrame to ensure smooth focus transition
        requestAnimationFrame(() => {
            if (el && typeof el.focus === 'function') {
                el.focus();
            }
        });
    }

    /**
     * Clear all focus registrations
     */
    clearFocusRegistry() {
        this.focusableElements.clear();
        this.currentFocusId = null;
    }
}

// Singleton instance
export const tvStore = new TvStore();
export default tvStore;
