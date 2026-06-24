/**
 * @fileoverview Search View - Search Interface
 * 
 * Displays the search interface when mediaStore.isSearchActive is true.
 * Shows search prompt, loading state, or search results.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useStores } from '../../context/StoreContext.jsx';
import { useTranslations } from '../../hooks/useTranslations.js';
import { CinematicGrid } from '../../components/layout/CinematicGrid.jsx';
import { FloatingDock } from '../../components/layout/FloatingDock.jsx';

/**
 * SearchShell - Shared layout wrapper for search branches
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to render inside the shell
 * @param {string} [props.minHeight] - Optional minHeight override
 * @param {boolean} [props.centered] - Whether to center content
 * @returns {React.ReactElement}
 */
const SearchShell = ({ children, minHeight, centered = false }) => (
    <>
        <FloatingDock />
        <Box
            sx={{
                minHeight: minHeight || 'calc(100vh - 64px - 200px)',
                pt: 'calc(64px + env(safe-area-inset-top))',
                ...(centered && {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }),
            }}
        >
            {children}
        </Box>
    </>
);

/**
 * SearchView Component
 *
 * Displays search interface with three states:
 * 1. Loading state when searching with query
 * 2. Prompt state when no search query
 * 3. Results state showing matching items
 *
 * @returns {React.ReactElement} Search view component
 */
export const SearchView = observer(() => {
    const { mediaStore } = useStores();
    const { t } = useTranslations();
    const { isSearching, searchQuery, searchResults } = mediaStore;

    // Loading state
    if (isSearching && searchQuery) {
        return (
            <SearchShell centered>
                <Box id="screen-search-loading" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress />
                </Box>
            </SearchShell>
        );
    }

    // Prompt state - no search query
    if (!searchQuery) {
        return (
            <SearchShell centered>
                <Box
                    id="screen-search-prompt"
                    sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        {t('misc.searchPrompt.title')}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        {t('misc.searchPrompt.subtitle')}
                    </Typography>
                </Box>
            </SearchShell>
        );
    }

    // Results state
    return (
        <SearchShell>
            <Box id="screen-search-results" sx={{ pt: 0 }}>
                <div role="status" aria-live="polite" aria-atomic="true">
                    {t('search.resultsCount', { count: searchResults.length })}
                </div>
                <CinematicGrid
                    id="search-results-grid"
                    title={t('gridView.searchResultsFor', { query: searchQuery })}
                    items={searchResults}
                    emptyKey="gridView.empty.search"
                />
            </Box>
        </SearchShell>
    );
});

SearchView.displayName = 'SearchView';
