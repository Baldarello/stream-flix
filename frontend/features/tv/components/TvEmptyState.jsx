import React from 'react';
import { useTranslations } from '../../../hooks/useTranslations.js';

/**
 * Empty state icon SVG
 */
const EmptyIcon = () => (
    <svg className="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="rgba(255,255,255,0.3)"/>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" fill="rgba(255,255,255,0.3)"/>
    </svg>
);

/**
 * TvEmptyState - Displayed when there is no content
 * @param {string} message - Main message to display
 * @param {string} ctaLabel - Call-to-action button label
 * @param {Function} onCtaClick - Callback when CTA button is clicked
 */
const TvEmptyState = ({
    message,
    ctaLabel,
    onCtaClick
}) => {
    const { t } = useTranslations();

    const handleKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onCtaClick) {
            e.preventDefault();
            onCtaClick();
        }
    };

    return (
        <div
            id="tv-empty-state"
            className="tv-empty-state"
            role="status"
            aria-live="polite"
        >
            <EmptyIcon />

            <p className="empty-message">
                {message || t('tv.empty', 'Nessun contenuto disponibile')}
            </p>

            {ctaLabel && onCtaClick && (
                <button
                    id="tv-empty-cta"
                    className="empty-cta tv-focusable"
                    onClick={onCtaClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    );
};

export default TvEmptyState;
