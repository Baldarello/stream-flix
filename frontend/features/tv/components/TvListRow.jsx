import React, {useRef} from 'react';
import {observer} from 'mobx-react-lite';
import TvCard from './TvCard.jsx';
import {useTranslations} from '../../../hooks/useTranslations.js';

/**
 * TvListRow - Horizontal scrollable row of TV cards
 * @param {string} title - Row title
 * @param {Array} items - Array of media items
 * @param {number} startRow - Starting row number for focus navigation
 * @param {Function} onItemActivate - Callback when an item is activated
 */
const TvListRow = observer(({
    title,
    items = [],
    startRow = 1,
    onItemActivate
}) => {
    const { t } = useTranslations();
    const scrollRef = useRef(null);
    const rowId = `tv-${title.toLowerCase().replace(/\s+/g, '-')}-row`;

    // Limit to 12 items as per requirements
    const displayItems = items.slice(0, 12);

    // Handle keyboard scrolling
    const handleKeyDown = (e) => {
        if (!scrollRef.current) return;

        const scrollAmount = 260; // Card width + gap
        const { scrollLeft } = scrollRef.current;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                scrollRef.current.scrollTo({
                    left: Math.max(0, scrollLeft - scrollAmount),
                    behavior: 'smooth'
                });
                break;
            case 'ArrowRight':
                e.preventDefault();
                scrollRef.current.scrollTo({
                    left: scrollLeft + scrollAmount,
                    behavior: 'smooth'
                });
                break;
            default:
                break;
        }
    };

    // Don't render empty rows
    if (displayItems.length === 0) {
        return null;
    }

    return (
        <div
            id={rowId}
            className="tv-list-row"
            role="region"
            aria-label={title}
        >
            <h3 className="row-title">{title}</h3>

            <div
                ref={scrollRef}
                className="row-items"
                onKeyDown={handleKeyDown}
                tabIndex={-1}
            >
                {displayItems.map((item, index) => (
                    <TvCard
                        key={item.id || index}
                        id={item.id || `item-${index}`}
                        row={startRow}
                        col={index}
                        title={item.title || item.name || 'Untitled'}
                        imageUrl={item.poster_path || item.backdrop_path}
                        progress={item.progress || 0}
                        startTime={item.startTime || 0}
                        duration={item.duration || 0}
                        onActivate={() => onItemActivate && onItemActivate(item)}
                    />
                ))}
            </div>
        </div>
    );
});

export default TvListRow;
