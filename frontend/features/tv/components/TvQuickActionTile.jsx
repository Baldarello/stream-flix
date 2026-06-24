import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import tvStore from '../tvStore.js';

/**
 * TvQuickActionTile - A large clickable tile for quick actions
 * @param {string} id - Unique identifier for focus tracking
 * @param {number} row - Row position for navigation
 * @param {number} col - Column position for navigation
 * @param {React.ReactNode} icon - Icon element (SVG preferred)
 * @param {string} title - Tile title text
 * @param {Function} onActivate - Callback when tile is activated
 * @param {string|number} badge - Optional badge to display
 * @param {boolean} isLoggedIn - Whether user is logged in (for Google tile)
 * @param {string} userName - User name when logged in
 * @param {string} userAvatar - User avatar URL when logged in
 */
const TvQuickActionTile = observer(({
    id,
    row = 0,
    col = 0,
    icon,
    title,
    onActivate,
    badge,
    isLoggedIn = false,
    userName = '',
    userAvatar = ''
}) => {
    const tileRef = useRef(null);
    const tileId = `tv-tile-${id}`;

    useEffect(() => {
        if (tileRef.current) {
            tvStore.registerFocus(tileId, tileRef.current, row, col);
        }

        return () => {
            tvStore.unregisterFocus(tileId);
        };
    }, [tileId, row, col]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onActivate) {
                onActivate();
            }
        }
    };

    const handleClick = () => {
        if (onActivate) {
            onActivate();
        }
    };

    return (
        <div
            id={tileId}
            ref={tileRef}
            className="tv-quick-action-tile tv-focusable"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={title}
            data-tile-type={id}
        >
            {badge && <span className="tile-badge">{badge}</span>}

            <div className="tile-icon">
                {isLoggedIn && userAvatar ? (
                    <img
                        src={userAvatar}
                        alt={userName}
                        className="tv-user-avatar"
                    />
                ) : (
                    icon
                )}
            </div>

            <p className="tile-title">{title}</p>
        </div>
    );
});

export default TvQuickActionTile;
