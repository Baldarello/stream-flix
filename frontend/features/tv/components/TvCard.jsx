import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import tvStore from '../tvStore.js';

/**
 * TvCard - A card component for media items in lists
 * @param {string} id - Unique identifier for the item
 * @param {number} row - Row position for navigation
 * @param {number} col - Column position for navigation
 * @param {string} title - Card title
 * @param {string} imageUrl - URL for the card thumbnail
 * @param {number} progress - Progress percentage (0-100) for "Continue Watching"
 * @param {number} startTime - Start time in seconds for progress calculation
 * @param {number} duration - Total duration in seconds
 * @param {Function} onActivate - Callback when card is activated (clicked/Enter)
 */
const TvCard = observer(({
    id,
    row = 0,
    col = 0,
    title,
    imageUrl,
    progress = 0,
    startTime = 0,
    duration = 0,
    onActivate
}) => {
    const cardRef = useRef(null);
    const cardId = `tv-card-${id}`;

    // Calculate progress if startTime and duration are provided
    const progressPercent = startTime > 0 && duration > 0
        ? Math.round((startTime / duration) * 100)
        : progress;

    useEffect(() => {
        if (cardRef.current) {
            tvStore.registerFocus(cardId, cardRef.current, row, col);
        }

        return () => {
            tvStore.unregisterFocus(cardId);
        };
    }, [cardId, row, col]);

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
            id={cardId}
            ref={cardRef}
            className="tv-card tv-focusable"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={title}
            data-item-id={id}
        >
            <img
                className="card-image"
                src={imageUrl || '/placeholder.png'}
                alt={title}
                loading="lazy"
            />

            <h4 className="card-title">{title}</h4>

            {progressPercent > 0 && (
                <div className="card-progress">
                    <div
                        className="card-progress-bar"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}
        </div>
    );
});

export default TvCard;
